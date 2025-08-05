# apps/bookings/services.py

from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db.models import Q, Count, Avg, Sum
from datetime import timedelta, datetime
from .models import Booking, BookingRequest, BookingUpdate
from apps.common.models import Service
import logging

User = get_user_model()
logger = logging.getLogger(__name__)


class BookingService:
    """
    Service for booking-related operations
    """

    @staticmethod
    def create_booking(client, guide, **kwargs):
        """
        Create a new booking
        """
        try:
            # Validate guide availability
            if not BookingService.is_guide_available(
                guide=guide,
                start_date=kwargs["start_date"],
                end_date=kwargs["end_date"],
            ):
                raise ValueError("Guide is not available for the selected time period")

            # Calculate pricing
            pricing = BookingService.calculate_pricing(
                guide=guide,
                start_date=kwargs["start_date"],
                end_date=kwargs["end_date"],
                duration_type=kwargs["duration_type"],
            )

            # Create booking
            booking = Booking.objects.create(
                client=client,
                guide=guide,
                hourly_rate=pricing.get("hourly_rate"),
                daily_rate=pricing.get("daily_rate"),
                total_amount=pricing["total_amount"],
                **kwargs,
            )

            # Create initial update record
            BookingUpdate.objects.create(
                booking=booking,
                updated_by=client,
                old_status="",
                new_status="Pending",
                notes="Booking created",
            )

            logger.info(f"Booking created: {booking.id}")
            return booking

        except Exception as e:
            logger.error(f"Error creating booking: {str(e)}")
            raise

    @staticmethod
    def update_booking(booking, updated_by, **kwargs):
        """
        Update existing booking
        """
        try:
            old_status = booking.status

            # Update booking fields
            for field, value in kwargs.items():
                setattr(booking, field, value)

            booking.save()

            # Create update record if status changed
            if "status" in kwargs and kwargs["status"] != old_status:
                BookingUpdate.objects.create(
                    booking=booking,
                    updated_by=updated_by,
                    old_status=old_status,
                    new_status=kwargs["status"],
                    notes=kwargs.get("notes", ""),
                )

            logger.info(f"Booking updated: {booking.id}")
            return booking

        except Exception as e:
            logger.error(f"Error updating booking: {str(e)}")
            raise

    @staticmethod
    def cancel_booking(booking, cancelled_by):
        """
        Cancel a booking
        """
        try:
            if not booking.can_cancel():
                raise ValueError("This booking cannot be cancelled")

            old_status = booking.status
            booking.status = "Cancelled"
            booking.cancelled_at = timezone.now()
            booking.save()

            # Create update record
            BookingUpdate.objects.create(
                booking=booking,
                updated_by=cancelled_by,
                old_status=old_status,
                new_status="Cancelled",
                notes="Booking cancelled",
            )

            logger.info(f"Booking cancelled: {booking.id}")
            return booking

        except Exception as e:
            logger.error(f"Error cancelling booking: {str(e)}")
            raise

    @staticmethod
    def complete_booking(booking, completed_by):
        """
        Mark booking as completed
        """
        try:
            if not booking.can_complete():
                raise ValueError("This booking cannot be completed")

            old_status = booking.status
            booking.status = "Completed"
            booking.completed_at = timezone.now()
            booking.save()

            # Create update record
            BookingUpdate.objects.create(
                booking=booking,
                updated_by=completed_by,
                old_status=old_status,
                new_status="Completed",
                notes="Booking completed",
            )

            # Update guide statistics
            if hasattr(booking.guide, "guide_profile"):
                profile = booking.guide.guide_profile
                profile.total_tours += 1
                profile.save()

            logger.info(f"Booking completed: {booking.id}")
            return booking

        except Exception as e:
            logger.error(f"Error completing booking: {str(e)}")
            raise

    @staticmethod
    def start_booking(booking, started_by):
        """
        Start a booking (mark as in progress)
        """
        try:
            if booking.status != "Confirmed":
                raise ValueError("Only confirmed bookings can be started")

            old_status = booking.status
            booking.status = "In Progress"
            booking.started_at = timezone.now()
            booking.save()

            # Create update record
            BookingUpdate.objects.create(
                booking=booking,
                updated_by=started_by,
                old_status=old_status,
                new_status="In Progress",
                notes="Booking started",
            )

            logger.info(f"Booking started: {booking.id}")
            return booking

        except Exception as e:
            logger.error(f"Error starting booking: {str(e)}")
            raise

    @staticmethod
    def calculate_pricing(guide, start_date, end_date, duration_type):
        """
        Calculate booking pricing based on guide rates
        """
        try:
            if not hasattr(guide, "guide_profile"):
                raise ValueError("Guide profile not found")

            profile = guide.guide_profile
            pricing = {}

            if duration_type == "hourly":
                if not profile.hourly_rate:
                    raise ValueError("Guide does not have hourly rate set")

                # Calculate hours
                duration = end_date - start_date
                hours = duration.total_seconds() / 3600

                pricing["hourly_rate"] = profile.hourly_rate
                pricing["total_amount"] = profile.hourly_rate * hours

            elif duration_type == "daily":
                if not profile.daily_rate:
                    raise ValueError("Guide does not have daily rate set")

                # Calculate days
                days = (end_date.date() - start_date.date()).days + 1

                pricing["daily_rate"] = profile.daily_rate
                pricing["total_amount"] = profile.daily_rate * days

            else:
                raise ValueError("Invalid duration type")

            return pricing

        except Exception as e:
            logger.error(f"Error calculating pricing: {str(e)}")
            raise

    @staticmethod
    def is_guide_available(guide, start_date, end_date):
        """
        Check if guide is available for the given time period
        """
        try:
            # Check for conflicting bookings
            conflicting_bookings = Booking.objects.filter(
                guide=guide,
                status__in=["Confirmed", "In Progress"],
                start_date__lt=end_date,
                end_date__gt=start_date,
            )

            return not conflicting_bookings.exists()

        except Exception as e:
            logger.error(f"Error checking guide availability: {str(e)}")
            return False

    @staticmethod
    def get_available_guides(date=None, service_id=None, location=None):
        """
        Get list of available guides based on criteria
        """
        try:
            guides = User.objects.filter(
                role="Guide", is_active=True, guide_profile__is_available=True
            )

            # Filter by service
            if service_id:
                guides = guides.filter(guide_profile__services__id=service_id)

            # Filter by location
            if location:
                guides = guides.filter(
                    Q(guide_profile__operating_cities__name__icontains=location)
                    | Q(country__icontains=location)
                    | Q(city__icontains=location)
                )

            # Filter by availability on specific date
            if date:
                try:
                    date_obj = datetime.strptime(date, "%Y-%m-%d").date()
                    start_datetime = timezone.make_aware(
                        datetime.combine(date_obj, datetime.min.time())
                    )
                    end_datetime = start_datetime + timedelta(days=1)

                    # Exclude guides with bookings on that date
                    unavailable_guides = Booking.objects.filter(
                        status__in=["Confirmed", "In Progress"],
                        start_date__lt=end_datetime,
                        end_date__gt=start_datetime,
                    ).values_list("guide_id", flat=True)

                    guides = guides.exclude(id__in=unavailable_guides)

                except ValueError:
                    logger.warning(f"Invalid date format: {date}")

            return guides.select_related("guide_profile").order_by(
                "-guide_profile__average_rating"
            )

        except Exception as e:
            logger.error(f"Error getting available guides: {str(e)}")
            return User.objects.none()

    @staticmethod
    def get_booking_statistics(user):
        """
        Get booking statistics for user
        """
        try:
            if user.role == "Guide":
                bookings = Booking.objects.filter(guide=user)
            else:
                bookings = Booking.objects.filter(client=user)

            # Basic counts
            total_bookings = bookings.count()
            pending_bookings = bookings.filter(status="Pending").count()
            confirmed_bookings = bookings.filter(status="Confirmed").count()
            completed_bookings = bookings.filter(status="Completed").count()
            cancelled_bookings = bookings.filter(status="Cancelled").count()

            # This month statistics
            this_month = timezone.now().replace(day=1)
            bookings_this_month = bookings.filter(created_at__gte=this_month).count()

            # Revenue statistics (for guides)
            revenue_stats = {}
            if user.role == "Guide":
                completed = bookings.filter(status="Completed")
                total_revenue = (
                    completed.aggregate(total=Sum("total_amount"))["total"] or 0
                )

                this_month_revenue = (
                    completed.filter(completed_at__gte=this_month).aggregate(
                        total=Sum("total_amount")
                    )["total"]
                    or 0
                )

                revenue_stats = {
                    "total_revenue": float(total_revenue),
                    "this_month_revenue": float(this_month_revenue),
                    "average_booking_value": (
                        float(total_revenue / completed.count())
                        if completed.count() > 0
                        else 0
                    ),
                }

            # Recent bookings
            recent_bookings = bookings.order_by("-created_at")[:5]

            stats = {
                "total_bookings": total_bookings,
                "pending_bookings": pending_bookings,
                "confirmed_bookings": confirmed_bookings,
                "completed_bookings": completed_bookings,
                "cancelled_bookings": cancelled_bookings,
                "bookings_this_month": bookings_this_month,
                "success_rate": (
                    (completed_bookings / total_bookings * 100)
                    if total_bookings > 0
                    else 0
                ),
                **revenue_stats,
            }

            return stats

        except Exception as e:
            logger.error(f"Error getting booking statistics: {str(e)}")
            return {}

    @staticmethod
    def get_booking_calendar(user, start_date, end_date):
        """
        Get booking calendar data for user
        """
        try:
            if user.role == "Guide":
                bookings = Booking.objects.filter(
                    guide=user,
                    start_date__date__gte=start_date,
                    start_date__date__lte=end_date,
                ).exclude(status="Cancelled")
            else:
                bookings = Booking.objects.filter(
                    client=user,
                    start_date__date__gte=start_date,
                    start_date__date__lte=end_date,
                ).exclude(status="Cancelled")

            calendar_data = []
            for booking in bookings:
                calendar_data.append(
                    {
                        "id": str(booking.id),
                        "title": booking.title,
                        "start": booking.start_date.isoformat(),
                        "end": booking.end_date.isoformat(),
                        "status": booking.status,
                        "client_name": booking.client.full_name,
                        "guide_name": booking.guide.full_name,
                        "service": booking.service.name if booking.service else None,
                        "total_amount": float(booking.total_amount),
                    }
                )

            return calendar_data

        except Exception as e:
            logger.error(f"Error getting booking calendar: {str(e)}")
            return []

    @staticmethod
    def can_access_booking(user, booking):
        """
        Check if user can access booking
        """
        return user == booking.client or user == booking.guide or user.is_staff

    @staticmethod
    def can_update_booking(user, booking):
        """
        Check if user can update booking
        """
        # Only guide can update most fields, client can only cancel
        if user == booking.guide:
            return booking.status in ["Pending", "Confirmed"]
        elif user == booking.client:
            return booking.status == "Pending"
        return False

    @staticmethod
    def can_cancel_booking(user, booking):
        """
        Check if user can cancel booking
        """
        return (
            user == booking.client or user == booking.guide
        ) and booking.can_cancel()


