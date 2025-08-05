# apps/bookings/serializers.py

from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from .models import Booking, BookingRequest, BookingUpdate
from apps.accounts.serializers import UserSerializer
from apps.common.models import Service

User = get_user_model()


class BookingRequestCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating booking requests
    """

    class Meta:
        model = BookingRequest
        fields = [
            "guide",
            "requested_service",
            "requested_date",
            "requested_end_date",
            "requested_adults",
            "requested_children",
            "requested_notes",
        ]

    def validate_requested_date(self, value):
        """Validate that requested date is in the future"""
        if value <= timezone.now():
            raise serializers.ValidationError(
                "Bron sanasi hozirgi vaqtdan keyin bo'lishi kerak."
            )
        return value

    def validate(self, attrs):
        """Validate booking request data"""
        requested_date = attrs.get("requested_date")
        requested_end_date = attrs.get("requested_end_date")
        guide = attrs.get("guide")

        # Check end date is after start date
        if requested_end_date and requested_end_date <= requested_date:
            raise serializers.ValidationError(
                {
                    "requested_end_date": "Tugash sanasi boshlanish sanasidan keyin bo'lishi kerak."
                }
            )

        # Check guide is actually a guide
        if guide.role != "Guide":
            raise serializers.ValidationError(
                {"guide": "Tanlangan foydalanuvchi gid emas."}
            )

        # Check for conflicting requests
        existing_request = BookingRequest.objects.filter(
            client=self.context["request"].user,
            guide=guide,
            requested_date__date=requested_date.date(),
            status="Pending",
        ).exists()

        if existing_request:
            raise serializers.ValidationError(
                "Bu gid uchun ushbu sanada allaqachon so'rov mavjud."
            )

        return attrs

    def create(self, validated_data):
        """Create booking request with expiration"""
        validated_data["client"] = self.context["request"].user
        validated_data["expires_at"] = timezone.now() + timedelta(hours=24)
        return super().create(validated_data)


class BookingRequestSerializer(serializers.ModelSerializer):
    """
    Serializer for booking request details
    """

    client = UserSerializer(read_only=True)
    guide = UserSerializer(read_only=True)
    service_name = serializers.CharField(
        source="requested_service.name", read_only=True
    )

    class Meta:
        model = BookingRequest
        fields = [
            "id",
            "client",
            "guide",
            "requested_service",
            "service_name",
            "requested_date",
            "requested_end_date",
            "requested_adults",
            "requested_children",
            "requested_notes",
            "counter_date",
            "counter_end_date",
            "counter_price",
            "counter_notes",
            "status",
            "responded_at",
            "expires_at",
            "created_at",
        ]
        read_only_fields = ["id", "responded_at", "expires_at", "created_at"]


class BookingRequestResponseSerializer(serializers.Serializer):
    """
    Serializer for guide response to booking request
    """

    action = serializers.ChoiceField(choices=["accept", "reject", "counter"])
    counter_date = serializers.DateTimeField(required=False)
    counter_end_date = serializers.DateTimeField(required=False)
    counter_price = serializers.DecimalField(
        max_digits=8, decimal_places=2, required=False
    )
    counter_notes = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        """Validate response data"""
        action = attrs.get("action")

        if action == "counter":
            if not attrs.get("counter_date"):
                raise serializers.ValidationError(
                    {"counter_date": "Counter taklif uchun sana talab qilinadi."}
                )
            if not attrs.get("counter_price"):
                raise serializers.ValidationError(
                    {"counter_price": "Counter taklif uchun narx talab qilinadi."}
                )

        return attrs


class BookingSerializer(serializers.ModelSerializer):
    """
    Serializer for booking details
    """

    client = UserSerializer(read_only=True)
    guide = UserSerializer(read_only=True)
    service_name = serializers.CharField(source="service.name", read_only=True)
    duration_hours = serializers.ReadOnlyField()
    duration_days = serializers.ReadOnlyField()

    class Meta:
        model = Booking
        fields = [
            "id",
            "client",
            "guide",
            "service",
            "service_name",
            "title",
            "description",
            "start_date",
            "end_date",
            "duration_type",
            "adults_count",
            "children_count",
            "hourly_rate",
            "daily_rate",
            "total_amount",
            "status",
            "notes",
            "is_paid",
            "payment_date",
            "confirmed_at",
            "started_at",
            "completed_at",
            "cancelled_at",
            "duration_hours",
            "duration_days",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "confirmed_at",
            "started_at",
            "completed_at",
            "cancelled_at",
            "created_at",
        ]


class BookingCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating bookings directly
    """

    class Meta:
        model = Booking
        fields = [
            "guide",
            "service",
            "title",
            "description",
            "start_date",
            "end_date",
            "duration_type",
            "adults_count",
            "children_count",
            "notes",
        ]

    def validate_start_date(self, value):
        """Validate start date is in future"""
        if value <= timezone.now():
            raise serializers.ValidationError(
                "Boshlanish sanasi hozirgi vaqtdan keyin bo'lishi kerak."
            )
        return value

    def validate(self, attrs):
        """Validate booking data"""
        start_date = attrs.get("start_date")
        end_date = attrs.get("end_date")
        guide = attrs.get("guide")

        if end_date <= start_date:
            raise serializers.ValidationError(
                {"end_date": "Tugash sanasi boshlanish sanasidan keyin bo'lishi kerak."}
            )

        if guide.role != "Guide":
            raise serializers.ValidationError(
                {"guide": "Tanlangan foydalanuvchi gid emas."}
            )

        return attrs

    def create(self, validated_data):
        """Create booking with calculated pricing"""
        validated_data["client"] = self.context["request"].user

        # Get guide's rates
        guide = validated_data["guide"]
        try:
            guide_profile = guide.guide_profile
            duration_type = validated_data["duration_type"]

            if duration_type == "hourly" and guide_profile.hourly_rate:
                validated_data["hourly_rate"] = guide_profile.hourly_rate
                # Calculate total based on hours
                hours = (
                    validated_data["end_date"] - validated_data["start_date"]
                ).total_seconds() / 3600
                validated_data["total_amount"] = guide_profile.hourly_rate * hours
            elif duration_type == "daily" and guide_profile.daily_rate:
                validated_data["daily_rate"] = guide_profile.daily_rate
                # Calculate total based on days
                days = (
                    validated_data["end_date"].date()
                    - validated_data["start_date"].date()
                ).days + 1
                validated_data["total_amount"] = guide_profile.daily_rate * days
            else:
                raise serializers.ValidationError(
                    "Gid uchun tegishli narx mavjud emas."
                )

        except AttributeError:
            raise serializers.ValidationError("Gid profili topilmadi.")

        return super().create(validated_data)


class BookingUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating booking status
    """

    class Meta:
        model = Booking
        fields = ["status", "notes"]

    def validate_status(self, value):
        """Validate status transitions"""
        instance = self.instance
        current_status = instance.status

        # Define allowed transitions
        allowed_transitions = {
            "Pending": ["Confirmed", "Cancelled"],
            "Confirmed": ["In Progress", "Cancelled"],
            "In Progress": ["Completed", "Cancelled"],
            "Completed": [],  # Final state
            "Cancelled": [],  # Final state
            "Disputed": ["Completed", "Cancelled"],
        }

        if value not in allowed_transitions.get(current_status, []):
            raise serializers.ValidationError(
                f"'{current_status}' holatidan '{value}' holatiga o'tish mumkin emas."
            )

        return value

    def update(self, instance, validated_data):
        """Update booking with status timestamps"""
        new_status = validated_data.get("status")

        if new_status and new_status != instance.status:
            now = timezone.now()

            if new_status == "Confirmed":
                instance.confirmed_at = now
            elif new_status == "In Progress":
                instance.started_at = now
            elif new_status == "Completed":
                instance.completed_at = now
            elif new_status == "Cancelled":
                instance.cancelled_at = now

        return super().update(instance, validated_data)


class BookingUpdateHistorySerializer(serializers.ModelSerializer):
    """
    Serializer for booking update history
    """

    updated_by = UserSerializer(read_only=True)

    class Meta:
        model = BookingUpdate
        fields = ["id", "updated_by", "old_status", "new_status", "notes", "created_at"]
        read_only_fields = ["id", "created_at"]
