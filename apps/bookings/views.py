# apps/bookings/views.py - FIXED VERSION WITH UUID STRING CONVERSION IN METADATA

from django.core.cache import cache
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from drf_spectacular.utils import extend_schema, OpenApiParameter
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.bookings.models import Booking
from apps.bookings.permissions import IsAuthenticatedAndOwnerOrReadOnly
from apps.bookings.serializers import (
    BookingSerializer,
    BookingUpdateDatesSerializer,
    CustomerSearchSerializer,
    CustomerProfileSerializer,
)
from apps.profiles.models import CustomerProfile


@extend_schema(tags=["Bookings"])
class BookingViewSet(viewsets.ModelViewSet):
    """
    Complete Booking management API
    """

    serializer_class = BookingSerializer
    permission_classes = [IsAuthenticatedAndOwnerOrReadOnly]

    def get_queryset(self):
        """Optimized queryset with filters"""
        user = self.request.user

        # Base queryset
        queryset = Booking.objects.none()

        if hasattr(user, "clientprofile"):
            queryset = Booking.objects.filter(client_profile=user.clientprofile)
        elif hasattr(user, "customerprofile"):
            queryset = Booking.objects.filter(customer_profile=user.customerprofile)
        else:
            return queryset

        # Apply filters
        filters = Q()

        if status_filter := self.request.query_params.get("status"):
            filters &= Q(status=status_filter)

        if date_from := self.request.query_params.get("date_from"):
            filters &= Q(start_date__gte=date_from)

        if date_to := self.request.query_params.get("date_to"):
            filters &= Q(end_date__lte=date_to)

        # Optimize with select_related
        return (
            queryset.filter(filters)
            .select_related(
                "client_profile__user",
                "customer_profile__user",
                "customer_profile__city",
                "service_type",
            )
            .order_by("-created_at")
        )

    @transaction.atomic
    def perform_create(self, serializer):
        """Create booking with conversation"""
        user = self.request.user

        # Validate client profile
        if not hasattr(user, "clientprofile"):
            raise ValidationError("Only clients can create bookings")

        # Create booking
        instance = serializer.save(
            client_profile=user.clientprofile, created_via_chat=False
        )

        # Create conversation
        from apps.chat.models import Conversation, Message

        conversation, created = Conversation.objects.get_or_create_chat(
            user1=user, user2=instance.customer_profile.user
        )

        # Set conversation_id (NOT object!)
        instance.conversation_id = conversation.id
        instance.save(update_fields=["conversation_id"])

        # Create initial message
        Message.objects.create(
            conversation=conversation,
            sender=user,
            content=(
                f"📋 New booking request\n"
                f"📍 {instance.city}, {instance.country}\n"
                f"📅 {instance.start_date.strftime('%b %d')} - "
                f"{instance.end_date.strftime('%b %d, %Y')}\n"
                f"💰 {instance.proposed_rate} {instance.currency if instance.proposed_rate else 'Price TBD'}"
            ),
            message_type="booking",
            metadata={
                "booking_id": str(instance.id),
                "action": "created",
            },  # FIXED: str(UUID)
        )

    @extend_schema(
        request=BookingUpdateDatesSerializer, responses={200: BookingSerializer}
    )
    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    @transaction.atomic
    def accept(self, request, pk=None):
        """Customer accepts booking with dates"""
        booking = self.get_object()

        # Permission check - FIXED
        if not hasattr(request.user, "customerprofile"):
            raise PermissionDenied("Only customers can accept bookings")

        if booking.customer_profile_id != request.user.customerprofile.id:
            raise PermissionDenied("You cannot accept this booking")

        if not booking.can_accept:
            return Response(
                {
                    "error": f"Cannot accept booking with status: {booking.get_status_display()}"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate dates
        serializer = BookingUpdateDatesSerializer(
            data=request.data, context={"booking": booking}
        )
        serializer.is_valid(raise_exception=True)

        # Check availability
        start = serializer.validated_data["start_date"]
        end = serializer.validated_data["end_date"]

        if not Booking.objects.check_availability(
            booking.customer_profile, start, end, exclude_booking=booking
        ):
            return Response(
                {"error": "You are not available for these dates"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Update booking
        booking.status = Booking.BookingStatus.ACCEPTED
        booking.start_date = start
        booking.end_date = end
        booking.accepted_at = timezone.now()
        booking.save(update_fields=["status", "start_date", "end_date", "accepted_at"])

        # Send notification
        if booking.conversation_id:
            from apps.chat.models import Message, Conversation

            conversation = Conversation.objects.filter(
                id=booking.conversation_id
            ).first()
            if conversation:
                Message.objects.create(
                    conversation=conversation,
                    sender=request.user,
                    content=(
                        f"✅ Booking accepted!\n"
                        f"📅 Confirmed dates: {start.strftime('%b %d')} - {end.strftime('%b %d, %Y')}"
                    ),
                    message_type="booking",
                    metadata={
                        "booking_id": str(booking.id),
                        "action": "accepted",
                    },  # FIXED: str(UUID)
                )

        # Clear cache
        cache.delete(f"customer_busy_{booking.customer_profile_id}")

        return Response(BookingSerializer(booking, context={"request": request}).data)

    @extend_schema(
        request=BookingUpdateDatesSerializer, responses={200: BookingSerializer}
    )
    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    @transaction.atomic
    def update_dates(self, request, pk=None):
        """Update booking dates"""
        booking = self.get_object()

        # Permission check
        if not hasattr(request.user, "customerprofile"):
            raise PermissionDenied("Only customers can update booking dates")

        if booking.customer_profile_id != request.user.customerprofile.id:
            raise PermissionDenied("You cannot update this booking")

        if not booking.can_update:
            return Response(
                {"error": "Cannot update this booking"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate new dates
        serializer = BookingUpdateDatesSerializer(
            data=request.data, context={"booking": booking}
        )
        serializer.is_valid(raise_exception=True)

        new_start = serializer.validated_data["start_date"]
        new_end = serializer.validated_data["end_date"]

        # Check if dates actually changed
        if new_start == booking.start_date and new_end == booking.end_date:
            return Response(
                {"error": "No changes in dates"}, status=status.HTTP_400_BAD_REQUEST
            )

        # Check availability
        if not Booking.objects.check_availability(
            booking.customer_profile, new_start, new_end, exclude_booking=booking
        ):
            return Response(
                {"error": "You are not available for new dates"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Update dates
        old_start, old_end = booking.start_date, booking.end_date
        booking.update_dates(new_start, new_end)

        # Send notification
        if booking.conversation_id:
            from apps.chat.models import Message, Conversation

            conversation = Conversation.objects.filter(
                id=booking.conversation_id
            ).first()
            if conversation:
                Message.objects.create(
                    conversation=conversation,
                    sender=request.user,
                    content=(
                        f"📅 Booking dates updated\n"
                        f"Old: {old_start.strftime('%b %d')} - {old_end.strftime('%b %d')}\n"
                        f"New: {new_start.strftime('%b %d')} - {new_end.strftime('%b %d, %Y')}"
                    ),
                    message_type="booking",
                    metadata={
                        "booking_id": str(booking.id),  # FIXED: str(UUID)
                        "action": "updated",
                        "update_count": booking.updated_count,
                    },
                )

        # Clear cache
        cache.delete(f"customer_busy_{booking.customer_profile_id}")

        return Response(BookingSerializer(booking, context={"request": request}).data)

    @extend_schema(
        request={"confirm": bool, "reason": str},
        responses={200: {"status": str, "message": str}},
    )
    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    @transaction.atomic
    def cancel(self, request, pk=None):
        """Cancel booking with confirmation"""
        booking = self.get_object()

        # Check permissions - both parties can cancel
        can_cancel = False
        canceller_type = None

        if hasattr(request.user, "customerprofile"):
            if booking.customer_profile_id == request.user.customerprofile.id:
                can_cancel = True
                canceller_type = "customer"
        elif hasattr(request.user, "clientprofile"):
            if (
                booking.client_profile
                and booking.client_profile_id == request.user.clientprofile.id
            ):
                can_cancel = True
                canceller_type = "client"

        if not can_cancel:
            raise PermissionDenied("You cannot cancel this booking")

        if not booking.can_cancel:
            return Response(
                {
                    "error": f"Cannot cancel booking with status: {booking.get_status_display()}"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Require confirmation
        if not request.data.get("confirm"):
            return Response(
                {"message": "Please confirm cancellation", "require_confirm": True},
                status=status.HTTP_200_OK,
            )

        # Cancel booking
        booking.status = Booking.BookingStatus.CANCELLED
        booking.cancelled_at = timezone.now()
        booking.cancelled_by_id = request.user.id
        booking.save(update_fields=["status", "cancelled_at", "cancelled_by_id"])

        # Send notification
        if booking.conversation_id:
            from apps.chat.models import Message, Conversation

            conversation = Conversation.objects.filter(
                id=booking.conversation_id
            ).first()
            if conversation:
                reason = request.data.get("reason", "No reason provided")
                Message.objects.create(
                    conversation=conversation,
                    sender=request.user,
                    content=(
                        f"❌ Booking cancelled\n"
                        f"Reason: {reason}\n"
                        f"Cancelled by: {canceller_type.capitalize()}"
                    ),
                    message_type="booking",
                    metadata={
                        "booking_id": str(booking.id),  # FIXED: str(UUID)
                        "action": "cancelled",
                        "cancelled_by": canceller_type,
                    },
                )

        # Clear cache
        cache.delete(f"customer_busy_{booking.customer_profile_id}")

        return Response(
            {"status": "success", "message": "Booking cancelled successfully"}
        )

    @extend_schema(
        parameters=[
            OpenApiParameter("country", str, OpenApiParameter.QUERY, required=True),
            OpenApiParameter("city", str, OpenApiParameter.QUERY),
            OpenApiParameter("start_date", str, OpenApiParameter.QUERY),
            OpenApiParameter("end_date", str, OpenApiParameter.QUERY),
            OpenApiParameter("min_rating", float, OpenApiParameter.QUERY),
        ]
    )
    @action(detail=False, methods=["get"])
    def search_customers(self, request):
        """Search available customers"""
        serializer = CustomerSearchSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data

        # Base query
        queryset = (
            CustomerProfile.objects.filter(is_available=True, user__is_active=True)
            .select_related("user", "city")
            .prefetch_related("languages", "service_types")
        )

        # Country filter - FIXED for CountryField
        if country := data.get("country"):
            queryset = queryset.filter(country__iexact=country)  # Use exact match

        # City filter
        if city := data.get("city"):
            queryset = queryset.filter(
                Q(city__name__icontains=city) | Q(service_areas__icontains=city)
            )

        # Rating filter
        if min_rating := data.get("min_rating"):
            queryset = queryset.filter(average_rating__gte=min_rating)

        # Availability filter
        if data.get("start_date") and data.get("end_date"):
            # Get available customers only
            available_ids = []
            for customer in queryset.iterator():
                if Booking.objects.check_availability(
                    customer, data["start_date"], data["end_date"]
                ):
                    available_ids.append(customer.id)

            queryset = queryset.filter(id__in=available_ids)

        # Order by rating
        queryset = queryset.order_by("-average_rating", "-total_bookings")

        # Paginate
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = CustomerProfileSerializer(
                page, many=True, context={"request": request}
            )
            return self.get_paginated_response(serializer.data)

        # Limit results if no pagination
        queryset = queryset[:50]
        return Response(
            CustomerProfileSerializer(
                queryset, many=True, context={"request": request}
            ).data
        )

    @action(detail=False, methods=["get"])
    def my_schedule(self, request):
        """Get customer's schedule"""
        if not hasattr(request.user, "customerprofile"):
            raise PermissionDenied("Only customers can view schedule")

        customer = request.user.customerprofile

        # Date filters
        month = request.query_params.get("month")  # YYYY-MM
        year = request.query_params.get("year")

        # Base query
        bookings = Booking.objects.filter(
            customer_profile=customer,
            status__in=[Booking.BookingStatus.ACCEPTED, Booking.BookingStatus.UPDATED],
        ).select_related("client_profile__user")

        # Apply date filters
        if month:
            try:
                year_val, month_val = month.split("-")
                bookings = bookings.filter(
                    start_date__year=int(year_val), start_date__month=int(month_val)
                )
            except (ValueError, AttributeError):
                pass
        elif year:
            try:
                bookings = bookings.filter(start_date__year=int(year))
            except ValueError:
                pass

        # Get busy dates
        busy_dates = [
            d.isoformat() for d in Booking.objects.get_customer_busy_dates(customer)
        ]

        return Response(
            {
                "bookings": BookingSerializer(
                    bookings, many=True, context={"request": request}
                ).data,
                "busy_dates": sorted(busy_dates),
                "total_bookings": bookings.count(),
                "stats": {
                    "pending": Booking.objects.filter(
                        customer_profile=customer, status=Booking.BookingStatus.PENDING
                    ).count(),
                    "accepted": bookings.count(),
                    "completed": Booking.objects.filter(
                        customer_profile=customer,
                        status=Booking.BookingStatus.COMPLETED,
                    ).count(),
                },
            }
        )
