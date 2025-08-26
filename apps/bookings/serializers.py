from typing import List

from rest_framework import serializers

from apps.bookings.models import Booking
from apps.profiles.models import CustomerProfile, ClientProfile
from apps.users.models import User


class UserSimpleSerializer(serializers.ModelSerializer):
    """Simple user info for front-end display"""

    full_name = serializers.CharField(read_only=True)
    email = serializers.EmailField()
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "full_name", "email", "avatar_url"]

    def get_avatar_url(self, obj):
        if hasattr(obj, "avatar") and obj.avatar:
            return obj.avatar.url
        return None


class ClientProfileSerializer(serializers.ModelSerializer):
    user = UserSimpleSerializer(read_only=True)

    class Meta:
        model = ClientProfile
        fields = ["id", "user"]


class CustomerProfileSerializer(serializers.ModelSerializer):
    user = UserSimpleSerializer(read_only=True)
    busy_dates = serializers.SerializerMethodField()

    class Meta:
        model = CustomerProfile
        fields = [
            "id",
            "user",
            "city",
            "country",
            "service_areas",
            "is_available",
            "average_rating",
            "busy_dates",
        ]

    def get_busy_dates(self, obj):
        """Customer ning band kunlarini olish"""
        return Booking.objects.get_customer_busy_dates(obj)


class BookingSerializer(serializers.ModelSerializer):
    customer_details = serializers.SerializerMethodField()
    client_details = serializers.SerializerMethodField()
    busy_dates = serializers.SerializerMethodField()
    can_accept = serializers.SerializerMethodField()
    can_update = serializers.SerializerMethodField()
    can_cancel = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        exclude = ["conversation_id"]  # Hide internal field
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "previous_start_date",
            "previous_end_date",
            "updated_count",
            "accepted_at",
            "cancelled_at",
        ]

    def get_customer_details(self, obj):
        return {
            "id": obj.customer_profile.id,
            "full_name": obj.customer_profile.user.full_name,
            "city": (
                obj.customer_profile.city.name if obj.customer_profile.city else None
            ),
            "country": (
                str(obj.customer_profile.country)
                if obj.customer_profile.country
                else None
            ),
            "rating": float(obj.customer_profile.average_rating),
        }

    def get_client_details(self, obj):
        if obj.client_profile:
            return {
                "id": obj.client_profile.id,
                "full_name": obj.client_profile.user.full_name,
                "email": obj.client_profile.user.email,
            }
        return None

    def get_busy_dates(self, obj) -> List[str]:
        """Return dates as strings for JSON"""
        dates = Booking.objects.get_customer_busy_dates(obj.customer_profile)
        return [d.isoformat() for d in sorted(dates)]

    def get_can_accept(self, obj) -> bool:
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return (
            obj.can_accept
            and hasattr(request.user, "customerprofile")
            and obj.customer_profile_id == request.user.customerprofile.id
        )

    def get_can_update(self, obj) -> bool:
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return (
            obj.can_update
            and hasattr(request.user, "customerprofile")
            and obj.customer_profile_id == request.user.customerprofile.id
        )

    def get_can_cancel(self, obj) -> bool:
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False

        # Both parties can cancel
        if hasattr(request.user, "customerprofile"):
            return (
                obj.can_cancel
                and obj.customer_profile_id == request.user.customerprofile.id
            )
        elif hasattr(request.user, "clientprofile") and obj.client_profile:
            return (
                obj.can_cancel
                and obj.client_profile_id == request.user.clientprofile.id
            )

        return False

    def validate(self, data):
        """Enhanced validation"""
        if "start_date" in data and "end_date" in data:
            if data["start_date"] > data["end_date"]:
                raise serializers.ValidationError("End date must be after start date")

            # Check duration limit
            duration = (data["end_date"] - data["start_date"]).days
            if duration > 365:
                raise serializers.ValidationError("Booking cannot exceed 365 days")

            # Check availability
            customer = data.get("customer_profile")
            if customer:
                instance = self.instance  # For update
                if not Booking.objects.check_availability(
                    customer,
                    data["start_date"],
                    data["end_date"],
                    exclude_booking=instance,
                ):
                    raise serializers.ValidationError(
                        "Customer is not available for selected dates"
                    )

        return data

    def create(self, validated_data):
        # Client profile avtomatik qo'shish
        if "client_profile" not in validated_data:
            validated_data["client_profile"] = self.context[
                "request"
            ].user.client_profile
        return super().create(validated_data)


class BookingChatCreateSerializer(serializers.Serializer):
    """Chat orqali booking yaratish"""

    customer_profile_id = serializers.IntegerField()
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    country = serializers.CharField(max_length=100)
    city = serializers.CharField(max_length=100, required=False)
    title = serializers.CharField(max_length=255, required=False)
    description = serializers.CharField(required=False)
    location = serializers.CharField(max_length=255, required=False)
    proposed_rate = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False
    )

    def validate(self, data):
        # Customer mavjudligini tekshirish
        try:
            customer = CustomerProfile.objects.get(id=data["customer_profile_id"])
            data["customer_profile"] = customer
        except CustomerProfile.DoesNotExist:
            raise serializers.ValidationError("Customer not found")

        # Vaqt tekshirish
        if data["start_date"] > data["end_date"]:
            raise serializers.ValidationError("End date must be after start date")

        # Customer bo'shmi
        if not Booking.objects.is_customer_available(
            customer, data["start_date"], data["end_date"]
        ):
            raise serializers.ValidationError(
                "Customer is not available for these dates"
            )

        return data


class BookingUpdateDatesSerializer(serializers.Serializer):
    """Booking vaqtini yangilash"""

    start_date = serializers.DateField()
    end_date = serializers.DateField()

    def validate(self, data):
        if data["start_date"] > data["end_date"]:
            raise serializers.ValidationError("End date must be after start date")

        # Customer bo'shmi tekshirish
        booking = self.context.get("booking")
        if booking and not Booking.objects.is_customer_available(
            booking.customer_profile, data["start_date"], data["end_date"]
        ):
            raise serializers.ValidationError("Customer is not available for new dates")

        return data


class CustomerSearchSerializer(serializers.Serializer):
    """Customer qidirish uchun"""

    country = serializers.CharField(required=True)
    city = serializers.CharField(required=False, allow_blank=True)
    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)
    service_type = serializers.CharField(required=False)
    min_rating = serializers.FloatField(required=False, min_value=0, max_value=5)
