# apps/users/serializers.py
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests

User = get_user_model()


class AuthTokenSerializer(TokenObtainPairSerializer):

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["email"] = user.email
        token["full_name"] = user.full_name
        token["avatar"] = user.avatar.url if user.avatar else None
        return token


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    role = serializers.ChoiceField(
        choices=User.UserRole.choices,
        default=User.UserRole.CLIENT,
        required=False,
    )

    class Meta:
        model = User
        fields = ("email", "first_name", "last_name", "password", "role", "country")

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User.objects.create_user(password=password, **validated_data)
        user.is_active = True
        user.save()

        # cache update
        from django.core.cache import cache

        cache.set(f"user:{user.pk}", user, timeout=3600)

        if not user.is_verified:
            try:
                from apps.accounts.services import (
                    create_and_send_email_verification_code,
                )

                create_and_send_email_verification_code(user)
            except Exception:
                pass

        return user


class GoogleAuthSerializer(serializers.Serializer):
    id_token = serializers.CharField(write_only=True)

    def validate(self, attrs):
        raw_token = attrs["id_token"]
        try:
            info = google_id_token.verify_oauth2_token(
                raw_token, google_requests.Request()
            )
        except Exception:
            raise serializers.ValidationError(
                "Google token yaroqsiz yoki muddati o'tgan."
            )

        email = info.get("email")
        if not email:
            raise serializers.ValidationError("Google e-mail topilmadi.")

        self.user, _ = User.objects.get_or_create(
            email=email,
            defaults={
                "first_name": info.get("given_name", ""),
                "last_name": info.get("family_name", ""),
                "is_verified": True,
                "google_id": info.get("sub"),
            },
        )
        return attrs

    def create(self, validated_data):
        refresh = AuthTokenSerializer.get_token(self.user)
        return {"refresh": str(refresh), "access": str(refresh.access_token)}


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        if not User.objects.filter(email=value, is_active=True).exists():
            raise serializers.ValidationError("Aktiv foydalanuvchi topilmadi.")
        return value

    def save(self, **kwargs):
        from django.contrib.auth.tokens import default_token_generator
        from apps.accounts.services import send_password_reset

        user = User.objects.get(email=self.validated_data["email"])
        token = default_token_generator.make_token(user)
        send_password_reset(user, token)
        return token


class PasswordResetConfirmSerializer(serializers.Serializer):
    email = serializers.EmailField()
    token = serializers.CharField()
    new_password = serializers.CharField(
        write_only=True, validators=[validate_password]
    )

    def validate(self, attrs):
        from django.contrib.auth.tokens import default_token_generator

        user = User.objects.filter(email=attrs["email"]).first()
        if not user or not default_token_generator.check_token(user, attrs["token"]):
            raise serializers.ValidationError(
                "Token yaroqsiz yoki foydalanuvchi topilmadi."
            )

        self.user = user
        return attrs

    def save(self, **kwargs):
        self.user.set_password(self.validated_data["new_password"])
        self.user.save(update_fields=["password"])
        return self.user


class ProfileSerializer(serializers.ModelSerializer):
    country_name = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "avatar",
            "bio",
            "role",
            "is_verified",
            "country",
            "country_name",
            "date_joined",
        )
        read_only_fields = (
            "id",
            "email",
            "role",
            "is_verified",
            "full_name",
            "country_name",
            "date_joined",
        )


class UserShortSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "full_name", "avatar")


__all__ = [
    "AuthTokenSerializer",
    "RegisterSerializer",
    "GoogleAuthSerializer",
    "PasswordResetRequestSerializer",
    "PasswordResetConfirmSerializer",
    "ProfileSerializer",
    "UserShortSerializer",
]
