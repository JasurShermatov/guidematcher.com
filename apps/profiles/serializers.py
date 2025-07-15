from rest_framework import serializers

from apps.common.models import Language, ServiceType, City
from apps.profiles.models import (
    ClientProfile,
    CustomerProfile,
    Portfolio,
    VerificationDocument,
    Availability,
)
from apps.users.serializers import UserShortSerializer


# ─────────── helper serializers (readonly) ───────────
class LanguageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Language
        fields = ("code", "name", "native_name")


class ServiceTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceType
        fields = ("id", "name", "icon")


class CitySerializer(serializers.ModelSerializer):
    country_name = serializers.CharField(source="country.name", read_only=True)

    class Meta:
        model = City
        fields = ("id", "name", "country_name")


# ─────────── ClientProfile ───────────
class ClientProfileSerializer(serializers.ModelSerializer):
    user = UserShortSerializer(read_only=True)
    languages = LanguageSerializer(many=True, read_only=True)

    class Meta:
        model = ClientProfile
        fields = [
            "id",
            "user",
            "date_of_birth",
            "languages",
            "preferred_contact",
            "created_at",
        ]
        read_only_fields = ["id", "user", "created_at"]


# ─────────── Portfolio (nested) ───────────
class PortfolioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Portfolio
        fields = ("id", "image", "title", "description", "order", "created_at")
        read_only_fields = ("id", "created_at", "order")


# ─────────── VerificationDocument ───────────
class VerificationDocumentSerializer(serializers.ModelSerializer):
    document_type_display = serializers.CharField(
        source="get_document_type_display", read_only=True
    )
    is_verified = serializers.BooleanField(read_only=True)

    class Meta:
        model = VerificationDocument
        fields = [
            "id",
            "document_type",
            "document_type_display",
            "file",
            "description",
            "is_verified",
            "verified_by",
            "verified_at",
            "created_at",
        ]
        read_only_fields = (
            "id",
            "is_verified",
            "verified_by",
            "verified_at",
            "created_at",
        )


# ─────────── Availability ───────────
class AvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Availability
        fields = (
            "id",
            "date",
            "is_available",
            "start_time",
            "end_time",
            "note",
        )
        read_only_fields = ("id",)


# ─────────── CustomerProfile (to‘liq) ───────────
class CustomerProfileSerializer(serializers.ModelSerializer):
    user = UserShortSerializer(read_only=True)
    languages = LanguageSerializer(many=True, read_only=True)
    service_types = ServiceTypeSerializer(many=True, read_only=True)
    city = CitySerializer(read_only=True)
    portfolio_items = PortfolioSerializer(many=True, read_only=True)
    average_rating = serializers.DecimalField(
        max_digits=3, decimal_places=2, read_only=True
    )

    class Meta:
        model = CustomerProfile
        fields = [
            "id",
            "user",
            "professional_bio",
            "years_of_experience",
            "languages",
            "service_types",
            "city",
            "service_areas",
            "hourly_rate",
            "daily_rate",
            "currency",
            "verification_status",
            "is_verified",
            "average_rating",
            "total_reviews",
            "total_bookings",
            "is_available",
            "created_at",
            "portfolio_items",
        ]
        read_only_fields = (
            "id",
            "user",
            "verification_status",
            "average_rating",
            "total_reviews",
            "total_bookings",
            "created_at",
        )


# ─────────── SHORT variantlar (importlar uchun) ───────────
class CustomerProfileShortSerializer(serializers.ModelSerializer):
    user = UserShortSerializer(read_only=True)
    average_rating = serializers.DecimalField(
        max_digits=3, decimal_places=2, read_only=True
    )

    class Meta:
        model = CustomerProfile
        fields = ("id", "user", "average_rating", "is_verified")
        read_only_fields = ("id", "user", "average_rating", "is_verified")


class ClientProfileShortSerializer(serializers.ModelSerializer):
    user = UserShortSerializer(read_only=True)

    class Meta:
        model = ClientProfile
        fields = ("id", "user")
        read_only_fields = ("id", "user")


# ─────────── Modul eksportlari ───────────
__all__ = [
    # helper
    "LanguageSerializer",
    "ServiceTypeSerializer",
    "CitySerializer",
    # main
    "ClientProfileSerializer",
    "CustomerProfileSerializer",
    "PortfolioSerializer",
    "VerificationDocumentSerializer",
    "AvailabilitySerializer",
    # short
    "CustomerProfileShortSerializer",
    "ClientProfileShortSerializer",
]
