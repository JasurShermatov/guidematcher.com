from rest_framework import serializers
from django.contrib.auth import authenticate
from django.utils import timezone
from .models import User, EmailVerification, LoginAttempt
from apps.common.serializers import CountrySerializer, CitySerializer
from apps.common.validators import validate_phone_code


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for User model
    """

    country = CountrySerializer(read_only=True)
    country_id = serializers.UUIDField(write_only=True, required=False)
    city = CitySerializer(read_only=True)
    city_id = serializers.UUIDField(write_only=True, required=False)
    phone = serializers.CharField(validators=[validate_phone_code], required=False)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "role",
            "country",
            "country_id",
            "city",
            "city_id",
            "phone",
            "profile_picture",
            "bio",
            "is_active",
            "is_verified",
            "date_joined",
        ]
        read_only_fields = [
            "id",
            "is_active",
            "is_verified",
            "date_joined",
            "created_at",
            "updated_at",
        ]

    def validate(self, data):
        """
        Validate country and city relationship
        """
        country_id = data.get("country_id")
        city_id = data.get("city_id")
        if city_id and not country_id:
            raise serializers.ValidationError(
                "Shahar tanlanganda mamlakat ham ko'rsatilishi kerak."
            )
        if country_id and not self.context["request"].user.is_staff:
            from apps.common.models import Country

            if not Country.objects.filter(id=country_id, is_active=True).exists():
                raise serializers.ValidationError("Mamlakat topilmadi yoki faol emas.")
        if city_id:
            from apps.common.models import City

            if not City.objects.filter(
                id=city_id, country_id=country_id, is_active=True
            ).exists():
                raise serializers.ValidationError(
                    "Shahar topilmadi yoki mamlakatga mos kelmaydi."
                )
        return data


class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration
    """

    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)
    country_id = serializers.UUIDField(required=False)
    city_id = serializers.UUIDField(required=False)
    phone = serializers.CharField(validators=[validate_phone_code], required=False)

    class Meta:
        model = User
        fields = [
            "email",
            "password",
            "confirm_password",
            "first_name",
            "last_name",
            "role",
            "country_id",
            "city_id",
            "phone",
            "profile_picture",
            "bio",
        ]

    def validate(self, data):
        """
        Validate registration data
        """
        if data["password"] != data["confirm_password"]:
            raise serializers.ValidationError("Parollar mos kelmadi.")
        if User.objects.filter(email=data["email"]).exists():
            raise serializers.ValidationError("Bu email allaqachon ro'yxatdan o'tgan.")
        return data

    def create(self, validated_data):
        """
        Create a new user
        """
        validated_data.pop("confirm_password")
        country_id = validated_data.pop("country_id", None)
        city_id = validated_data.pop("city_id", None)
        user = User.objects.create_user(**validated_data)
        if country_id:
            from apps.common.models import Country

            user.country = Country.objects.get(id=country_id).name
        if city_id:
            from apps.common.models import City

            user.city = City.objects.get(id=city_id).name
        user.save()
        return user


class UserLoginSerializer(serializers.Serializer):
    """
    Serializer for user login
    """

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        """
        Validate login credentials
        """
        user = authenticate(email=data["email"], password=data["password"])
        if user and user.is_active:
            return user
        raise serializers.ValidationError("Noto'g'ri email yoki parol.")


class EmailVerificationSerializer(serializers.ModelSerializer):
    """
    Serializer for EmailVerification model
    """

    class Meta:
        model = EmailVerification
        fields = ["token", "is_used", "expires_at", "created_at"]
        read_only_fields = ["is_used", "expires_at", "created_at", "updated_at"]

    def validate_token(self, value):
        """
        Validate verification token
        """
        verification = EmailVerification.objects.filter(
            token=value, is_used=False
        ).first()
        if not verification:
            raise serializers.ValidationError("Noto'g'ri yoki ishlatilgan token.")
        if verification.is_expired():
            raise serializers.ValidationError("Tokenning amal qilish muddati tugagan.")
        return value


class LoginAttemptSerializer(serializers.ModelSerializer):
    """
    Serializer for LoginAttempt model
    """

    class Meta:
        model = LoginAttempt
        fields = ["email", "ip_address", "success", "user_agent", "created_at"]
        read_only_fields = ["created_at", "updated_at"]
