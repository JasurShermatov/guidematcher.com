# apps/bookings/views.py
from datetime import datetime

from django.db.models import Q
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.bookings.models import Booking
from apps.bookings.permissions import IsAuthenticatedAndOwnerOrReadOnly
from apps.bookings.serializers import BookingSerializer, BookingReadSerializer
from apps.chat.models import Conversation
from apps.profiles.models import Unavailability, CustomerProfile


@extend_schema(tags=["Bookings"])
class BookingViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticatedAndOwnerOrReadOnly]

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def incoming(self, request):
        qs = self.get_queryset().filter(status=Booking.BookingStatus.PENDING)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    def get_serializer_class(self):
        # 🔧 incoming ham o‘qish serializeridan foydalansin
        if self.action in ["list", "retrieve", "incoming"]:
            return BookingReadSerializer
        return BookingSerializer

    def get_queryset(self):
        user = self.request.user
        mode = self.request.query_params.get("as")
        qs = Booking.objects.all()

        has_client = hasattr(user, "clientprofile")
        has_guide = hasattr(user, "customerprofile")

        if mode == "guide":
            return (
                qs.filter(customer_profile=getattr(user, "customerprofile", None))
                if has_guide
                else Booking.objects.none()
            )

        if mode == "client":
            return (
                qs.filter(client_profile=getattr(user, "clientprofile", None))
                if has_client
                else Booking.objects.none()
            )

        if has_client and has_guide:
            return qs.filter(
                Q(client_profile=user.clientprofile)
                | Q(customer_profile=user.customerprofile)
            )
        if has_client:
            return qs.filter(client_profile=user.clientprofile)
        if has_guide:
            return qs.filter(customer_profile=user.customerprofile)
        return Booking.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        client_profile = getattr(user, "clientprofile", None)
        if not client_profile:
            raise ValidationError(
                {"error": "You must have a client profile to create a booking."}
            )

        customer_profile = serializer.validated_data.get("customer_profile")
        if not customer_profile:
            raise ValidationError({"error": "Customer profile is required."})

        start_date = serializer.validated_data.get("start_date")
        end_date = serializer.validated_data.get("end_date")

        is_unavailable = Unavailability.objects.filter(
            customer=customer_profile,
            start_date__lte=end_date,
            end_date__gte=start_date,
        ).exists()

        if is_unavailable:
            return Response(
                {
                    "status": "unavailable",
                    "message": "Customer is unavailable for the selected date range.",
                },
                status=200,
            )

        instance = serializer.save(client_profile=client_profile)

        if instance.client_profile:
            conversation, _ = Conversation.objects.get_or_create_chat(
                user1=instance.client_profile.user, user2=instance.customer_profile.user
            )
            instance.conversation = conversation
            instance.save(update_fields=["conversation"])

        return instance

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def accept(self, request, pk=None):

        booking = self.get_object()
        booking.status = Booking.BookingStatus.ACCEPTED
        booking.save(update_fields=["status"])
        return Response({"status": "accepted"}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def complete(self, request, pk=None):
        booking = self.get_object()
        if booking.status in [Booking.BookingStatus.ACCEPTED]:
            booking.status = Booking.BookingStatus.COMPLETED
            booking.save(update_fields=["status"])
            return Response({"status": "completed"}, status=status.HTTP_200_OK)
        return Response(
            {"error": "Only accepted bookings can be marked as completed."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def cancel(self, request, pk=None):
        booking = self.get_object()
        reason = request.data.get("reason", "")
        if booking.status in [
            Booking.BookingStatus.PENDING,
            Booking.BookingStatus.ACCEPTED,
        ]:
            booking.status = Booking.BookingStatus.CANCELLED
            booking.cancellation_reason = reason
            booking.save(update_fields=["status", "cancellation_reason"])
            return Response({"status": "cancelled"}, status=status.HTTP_200_OK)
        return Response(
            {"error": "Cannot cancel this booking"}, status=status.HTTP_400_BAD_REQUEST
        )

    @action(
        detail=True,
        methods=["get"],
        permission_classes=[IsAuthenticated],
        url_path="check-availability",
    )
    def check_availability(self, request, pk=None):
        customer_profile = get_object_or_404(CustomerProfile, id=pk)
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")

        if not start_date or not end_date:
            return Response(
                {
                    "error": "Both start_date and end_date are required in YYYY-MM-DD format."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            start_date = datetime.strptime(start_date, "%Y-%m-%d").date()
            end_date = datetime.strptime(end_date, "%Y-%m-%d").date()
        except ValueError:
            return Response(
                {"error": "Invalid date format. Use YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if end_date < start_date:
            return Response(
                {"error": "End date cannot be earlier than start date."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        is_unavailable = Unavailability.objects.filter(
            customer=customer_profile,
            start_date__lte=end_date,
            end_date__gte=start_date,
        ).exists()

        return Response(
            {
                "is_available": not is_unavailable,
                "message": (
                    "Guide is available for the selected dates."
                    if not is_unavailable
                    else "Guide is unavailable for the selected dates."
                ),
            },
            status=status.HTTP_200_OK,
        )