class BookingRequestService:
    """
    Service for booking request operations
    """

    @staticmethod
    def create_request(client, guide, **kwargs):
        """
        Create a new booking request
        """
        try:
            # Check if there's already a pending request
            existing_request = BookingRequest.objects.filter(
                client=client,
                guide=guide,
                status="Pending",
                requested_date__date=kwargs["requested_date"].date(),
            ).exists()

            if existing_request:
                raise ValueError(
                    "You already have a pending request for this guide on this date"
                )

            # Set expiration time (24 hours from now)
            expires_at = timezone.now() + timedelta(hours=24)

            # Create request
            booking_request = BookingRequest.objects.create(
                client=client, guide=guide, expires_at=expires_at, **kwargs
            )

            logger.info(f"Booking request created: {booking_request.id}")
            return booking_request

        except Exception as e:
            logger.error(f"Error creating booking request: {str(e)}")
            raise

    @staticmethod
    def accept_request(booking_request, guide):
        """
        Accept a booking request and create booking
        """
        try:
            if booking_request.status != "Pending":
                raise ValueError("Request has already been responded to")

            # Check if still valid
            if booking_request.is_expired():
                raise ValueError("Request has expired")

            # Check guide availability
            if not BookingService.is_guide_available(
                guide=guide,
                start_date=booking_request.requested_date,
                end_date=booking_request.requested_end_date,
            ):
                raise ValueError("Guide is no longer available for this time period")

            # Create booking
            booking = BookingService.create_booking(
                client=booking_request.client,
                guide=guide,
                service=booking_request.requested_service,
                title=f"Tour with {guide.full_name}",
                start_date=booking_request.requested_date,
                end_date=booking_request.requested_end_date,
                adults_count=booking_request.requested_adults,
                children_count=booking_request.requested_children,
                notes=booking_request.requested_notes,
                duration_type="daily",  # Default to daily
            )

            # Update request status
            booking_request.status = "Accepted"
            booking_request.responded_at = timezone.now()
            booking_request.booking = booking
            booking_request.save()

            logger.info(f"Booking request accepted: {booking_request.id}")
            return booking_request

        except Exception as e:
            logger.error(f"Error accepting booking request: {str(e)}")
            raise

    @staticmethod
    def reject_request(booking_request, guide):
        """
        Reject a booking request
        """
        try:
            if booking_request.status != "Pending":
                raise ValueError("Request has already been responded to")

            # Update request status
            booking_request.status = "Rejected"
            booking_request.responded_at = timezone.now()
            booking_request.save()

            logger.info(f"Booking request rejected: {booking_request.id}")
            return booking_request

        except Exception as e:
            logger.error(f"Error rejecting booking request: {str(e)}")
            raise

    @staticmethod
    def counter_offer(
        booking_request,
        guide,
        counter_date,
        counter_end_date,
        counter_price,
        counter_notes="",
    ):
        """
        Make a counter offer for booking request
        """
        try:
            if booking_request.status != "Pending":
                raise ValueError("Request has already been responded to")

            # Update request with counter offer
            booking_request.status = "Counter Offered"
            booking_request.responded_at = timezone.now()
            booking_request.counter_date = counter_date
            booking_request.counter_end_date = counter_end_date
            booking_request.counter_price = counter_price
            booking_request.counter_notes = counter_notes
            booking_request.save()

            logger.info(f"Counter offer made for booking request: {booking_request.id}")
            return booking_request

        except Exception as e:
            logger.error(f"Error making counter offer: {str(e)}")
            raise

    @staticmethod
    def can_access_request(user, booking_request):
        """
        Check if user can access booking request
        """
        return (
            user == booking_request.client
            or user == booking_request.guide
            or user.is_staff
        )


