from django.utils import timezone
from django.db import transaction
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, extend_schema_view

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



@extend_schema_view(
    list=extend_schema(
        summary="List Bookings",
        description="Retrieve a list of bookings. Clients see only their own bookings."
    ),
    create=extend_schema(
        summary="Create Booking",
        description="Client creates a new booking."
    ),
    retrieve=extend_schema(
        summary="Retrieve Booking",
        description="Get details of a specific booking by ID."
    ),
    update=extend_schema(
        summary="Update Booking",
        description="Update all fields of a booking (owner or admin only)."
    ),
    partial_update=extend_schema(
        summary="Partial Update Booking",
        description="Update some fields of a booking (owner or admin only)."
    ),
    destroy=extend_schema(
        summary="Delete Booking",
        description="Delete a booking (owner or admin only)."
    ),
)
@extend_schema(tags=["booking"])
class BookingViewSet(viewsets.ModelViewSet):

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
        """Return appropriate permissions depending on action"""
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
        """Automatically assign client as request user on creation"""
        serializer.save(client=self.request.user)

    # ──────────────────────────── Custom Actions ──────────────────────────── #

    @action(detail=True, methods=["post"])
    @extend_schema(
        summary="Respond to Booking",
        description="Customer responds to a booking with optional counter-offer."
    )
    def respond(self, request, pk=None):
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
    @extend_schema(
        summary="Accept Counter-offer",
        description="Client accepts a provider's counter-offer."
    )
    def accept_counter(self, request, pk=None):
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
    @extend_schema(
        summary="Accept Booking",
        description="Provider accepts a pending booking request."
    )
    def accept(self, request, pk=None):
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
    @extend_schema(
        summary="Reject Booking",
        description="Provider rejects a pending booking request."
    )
    def reject(self, request, pk=None):
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
    @extend_schema(
        summary="Cancel Booking",
        description="Client or provider can cancel booking if not completed/cancelled."
    )
    def cancel(self, request, pk=None):
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
    @extend_schema(
        summary="Complete Booking",
        description="Mark booking as completed by client or provider if accepted."
    )
    def complete(self, request, pk=None):
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


# ──────────────────────────── BookingMessageViewSet ──────────────────────────── #

@extend_schema_view(
    list=extend_schema(
        summary="List Booking Messages",
        description="Retrieve all messages for a booking."
    ),
    create=extend_schema(
        summary="Create Booking Message",
        description="Create a new message in the booking chat."
    ),
    retrieve=extend_schema(
        summary="Retrieve Message",
        description="Retrieve details of a specific booking message."
    ),
    update=extend_schema(
        summary="Update Message",
        description="Update all fields of a booking message."
    ),
    partial_update=extend_schema(
        summary="Partial Update Message",
        description="Update some fields of a booking message."
    ),
    destroy=extend_schema(
        summary="Delete Message",
        description="Delete a booking message (only sender)."
    ),
)
@extend_schema(tags=["booking"])
class BookingMessageViewSet(viewsets.ModelViewSet):
    """
    Chat/messages inside a booking.
    Allows participants to list and create messages.
    """

    serializer_class = BookingMessageSerializer
    permission_classes = [IsBookingParticipant]

    def get_queryset(self):
        """Return all messages for the given booking_id"""
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
        """Automatically assign sender and booking_id on message creation"""
        serializer.save(sender=self.request.user, booking_id=self.kwargs["booking_pk"])