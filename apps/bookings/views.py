# apps/bookings/views.py
from django.utils import timezone
from django.db import transaction
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from apps.bookings.models import Booking, BookingMessage
from apps.bookings.serializers import (
    BookingSerializer,
    BookingCreateSerializer,
    BookingMessageSerializer,
)
from apps.common.permissions import (
    IsClient,
    IsCustomer,
    IsBookingParticipant,
    IsOwnerOrReadOnly,
)
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema


@extend_schema(tags=["booking"])
class BookingViewSet(viewsets.ModelViewSet):
    """
    Booking CRUD + custom actions (respond, accept, reject, cancel, complete).
    Business logic is role-based:
      - Client: create, accept counter-offer, cancel, complete
      - Customer: respond, accept, reject, cancel, complete
    """

    queryset = Booking.objects.select_related(
        "client", "customer__user", "service_type"
    ).only(
        "id",
        "client",
        "customer",
        "service_type",
        "title",
        "status",
        "start_date",
        "end_date",
        "proposed_rate",
        "counter_offer_rate",
        "provider_response",
        "responded_at",
        "accepted_at",
        "completed_at",
        "cancelled_at",
        "cancelled_by",
        "cancellation_reason",
        "created_at",
        "updated_at",
    )
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ["status", "service_type", "start_date", "end_date", "currency"]
    search_fields = ["title", "description", "location", "location_details"]
    ordering_fields = ["created_at", "start_date", "proposed_rate"]
    ordering = ["-created_at"]

    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return BookingCreateSerializer
        return BookingSerializer

    def get_permissions(self):
        if self.action == "create":
            return [IsClient()]
        elif self.action in [
            "accept",
            "reject",
            "respond",
            "cancel",
            "complete",
            "accept_counter",
        ]:
            return [IsBookingParticipant()]
        elif self.action in ["update", "partial_update", "destroy"]:
            return [IsOwnerOrReadOnly()]
        return super().get_permissions()

    def perform_create(self, serializer):
        serializer.save(client=self.request.user)

    # ──────────────────────────── Custom Actions ──────────────────────────── #

    @action(detail=True, methods=["post"])
    def respond(self, request, pk=None):
        """
        Customer responds to booking with optional counter-offer.
        """
        booking = self.get_object()

        if not request.user.is_customer:
            return Response(
                {"detail": "Only providers can respond."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if booking.status != Booking.BookingStatus.PENDING:
            return Response(
                {"detail": "Cannot respond to non-pending booking."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        booking.provider_response = request.data.get("response", "")
        booking.counter_offer_rate = request.data.get("counter_offer_rate")
        booking.responded_at = timezone.now()
        booking.save(
            update_fields=["provider_response", "counter_offer_rate", "responded_at"]
        )
        return Response(BookingSerializer(booking).data)

    @action(detail=True, methods=["post"])
    def accept_counter(self, request, pk=None):
        """
        Client accepts counter-offer from provider.
        """
        booking = self.get_object()

        if request.user != booking.client:
            return Response(
                {"detail": "Only client can accept counter-offer."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not booking.counter_offer_rate:
            return Response(
                {"detail": "No counter-offer to accept."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if booking.status != Booking.BookingStatus.PENDING:
            return Response(
                {"detail": "Only pending bookings can accept counter-offer."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            booking.proposed_rate = booking.counter_offer_rate
            booking.status = Booking.BookingStatus.ACCEPTED
            booking.accepted_at = timezone.now()
            booking.save(update_fields=["proposed_rate", "status", "accepted_at"])

        return Response(BookingSerializer(booking).data)

    @action(detail=True, methods=["post"])
    def accept(self, request, pk=None):
        """
        Provider accepts booking request.
        """
        booking = self.get_object()

        if not request.user.is_customer:
            return Response(
                {"detail": "Only providers can accept."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if booking.status != Booking.BookingStatus.PENDING:
            return Response(
                {"detail": "Only pending bookings can be accepted."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        booking.status = Booking.BookingStatus.ACCEPTED
        booking.accepted_at = timezone.now()
        booking.save(update_fields=["status", "accepted_at"])
        return Response(BookingSerializer(booking).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        """
        Provider rejects booking request.
        """
        booking = self.get_object()

        if not request.user.is_customer:
            return Response(
                {"detail": "Only providers can reject."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if booking.status != Booking.BookingStatus.PENDING:
            return Response(
                {"detail": "Only pending bookings can be rejected."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        booking.status = Booking.BookingStatus.REJECTED
        booking.save(update_fields=["status"])
        return Response(BookingSerializer(booking).data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        """
        Both client and provider can cancel booking if not already completed/cancelled.
        """
        booking = self.get_object()

        if booking.status not in [
            Booking.BookingStatus.PENDING,
            Booking.BookingStatus.ACCEPTED,
        ]:
            return Response(
                {"detail": "Cannot cancel at this stage."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        booking.status = Booking.BookingStatus.CANCELLED
        booking.cancelled_at = timezone.now()
        booking.cancelled_by = request.user
        booking.cancellation_reason = request.data.get("reason", "")
        booking.save(
            update_fields=[
                "status",
                "cancelled_at",
                "cancelled_by",
                "cancellation_reason",
            ]
        )
        return Response(BookingSerializer(booking).data)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        """
        Either participant (client or provider) can mark booking as completed if accepted.
        """
        booking = self.get_object()

        if request.user not in [booking.client, booking.customer.user]:
            return Response(
                {"detail": "Only participants can complete."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if booking.status != Booking.BookingStatus.ACCEPTED:
            return Response(
                {"detail": "Only accepted bookings can be completed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        booking.status = Booking.BookingStatus.COMPLETED
        booking.completed_at = timezone.now()
        booking.save(update_fields=["status", "completed_at"])
        return Response(BookingSerializer(booking).data)


@extend_schema(tags=["booking"])
class BookingMessageViewSet(viewsets.ModelViewSet):
    """
    Chat/messages between participants inside a booking.
    """

    serializer_class = BookingMessageSerializer
    permission_classes = [IsBookingParticipant]

    def get_queryset(self):
        return (
            BookingMessage.objects.filter(booking_id=self.kwargs["booking_pk"])
            .select_related("sender")
            .only(
                "id",
                "booking_id",
                "sender",
                "message",
                "is_system_message",
                "created_at",
            )
        )

    def perform_create(self, serializer):
        serializer.save(sender=self.request.user, booking_id=self.kwargs["booking_pk"])