class NotificationService:
    """
    Service for booking-related notifications
    """

    @staticmethod
    def send_booking_notification(booking, notification_type):
        """
        Send booking-related notification
        """
        try:
            from apps.accounts.tasks import send_booking_notification_email

            # Determine recipient based on notification type
            if notification_type in [
                "new_booking",
                "booking_updated",
                "booking_cancelled",
            ]:
                recipient = booking.guide
            else:
                recipient = booking.client

            # Send notification
            send_booking_notification_email.delay(
                booking_id=str(booking.id), notification_type=notification_type
            )

            # Create in-app notification
            try:
                from apps.notifications.models import Notification

                notification_messages = {
                    "new_booking": f"New booking request from {booking.client.full_name}",
                    "booking_updated": f"Booking updated by {booking.guide.full_name}",
                    "booking_cancelled": f"Booking cancelled",
                    "booking_completed": f"Booking completed by {booking.guide.full_name}",
                    "booking_started": f"Your tour has started with {booking.guide.full_name}",
                }

                message = notification_messages.get(
                    notification_type, "Booking notification"
                )

                Notification.objects.create(
                    user=recipient,
                    type="booking_update",
                    title="Booking Notification",
                    message=message,
                    booking_id=booking.id,
                )

            except ImportError:
                logger.warning("Notification model not available")

            logger.info(
                f"Booking notification sent: {notification_type} for {booking.id}"
            )

        except Exception as e:
            logger.error(f"Error sending booking notification: {str(e)}")

    @staticmethod
    def send_booking_request_notification(booking_request, notification_type):
        """
        Send booking request notification
        """
        try:
            from apps.accounts.tasks import send_booking_notification_email

            # Determine recipient
            if notification_type == "new_request":
                recipient = booking_request.guide
            else:
                recipient = booking_request.client

            # Send email notification
            send_booking_notification_email.delay(
                booking_id=str(booking_request.id), notification_type=notification_type
            )

            # Create in-app notification
            try:
                from apps.notifications.models import Notification

                notification_messages = {
                    "new_request": f"New booking request from {booking_request.client.full_name}",
                    "request_accept": f"Your booking request was accepted by {booking_request.guide.full_name}",
                    "request_reject": f"Your booking request was declined by {booking_request.guide.full_name}",
                    "request_counter": f"{booking_request.guide.full_name} made a counter offer",
                }

                message = notification_messages.get(
                    notification_type, "Booking request notification"
                )

                Notification.objects.create(
                    user=recipient,
                    type="booking_request",
                    title="Booking Request",
                    message=message,
                    booking_id=booking_request.id,
                )

            except ImportError:
                logger.warning("Notification model not available")

            logger.info(
                f"Booking request notification sent: {notification_type} for {booking_request.id}"
            )

        except Exception as e:
            logger.error(f"Error sending booking request notification: {str(e)}")


