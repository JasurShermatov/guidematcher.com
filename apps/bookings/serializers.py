from rest_framework import serializers

from apps.bookings.models import Booking, BookingMessage
from apps.users.serializers import UserShortSerializer
from apps.profiles.serializers import CustomerProfileShortSerializer
from apps.common.serializers import ServiceTypeSerializer


# ─────────── BookingMessage ───────────
class BookingMessageSerializer(serializers.ModelSerializer):
    sender = UserShortSerializer(read_only=True)

    class Meta:
        model = BookingMessage
        fields = (
            "id",
            "booking",
            "sender",
            "message",
            "is_system_message",
            "created_at",
        )


# ─────────── Booking (to‘liq) ───────────
class BookingSerializer(serializers.ModelSerializer):
    client = UserShortSerializer(read_only=True)
    customer = CustomerProfileShortSerializer(read_only=True)
    service_type = ServiceTypeSerializer(read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    cancelled_by = UserShortSerializer(read_only=True)

    class Meta:
        model = Booking
        fields = (
            "id",
            "client",
            "customer",
            "service_type",
            "title",
            "description",
            "start_date",
            "end_date",
            "start_time",
            "duration_hours",
            "location",
            "location_details",
            "latitude",
            "longitude",
            "proposed_rate",
            "rate_type",
            "currency",
            "status",
            "status_display",
            "provider_response",
            "counter_offer_rate",
            "responded_at",
            "accepted_at",
            "completed_at",
            "cancelled_at",
            "cancelled_by",
            "cancellation_reason",
            "special_requirements",
            "number_of_people",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "client",
            "status",
            "status_display",
            "responded_at",
            "accepted_at",
            "completed_at",
            "cancelled_at",
            "cancelled_by",
            "created_at",
            "updated_at",
        )


# ─────────── BookingCreate / Update ───────────
class BookingCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        exclude = (
            "client",
            "status",
            "responded_at",
            "accepted_at",
            "completed_at",
            "cancelled_at",
            "cancelled_by",
            "created_at",
            "updated_at",
        )


# ─────────── BookingShort (Dispute uchun) ───────────
class BookingShortSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Booking
        fields = ("id", "title", "start_date", "end_date", "status", "status_display")
