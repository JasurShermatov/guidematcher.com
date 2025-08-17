from rest_framework import serializers
from apps.users.serializers import UserShortSerializer
from .models import (
    ClientProfile,
    CustomerProfile,
    Portfolio,
    VerificationDocument,
    Availability,
)


class ClientProfileSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = ClientProfile
        fields = "__all__"
        read_only_fields = ["user"]


class CustomerProfileSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = CustomerProfile
        fields = "__all__"
        read_only_fields = [
            "user",
            "verification_status",
            "verification_date",
            "verification_notes",
        ]


class PortfolioSerializer(serializers.ModelSerializer):
    customer = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Portfolio
        fields = "__all__"
        read_only_fields = ["customer"]


class VerificationDocumentSerializer(serializers.ModelSerializer):
    customer = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = VerificationDocument
        fields = "__all__"
        read_only_fields = ["customer", "is_verified", "verified_by", "verified_at"]


class AvailabilitySerializer(serializers.ModelSerializer):
    customer = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Availability
        fields = "__all__"
        read_only_fields = ["customer"]


class CustomerProfileShortSerializer(serializers.ModelSerializer):
    user = UserShortSerializer(read_only=True)
    average_rating = serializers.DecimalField(
        max_digits=3, decimal_places=2, read_only=True
    )

    class Meta:
        model = CustomerProfile
        fields = ("id", "user", "average_rating", "is_verified")
        read_only_fields = ("id", "user", "average_rating", "is_verified")
