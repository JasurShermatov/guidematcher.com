# apps/bookings/serializers.py
from rest_framework import serializers

from apps.bookings.models import Booking
from apps.profiles.models import CustomerProfile, ClientProfile
from apps.users.models import User


class UserSimpleSerializer(serializers.ModelSerializer):
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

    class Meta:
        model = CustomerProfile
        fields = [
            "id",
            "user",
            "city",
            "service_areas",
            "is_available",
            "average_rating",
        ]


class BookingSerializer(serializers.ModelSerializer):
    """Write serializer (create/update)"""

    client_profile = serializers.PrimaryKeyRelatedField(
        queryset=ClientProfile.objects.all(),
        required=False,
    )
    customer_profile = serializers.PrimaryKeyRelatedField(
        queryset=CustomerProfile.objects.all()
    )

    class Meta:
        model = Booking
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at", "conversation")

    def create(self, validated_data):
        if "client_profile" not in validated_data:
            validated_data["client_profile"] = self.context[
                "request"
            ].user.clientprofile
        return super().create(validated_data)


class BookingReadSerializer(serializers.ModelSerializer):

    client_profile = ClientProfileSerializer(read_only=True)
    customer_profile = CustomerProfileSerializer(read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Booking
        fields = "__all__"
        read_only_fields = (
            "id",
            "status",
            "status_display",
            "created_at",
            "updated_at",
            "conversation",
        )


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
