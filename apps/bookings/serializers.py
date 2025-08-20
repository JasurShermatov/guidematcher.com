from rest_framework import serializers
from django.utils import timezone

from apps.bookings.models import Booking, BookingMessage
from apps.users.serializers import UserShortSerializer
from apps.profiles.serializers import CustomerProfileShortSerializer
from apps.common.serializers import ServiceTypeSerializer


class BaseBookingSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Booking
        fields = (
            "id",
            "title",
            "start_date",
            "end_date",
            "status",
            "status_display",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "status",
            "status_display",
            "created_at",
            "updated_at",
        )


class BookingShortSerializer(BaseBookingSerializer):
    class Meta(BaseBookingSerializer.Meta):
        fields = BaseBookingSerializer.Meta.fields


class BookingSerializer(BaseBookingSerializer):
    client = UserShortSerializer(read_only=True)
    customer = CustomerProfileShortSerializer(read_only=True)
    service_type = ServiceTypeSerializer(read_only=True)
    cancelled_by = UserShortSerializer(read_only=True)

    class Meta(BaseBookingSerializer.Meta):
        fields = BaseBookingSerializer.Meta.fields + (
            "client",
            "customer",
            "service_type",
            "description",
            "start_time",
            "duration_hours",
            "location",
            "location_details",
            "latitude",
            "longitude",
            "proposed_rate",
            "rate_type",
            "currency",
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
        )
        read_only_fields = BaseBookingSerializer.Meta.read_only_fields + (
            "client",
            "responded_at",
            "accepted_at",
            "completed_at",
            "cancelled_at",
            "cancelled_by",
        )


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

    def validate(self, data):
        start_date = data.get("start_date")
        end_date = data.get("end_date")
        duration_hours = data.get("duration_hours")
        number_of_people = data.get("number_of_people")
        proposed_rate = data.get("proposed_rate")

        if start_date and start_date < timezone.now().date():
            raise serializers.ValidationError(
                {
                    "start_date": "Boshlanish sanasi o‘tgan kundan oldin bo‘lishi mumkin emas."
                }
            )

        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError(
                {"end_date": "Tugash sanasi boshlanish sanasidan keyin bo‘lishi shart."}
            )

        if duration_hours is not None and duration_hours <= 0:
            raise serializers.ValidationError(
                {"duration_hours": "Davomiylik 0 dan katta bo‘lishi shart."}
            )

        if number_of_people is not None and number_of_people < 1:
            raise serializers.ValidationError(
                {"number_of_people": "Odamlar soni kamida 1 bo‘lishi kerak."}
            )

        if proposed_rate is not None and proposed_rate <= 0:
            raise serializers.ValidationError(
                {"proposed_rate": "Taklif qilingan narx musbat bo‘lishi kerak."}
            )

        return data


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
