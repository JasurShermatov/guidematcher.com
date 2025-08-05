# apps/bookings/views.py

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.utils import timezone
from .models import Booking, BookingRequest, BookingUpdate
from .serializers import (
    BookingSerializer,
    BookingCreateSerializer,
    BookingUpdateSerializer,
    BookingRequestSerializer,
    BookingRequestCreateSerializer,
    BookingRequestResponseSerializer,
    BookingUpdateHistorySerializer,
)
from .services import BookingService, BookingRequestService, NotificationService
from apps.common.permissions import IsAuthenticated, IsGuideOrClient
import logging

User = get_user_model()
logger = logging.getLogger(__name__)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def booking_list(request):
    """
    List bookings for the authenticated user (client or guide).
    """
    try:
        if request.user.role == "Guide":
            bookings = Booking.objects.filter(guide=request.user)
        else:
            bookings = Booking.objects.filter(client=request.user)

        serializer = BookingSerializer(bookings, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Error listing bookings for user {request.user.id}: {str(e)}")
        return Response(
            {"detail": "Bronlarni ro'yxatlashda xatolik yuz berdi"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsGuideOrClient])
def booking_detail(request, booking_id):
    """
    Retrieve details of a specific booking.
    """
    try:
        booking = get_object_or_404(Booking, id=booking_id)
        if not BookingService.can_access_booking(request.user, booking):
            return Response(
                {"detail": "Bu bronga kirish huquqingiz yo'q"},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = BookingSerializer(booking)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Error retrieving booking {booking_id}: {str(e)}")
        return Response(
            {"detail": "Bron ma'lumotlarini olishda xatolik yuz berdi"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsGuideOrClient])
def booking_history(request, booking_id):
    """
    Retrieve status update history for a specific booking.
    """
    try:
        booking = get_object_or_404(Booking, id=booking_id)
        if not BookingService.can_access_booking(request.user, booking):
            return Response(
                {"detail": "Bu bronga kirish huquqingiz yo'q"},
                status=status.HTTP_403_FORBIDDEN,
            )

        updates = BookingUpdate.objects.filter(booking=booking)
        serializer = BookingUpdateHistorySerializer(updates, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Error retrieving booking history for {booking_id}: {str(e)}")
        return Response(
            {"detail": "Bron tarixini olishda xatolik yuz berdi"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsGuideOrClient])
def complete_booking(request, booking_id):
    """
    Mark a booking as completed (only by guide).
    """
    try:
        booking = get_object_or_404(Booking, id=booking_id)
        if request.user != booking.guide:
            return Response(
                {"detail": "Faqat gid bu bronni yakunlashi mumkin"},
                status=status.HTTP_403_FORBIDDEN,
            )

        booking = BookingService.complete_booking(booking, request.user)
        NotificationService.send_booking_notification(booking, "booking_completed")
        serializer = BookingSerializer(booking)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except ValueError as e:
        return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"Error completing booking {booking_id}: {str(e)}")
        return Response(
            {"detail": "Bronni yakunlashda xatolik yuz berdi"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsGuideOrClient])
def start_booking(request, booking_id):
    """
    Mark a booking as in progress (only by guide).
    """
    try:
        booking = get_object_or_404(Booking, id=booking_id)
        if request.user != booking.guide:
            return Response(
                {"detail": "Faqat gid bu bronni boshlashi mumkin"},
                status=status.HTTP_403_FORBIDDEN,
            )

        booking = BookingService.start_booking(booking, request.user)
        NotificationService.send_booking_notification(booking, "booking_started")
        serializer = BookingSerializer(booking)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except ValueError as e:
        return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"Error starting booking {booking_id}: {str(e)}")
        return Response(
            {"detail": "Bronni boshlashda xatolik yuz berdi"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def booking_requests(request):
    """
    List all booking requests or create a new one.
    """
    if request.method == "GET":
        try:
            if request.user.role == "Guide":
                requests = BookingRequest.objects.filter(guide=request.user)
            else:
                requests = BookingRequest.objects.filter(client=request.user)

            serializer = BookingRequestSerializer(requests, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(
                f"Error listing booking requests for user {request.user.id}: {str(e)}"
            )
            return Response(
                {"detail": "So'rovlarni ro'yxatlashda xatolik yuz berdi"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    elif request.method == "POST":
        try:
            serializer = BookingRequestCreateSerializer(
                data=request.data, context={"request": request}
            )
            if serializer.is_valid():
                booking_request = BookingRequestService.create_request(
                    client=request.user,
                    guide=User.objects.get(id=request.data["guide"]),
                    **serializer.validated_data,
                )
                NotificationService.send_booking_request_notification(
                    booking_request, "new_request"
                )
                return Response(
                    BookingRequestSerializer(booking_request).data,
                    status=status.HTTP_201_CREATED,
                )
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except User.DoesNotExist:
            return Response(
                {"detail": "Gid topilmadi"}, status=status.HTTP_404_NOT_FOUND
            )
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error creating booking request: {str(e)}")
            return Response(
                {"detail": "So'rov yaratishda xatolik yuz berdi"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated, IsGuideOrClient])
def booking_request_detail(request, request_id):
    """
    Retrieve or respond to a booking request.
    """
    try:
        booking_request = get_object_or_404(BookingRequest, id=request_id)
        if not BookingRequestService.can_access_request(request.user, booking_request):
            return Response(
                {"detail": "Bu so'rovga kirish huquqingiz yo'q"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if request.method == "GET":
            serializer = BookingRequestSerializer(booking_request)
            return Response(serializer.data, status=status.HTTP_200_OK)

        elif request.method == "POST":
            if request.user != booking_request.guide:
                return Response(
                    {"detail": "Faqat gid so'rovga javob bera oladi"},
                    status=status.HTTP_403_FORBIDDEN,
                )

            serializer = BookingRequestResponseSerializer(data=request.data)
            if serializer.is_valid():
                action = serializer.validated_data["action"]
                if action == "accept":
                    booking_request = BookingRequestService.accept_request(
                        booking_request, request.user
                    )
                    NotificationService.send_booking_request_notification(
                        booking_request, "request_accept"
                    )
                elif action == "reject":
                    booking_request = BookingRequestService.reject_request(
                        booking_request, request.user
                    )
                    NotificationService.send_booking_request_notification(
                        booking_request, "request_reject"
                    )
                elif action == "counter":
                    booking_request = BookingRequestService.counter_offer(
                        booking_request,
                        request.user,
                        counter_date=serializer.validated_data.get("counter_date"),
                        counter_end_date=serializer.validated_data.get(
                            "counter_end_date"
                        ),
                        counter_price=serializer.validated_data.get("counter_price"),
                        counter_notes=serializer.validated_data.get(
                            "counter_notes", ""
                        ),
                    )
                    NotificationService.send_booking_request_notification(
                        booking_request, "request_counter"
                    )

                return Response(
                    BookingRequestSerializer(booking_request).data,
                    status=status.HTTP_200_OK,
                )
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"Error processing booking request {request_id}: {str(e)}")
        return Response(
            {"detail": "So'rovni qayta ishlashda xatolik yuz berdi"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def booking_statistics(request):
    """
    Retrieve booking statistics for the authenticated user.
    """
    try:
        stats = BookingService.get_booking_statistics(request.user)
        return Response(stats, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(
            f"Error retrieving booking statistics for user {request.user.id}: {str(e)}"
        )
        return Response(
            {"detail": "Statistikani olishda xatolik yuz berdi"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def available_guides(request):
    """
    Retrieve available guides based on filters (date, service, location).
    """
    try:
        date = request.query_params.get("date")
        service_id = request.query_params.get("service_id")
        location = request.query_params.get("location")

        guides = BookingService.get_available_guides(date, service_id, location)
        from apps.accounts.serializers import UserSerializer

        serializer = UserSerializer(guides, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Error retrieving available guides: {str(e)}")
        return Response(
            {"detail": "Mavjud gidlarni olishda xatolik yuz berdi"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def booking_calendar(request):
    """
    Retrieve booking calendar data for the authenticated user.
    """
    try:
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")

        try:
            start_date = timezone.datetime.strptime(start_date, "%Y-%m-%d").date()
            end_date = timezone.datetime.strptime(end_date, "%Y-%m-%d").date()
        except (ValueError, TypeError):
            return Response(
                {"detail": "Yaroqsiz sana formati"}, status=status.HTTP_400_BAD_REQUEST
            )

        calendar_data = BookingService.get_booking_calendar(
            request.user, start_date, end_date
        )
        return Response(calendar_data, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(
            f"Error retrieving booking calendar for user {request.user.id}: {str(e)}"
        )
        return Response(
            {"detail": "Kalendar ma'lumotlarini olishda xatolik yuz berdi"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
