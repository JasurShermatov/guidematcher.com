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
    client_profile = serializers.PrimaryKeyRelatedField(
        queryset=ClientProfile.objects.all(),
        required=False,
    )
    customer_profile = serializers.PrimaryKeyRelatedField(
        queryset=CustomerProfile.objects.all()
    )
    customer_details = CustomerProfileSerializer(
        source="customer_profile", read_only=True
    )
    client_details = ClientProfileSerializer(source="client_profile", read_only=True)
    is_customer_available = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = "__all__"
        read_only_fields = (
            "id",
            "created_at",
            "updated_at",
            "conversation",
            "previous_start_date",
            "previous_end_date",
            "updated_count",
        )

    def get_is_customer_available(self, obj):
        """Customer bu vaqtda bo'shmi"""
        if obj.start_date and obj.end_date:
            return Booking.objects.is_customer_available(
                obj.customer_profile, obj.start_date, obj.end_date
            )
        return None

    def validate(self, data):
        """Validate booking dates"""
        if "start_date" in data and "end_date" in data:
            if data["start_date"] > data["end_date"]:
                raise serializers.ValidationError("End date must be after start date")

            # Customer bo'shmi tekshirish
            customer = data.get("customer_profile")
            if customer and not Booking.objects.is_customer_available(
                customer, data["start_date"], data["end_date"]
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
