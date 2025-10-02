# apps/profiles/serializers.py
from rest_framework import serializers

from apps.common.models import Language, ServiceType
from apps.users.serializers import UserShortSerializer
from .models import (
    ClientProfile,
    CustomerProfile,
    Portfolio,
    VerificationDocument,
    Unavailability,
)


class LanguageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Language
        fields = ["id", "name", "code", "native_name"]


class ServiceTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceType
        fields = ["id", "name"]


class ClientProfileCreateUpdateSerializer(serializers.ModelSerializer):

    languages = serializers.PrimaryKeyRelatedField(
        queryset=Language.objects.all(), many=True, required=False
    )

    class Meta:
        model = ClientProfile
        fields = ["date_of_birth", "preferred_contact", "languages", "avatar"]

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
    languages = LanguageSerializer(many=True, read_only=True)
    avatar_url = serializers.SerializerMethodField()

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
            "avatar",
            "avatar_url",
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

    def get_avatar_url(self, obj):
        if not obj.avatar:
            return None
        req = self.context.get("request")
        return req.build_absolute_uri(obj.avatar.url) if req else obj.avatar.url


class ClientProfileShortSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="user.full_name", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = ClientProfile
        fields = ["id", "full_name", "email", "preferred_contact", "avatar"]


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
            "avatar",
        ]

    def validate_years_of_experience(self, value):
        if value is not None and value < 0:
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

    def create(self, validated_data):
        languages = validated_data.pop("languages", [])
        service_types = validated_data.pop("service_types", [])
        instance = super().create(validated_data)
        if languages:
            instance.languages.set(languages)
        if service_types:
            instance.service_types.set(service_types)
        return instance

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
    country_name = serializers.CharField(source="country", read_only=True)

    languages = LanguageSerializer(many=True, read_only=True)
    service_types = ServiceTypeSerializer(many=True, read_only=True)

    member_since = serializers.DateField(read_only=True)
    member_since_year = serializers.IntegerField(read_only=True)

    avatar_url = serializers.SerializerMethodField()

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
            "member_since",
            "member_since_year",
            "avatar",
            "avatar_url",
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
            "member_since",
            "member_since_year",
            "avatar_url",
            "created_at",
            "updated_at",
        ]

    def get_avatar_url(self, obj):
        if not obj.avatar:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.avatar.url) if request else obj.avatar.url


class CustomerProfileShortSerializer(serializers.ModelSerializer):
    user = UserShortSerializer(read_only=True)
    city_name = serializers.CharField(source="city.name", read_only=True)
    avatar_url = serializers.SerializerMethodField()
    member_since_year = serializers.IntegerField(read_only=True)

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
            "avatar_url",
            "member_since_year",
        ]
        read_only_fields = [
            "id",
            "user",
            "city_name",
            "average_rating",
            "is_verified",
            "avatar_url",
            "member_since_year",
        ]

    def get_avatar_url(self, obj):
        if not obj.avatar:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.avatar.url) if request else obj.avatar.url


class PortfolioSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(
        source="customer.user.full_name", read_only=True
    )
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Portfolio
        fields = [
            "id",
            "customer",
            "customer_name",
            "image",
            "image_url",
            "title",
            "description",
            "order",
            "created_at",
        ]
        read_only_fields = ["id", "customer", "customer_name", "created_at"]

    def get_image_url(self, obj):
        if not obj.image:
            return None
        req = self.context.get("request")
        return req.build_absolute_uri(obj.image.url) if req else obj.image.url

    def create(self, validated_data):
        user = self.context["request"].user
        customer = getattr(user, "customerprofile", None)
        if not customer:
            raise serializers.ValidationError("You don't have a customer profile yet.")
        validated_data["customer"] = customer
        return super().create(validated_data)


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


class UnavailabilitySerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(
        source="customer.user.full_name", read_only=True
    )

    class Meta:
        model = Unavailability
        fields = [
            "id",
            "customer",
            "customer_name",
            "start_date",
            "end_date",
            "reason",
            "created_at",
        ]
        read_only_fields = ["id", "customer", "customer_name", "created_at"]

    def validate(self, data):
        user = self.context["request"].user
        try:
            customer = user.customerprofile
        except CustomerProfile.DoesNotExist:
            raise serializers.ValidationError("You don't have a customer profile yet.")

        start_date = data.get("start_date")
        end_date = data.get("end_date")

        if end_date < start_date:
            raise serializers.ValidationError(
                {"end_date": "End date cannot be earlier than start date."}
            )

        # Overlap check
        if Unavailability.objects.filter(
            customer=customer,
            start_date__lte=end_date,
            end_date__gte=start_date,
        ).exists():
            raise serializers.ValidationError(
                "You already have an unavailability period overlapping this date range."
            )

        return data

    def create(self, validated_data):
        user = self.context["request"].user
        customer = user.customerprofile
        validated_data["customer"] = customer
        return super().create(validated_data)