class BookingAnalyticsService:
    """
    Service for booking analytics and insights
    """

    @staticmethod
    def get_booking_trends(days=30):
        """
        Get booking trends over specified period
        """
        try:
            from django.db.models.functions import TruncDate

            start_date = timezone.now() - timedelta(days=days)

            # Daily booking counts
            daily_bookings = (
                Booking.objects.filter(created_at__gte=start_date)
                .annotate(date=TruncDate("created_at"))
                .values("date")
                .annotate(count=Count("id"), revenue=Sum("total_amount"))
                .order_by("date")
            )

            return list(daily_bookings)

        except Exception as e:
            logger.error(f"Error getting booking trends: {str(e)}")
            return []

    @staticmethod
    def get_popular_services():
        """
        Get most popular services
        """
        try:
            popular_services = (
                Service.objects.annotate(booking_count=Count("booking"))
                .filter(booking_count__gt=0)
                .order_by("-booking_count")[:10]
            )

            return [
                {
                    "id": service.id,
                    "name": service.name,
                    "booking_count": service.booking_count,
                }
                for service in popular_services
            ]

        except Exception as e:
            logger.error(f"Error getting popular services: {str(e)}")
            return []

    @staticmethod
    def get_guide_performance_metrics():
        """
        Get guide performance metrics
        """
        try:
            guides = (
                User.objects.filter(role="Guide", bookings_as_guide__isnull=False)
                .annotate(
                    total_bookings=Count("bookings_as_guide"),
                    completed_bookings=Count(
                        "bookings_as_guide",
                        filter=Q(bookings_as_guide__status="Completed"),
                    ),
                    total_revenue=Sum("bookings_as_guide__total_amount"),
                    avg_rating=Avg("reviews_received__rating"),
                )
                .order_by("-total_revenue")[:20]
            )

            performance_data = []
            for guide in guides:
                completion_rate = (
                    (guide.completed_bookings / guide.total_bookings * 100)
                    if guide.total_bookings > 0
                    else 0
                )

                performance_data.append(
                    {
                        "guide_id": guide.id,
                        "guide_name": guide.full_name,
                        "total_bookings": guide.total_bookings,
                        "completed_bookings": guide.completed_bookings,
                        "completion_rate": completion_rate,
                        "total_revenue": float(guide.total_revenue or 0),
                        "average_rating": float(guide.avg_rating or 0),
                    }
                )

            return performance_data

        except Exception as e:
            logger.error(f"Error getting guide performance metrics: {str(e)}")
            return []
