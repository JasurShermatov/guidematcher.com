# apps/profiles/serializers.py
from rest_framework import serializers
from apps.users.serializers import UserShortSerializer
from .models import (
    ClientProfile,
    CustomerProfile,
    Portfolio,
    VerificationDocument,
    Availability,
)


# === CLIENT SERIALIZERS ===
class ClientProfileSerializer(serializers.ModelSerializer):
    """
    Client uchun oddiy serializer - faqat kerakli ma'lumotlar
    """

    user = UserShortSerializer(read_only=True)
    full_name = serializers.CharField(source="user.full_name", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = ClientProfile
        fields = [
            "id",
            "user",
            "full_name",
            "email",
            "date_of_birth",
            "preferred_contact",
            "languages",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "user",
            "full_name",
            "email",
            "created_at",
            "updated_at",
        ]


class ClientProfileCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Client profil yaratish/yangilash uchun
    """

    class Meta:
        model = ClientProfile
        fields = ["date_of_birth", "preferred_contact", "languages"]


class ClientProfileShortSerializer(serializers.ModelSerializer):
    """
    Client ning qisqa ma'lumotlari
    """

    full_name = serializers.CharField(source="user.full_name", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = ClientProfile
        fields = ["id", "full_name", "email", "preferred_contact"]


# === CUSTOMER SERIALIZERS ===
class CustomerProfileSerializer(serializers.ModelSerializer):
    """
    Customer uchun to'liq serializer
    """

    user = UserShortSerializer(read_only=True)
    full_name = serializers.CharField(source="user.full_name", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    city_name = serializers.CharField(source="city.name", read_only=True)
    country_name = serializers.CharField(source="user.country_name", read_only=True)

    class Meta:
        model = CustomerProfile
        fields = [
            "id",
            "user",
            "full_name",
            "email",
            "country_name",
            "professional_bio",
            "years_of_experience",
            "service_types",
            "city",
            "city_name",
            "service_areas",
            "hourly_rate",
            "daily_rate",
            "currency",
            "languages",
            "verification_status",
            "verification_date",
            "total_bookings",
            "total_reviews",
            "average_rating",
            "is_available",
            "is_verified",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "user",
            "full_name",
            "email",
            "country_name",
            "city_name",
            "verification_status",
            "verification_date",
            "total_bookings",
            "total_reviews",
            "average_rating",
            "is_verified",
            "created_at",
            "updated_at",
        ]


class CustomerProfileCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Customer profil yaratish/yangilash uchun
    """

    class Meta:
        model = CustomerProfile
        fields = [
            "professional_bio",
            "years_of_experience",
            "service_types",
            "city",
            "service_areas",
            "hourly_rate",
            "daily_rate",
            "currency",
            "languages",
            "is_available",
        ]


class CustomerProfileShortSerializer(serializers.ModelSerializer):
    """
    Customer ning qisqa ma'lumotlari (search results uchun)
    """

    user = UserShortSerializer(read_only=True)
    city_name = serializers.CharField(source="city.name", read_only=True)

    class Meta:
        model = CustomerProfile
        fields = [
            "id",
            "user",
            "city_name",
            "average_rating",
            "is_verified",
            "hourly_rate",
            "is_available",
        ]
        read_only_fields = ["id", "user", "city_name", "average_rating", "is_verified"]


# === PORTFOLIO SERIALIZERS ===
class PortfolioSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(
        source="customer.user.full_name", read_only=True
    )

    class Meta:
        model = Portfolio
        fields = [
            "id",
            "customer",
            "customer_name",
            "image",
            "title",
            "description",
            "order",
            "created_at",
        ]
        read_only_fields = ["id", "customer", "customer_name", "created_at"]


# === VERIFICATION DOCUMENT SERIALIZERS ===
class VerificationDocumentSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(
        source="customer.user.full_name", read_only=True
    )
    verified_by_name = serializers.CharField(
        source="verified_by.full_name", read_only=True
    )

    class Meta:
        model = VerificationDocument
        fields = [
            "id",
            "customer",
            "customer_name",
            "document_type",
            "file",
            "description",
            "is_verified",
            "verified_by",
            "verified_by_name",
            "verified_at",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "customer",
            "customer_name",
            "is_verified",
            "verified_by",
            "verified_by_name",
            "verified_at",
            "created_at",
        ]


# === AVAILABILITY SERIALIZERS ===
class AvailabilitySerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(
        source="customer.user.full_name", read_only=True
    )

    class Meta:
        model = Availability
        fields = [
            "id",
            "customer",
            "customer_name",
            "date",
            "is_available",
            "start_time",
            "end_time",
            "note",
            "created_at",
        ]
        read_only_fields = ["id", "customer", "customer_name", "created_at"]
