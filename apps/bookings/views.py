from django.utils import timezone
from rest_framework import viewsets, status, filters
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

from drf_spectacular.utils import extend_schema


@extend_schema(tags=["booking"])
class BookingViewSet(viewsets.ModelViewSet):
    """
    CRUD + custom actions (accept / reject / cancel / complete) for bookings.
    """

    queryset = Booking.objects.all().select_related(
        "client", "customer__user", "service_type"
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

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return BookingCreateSerializer
        return BookingSerializer

    def get_permissions(self):
        if self.action in ["create"]:
            return [IsClient()]
        elif self.action in ["accept", "reject", "respond", "cancel", "complete"]:
            return [IsBookingParticipant()]
        elif self.action in ["update", "partial_update", "destroy"]:
            return [IsOwnerOrReadOnly()]
        return super().get_permissions()

    # ─────────────── Custom actions ───────────────
    @action(detail=True, methods=["post"])
    def respond(self, request, pk=None):
        """
        Service-provider javobi (matn va counter-offer).
        """
        booking = self.get_object()
        if not request.user.is_customer:
            return Response({"detail": "Only providers respond."}, status=403)

        booking.provider_response = request.data.get("response", "")
        booking.counter_offer_rate = request.data.get("counter_offer_rate")
        booking.responded_at = timezone.now()
        booking.save(
            update_fields=["provider_response", "counter_offer_rate", "responded_at"]
        )
        return Response(BookingSerializer(booking).data)

    @action(detail=True, methods=["post"])
    def accept(self, request, pk=None):
        booking = self.get_object()
        booking.status = Booking.BookingStatus.ACCEPTED
        booking.accepted_at = timezone.now()
        booking.save(update_fields=["status", "accepted_at"])
        return Response(BookingSerializer(booking).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        booking = self.get_object()
        booking.status = Booking.BookingStatus.REJECTED
        booking.save(update_fields=["status"])
        return Response(BookingSerializer(booking).data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        booking = self.get_object()
        if not booking.can_cancel:
            return Response({"detail": "Cannot cancel."}, status=400)
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
        booking = self.get_object()
        booking.status = Booking.BookingStatus.COMPLETED
        booking.completed_at = timezone.now()
        booking.save(update_fields=["status", "completed_at"])
        return Response(BookingSerializer(booking).data)


class BookingMessageViewSet(viewsets.ModelViewSet):
    """
    CRUD for messages inside a booking discussion.
    """

    serializer_class = BookingMessageSerializer
    permission_classes = [IsBookingParticipant]

    def get_queryset(self):
        return BookingMessage.objects.filter(
            booking_id=self.kwargs["booking_pk"]
        ).select_related("sender")

    def perform_create(self, serializer):
        serializer.save(sender=self.request.user, booking_id=self.kwargs["booking_pk"])
