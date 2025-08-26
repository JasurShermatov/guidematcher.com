from typing import List
import uuid

from rest_framework import serializers

from apps.bookings.models import Booking
from apps.profiles.models import CustomerProfile, ClientProfile
from apps.users.models import User


# UUID Safety Mixin
class UUIDSafeMixin:
    """Mixin to handle UUID serialization safely"""

    def to_representation(self, instance):
        data = super().to_representation(instance)
        return self._convert_uuids_to_strings(data)

    def _convert_uuids_to_strings(self, data):
        """Recursively convert UUIDs to strings"""
        if isinstance(data, dict):
            return {key: self._convert_uuid_value(value) for key, value in data.items()}
        elif isinstance(data, list):
            return [self._convert_uuid_value(item) for item in data]
        else:
            return self._convert_uuid_value(data)

    def _convert_uuid_value(self, value):
        """Convert single value if UUID"""
        if isinstance(value, uuid.UUID):
            return str(value)
        elif isinstance(value, (dict, list)):
            return self._convert_uuids_to_strings(value)
        return value


class UserSimpleSerializer(UUIDSafeMixin, serializers.ModelSerializer):
    """Simple user info for front-end display"""

    full_name = serializers.CharField(read_only=True)
    email = serializers.EmailField()
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "full_name", "email", "avatar_url"]

    def get_avatar_url(self, obj):
        try:
            if hasattr(obj, "avatar") and obj.avatar:
                return obj.avatar.url
        except Exception:
            pass
        return None


class ClientProfileSerializer(UUIDSafeMixin, serializers.ModelSerializer):
    user = UserSimpleSerializer(read_only=True)

    class Meta:
        model = ClientProfile
        fields = ["id", "user"]


class CustomerProfileSerializer(UUIDSafeMixin, serializers.ModelSerializer):
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
        try:
            dates = Booking.objects.get_customer_busy_dates(obj)
            return [d.isoformat() for d in sorted(dates)]
        except Exception:
            return []


class BookingSerializer(UUIDSafeMixin, serializers.ModelSerializer):
    customer_details = serializers.SerializerMethodField()
    client_details = serializers.SerializerMethodField()
    busy_dates = serializers.SerializerMethodField()
    can_accept = serializers.SerializerMethodField()
    can_update = serializers.SerializerMethodField()
    can_cancel = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        exclude = ["conversation_id"]
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
        """FIXED: Safe customer details with UUID conversion"""
        try:
            return {
                "id": str(obj.customer_profile.id),  # UUID to string
                "full_name": obj.customer_profile.user.full_name,
                "city": (
                    obj.customer_profile.city.name
                    if obj.customer_profile.city
                    else None
                ),
                "country": (
                    str(obj.customer_profile.country)
                    if obj.customer_profile.country
                    else None
                ),
                "rating": float(obj.customer_profile.average_rating or 0),
            }
        except Exception:
            return {
                "id": None,
                "full_name": "Unknown",
                "city": None,
                "country": None,
                "rating": 0.0,
            }

    def get_client_details(self, obj):
        """FIXED: Safe client details with UUID conversion"""
        try:
            if obj.client_profile:
                return {
                    "id": str(obj.client_profile.id),  # UUID to string
                    "full_name": obj.client_profile.user.full_name,
                    "email": obj.client_profile.user.email,
                }
        except Exception:
            pass
        return None

    def get_busy_dates(self, obj) -> List[str]:
        """Return dates as strings for JSON"""
        try:
            dates = Booking.objects.get_customer_busy_dates(obj.customer_profile)
            return [d.isoformat() for d in sorted(dates)]
        except Exception:
            return []

    def get_can_accept(self, obj) -> bool:
        try:
            request = self.context.get("request")
            if not request or not request.user.is_authenticated:
                return False
            return (
                obj.can_accept
                and hasattr(request.user, "customerprofile")
                and str(obj.customer_profile_id) == str(request.user.customerprofile.id)
            )
        except Exception:
            return False

    def get_can_update(self, obj) -> bool:
        try:
            request = self.context.get("request")
            if not request or not request.user.is_authenticated:
                return False
            return (
                obj.can_update
                and hasattr(request.user, "customerprofile")
                and str(obj.customer_profile_id) == str(request.user.customerprofile.id)
            )
        except Exception:
            return False

    def get_can_cancel(self, obj) -> bool:
        try:
            request = self.context.get("request")
            if not request or not request.user.is_authenticated:
                return False

            # Both parties can cancel
            if hasattr(request.user, "customerprofile"):
                return obj.can_cancel and str(obj.customer_profile_id) == str(
                    request.user.customerprofile.id
                )
            elif hasattr(request.user, "clientprofile") and obj.client_profile:
                return obj.can_cancel and str(obj.client_profile_id) == str(
                    request.user.clientprofile.id
                )
        except Exception:
            pass
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
                try:
                    if not Booking.objects.check_availability(
                        customer,
                        data["start_date"],
                        data["end_date"],
                        exclude_booking=instance,
                    ):
                        raise serializers.ValidationError(
                            "Customer is not available for selected dates"
                        )
                except Exception:
                    # Continue if availability check fails
                    pass

        return data

    def create(self, validated_data):
        """Create with safe client profile assignment"""
        try:
            # Client profile avtomatik qo'shish
            if "client_profile" not in validated_data:
                user = self.context.get("request").user
                if hasattr(user, "clientprofile"):
                    validated_data["client_profile"] = user.clientprofile
        except Exception:
            pass
        return super().create(validated_data)


class BookingChatCreateSerializer(serializers.Serializer):
    """Chat orqali booking yaratish"""

    customer_profile_id = serializers.CharField()  # UUID as string
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

    def validate_customer_profile_id(self, value):
        """Validate customer profile ID"""
        try:
            customer = CustomerProfile.objects.get(id=value)
            return customer
        except (CustomerProfile.DoesNotExist, ValueError):
            raise serializers.ValidationError("Customer not found")

    def validate(self, data):
        # Customer already validated in validate_customer_profile_id
        customer = data["customer_profile_id"]  # This is now CustomerProfile instance
        data["customer_profile"] = customer

        # Vaqt tekshirish
        if data["start_date"] > data["end_date"]:
            raise serializers.ValidationError("End date must be after start date")

        # Customer bo'shmi
        try:
            if hasattr(Booking.objects, "check_availability"):
                if not Booking.objects.check_availability(
                    customer, data["start_date"], data["end_date"]
                ):
                    raise serializers.ValidationError(
                        "Customer is not available for these dates"
                    )
        except Exception:
            pass  # Continue if availability check fails

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
        if booking:
            try:
                if hasattr(Booking.objects, "check_availability"):
                    if not Booking.objects.check_availability(
                        booking.customer_profile,
                        data["start_date"],
                        data["end_date"],
                        exclude_booking=booking,
                    ):
                        raise serializers.ValidationError(
                            "Customer is not available for new dates"
                        )
            except Exception:
                pass

        return data


class CustomerSearchSerializer(serializers.Serializer):

    country = serializers.CharField(required=True)
    city = serializers.CharField(required=False, allow_blank=True)
    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)
    service_type = serializers.CharField(required=False)
    min_rating = serializers.FloatField(required=False, min_value=0, max_value=5)
