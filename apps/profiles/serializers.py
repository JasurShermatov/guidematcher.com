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
from apps.common.models import Language, ServiceType


# ================== CLIENT SERIALIZERS ==================
class ClientProfileCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Client profil yaratish/yangilash uchun
    """

    languages = serializers.PrimaryKeyRelatedField(
        queryset=Language.objects.all(), many=True, required=False
    )

    class Meta:
        model = ClientProfile
        fields = ["date_of_birth", "preferred_contact", "languages"]

    def update(self, instance, validated_data):
        languages = validated_data.pop("languages", None)
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        if languages is not None:
            instance.languages.set(languages)
        return instance


class ClientProfileSerializer(serializers.ModelSerializer):
    user = UserShortSerializer(read_only=True)
    full_name = serializers.CharField(source="user.full_name", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    profile_id = serializers.IntegerField(source="id", read_only=True)

    class Meta:
        model = ClientProfile
        fields = [
            "id",
            "user",
            "full_name",
            "email",
            "profile_id",
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


class ClientProfileShortSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="user.full_name", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = ClientProfile
        fields = ["id", "full_name", "email", "preferred_contact"]


# ================== CUSTOMER SERIALIZERS ==================
class CustomerProfileCreateUpdateSerializer(serializers.ModelSerializer):
    languages = serializers.PrimaryKeyRelatedField(
        queryset=Language.objects.all(), many=True, required=False
    )
    service_types = serializers.PrimaryKeyRelatedField(
        queryset=ServiceType.objects.all(), many=True, required=False
    )

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

    def validate_years_of_experience(self, value):
        if value < 0:
            raise serializers.ValidationError("Years of experience cannot be negative.")
        return value

    def validate_hourly_rate(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Hourly rate cannot be negative.")
        return value

    def validate_daily_rate(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Daily rate cannot be negative.")
        return value

    def update(self, instance, validated_data):
        languages = validated_data.pop("languages", None)
        service_types = validated_data.pop("service_types", None)
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        if languages is not None:
            instance.languages.set(languages)
        if service_types is not None:
            instance.service_types.set(service_types)
        return instance


class CustomerProfileSerializer(serializers.ModelSerializer):
    user = UserShortSerializer(read_only=True)
    full_name = serializers.CharField(source="user.full_name", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    profile_id = serializers.IntegerField(source="id", read_only=True)
    city_name = serializers.CharField(source="city.name", read_only=True)
    country_name = serializers.CharField(source="user.country_name", read_only=True)

    class Meta:
        model = CustomerProfile
        fields = [
            "id",
            "user",
            "full_name",
            "email",
            "profile_id",
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


class CustomerProfileShortSerializer(serializers.ModelSerializer):
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


# ================== PORTFOLIO SERIALIZERS ==================
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


# ================== VERIFICATION DOCUMENT SERIALIZERS ==================
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


# ================== AVAILABILITY SERIALIZERS ==================
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

    def validate_date(self, value):
        user = self.context["request"].user
        try:
            customer = user.customerprofile
        except CustomerProfile.DoesNotExist:
            raise serializers.ValidationError("You don't have a customer profile yet.")
        if Availability.objects.filter(customer=customer, date=value).exists():
            raise serializers.ValidationError(
                f"Availability for {value} already exists."
            )
        return value

    def create(self, validated_data):
        user = self.context["request"].user
        customer = user.customerprofile
        validated_data["customer"] = customer
        return super().create(validated_data)
