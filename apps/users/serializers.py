# apps/users/serializers.py
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

# Google auth (ixtiyoriy)
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests

User = get_user_model()


# ───────────────────────────── JWT
class AuthTokenSerializer(TokenObtainPairSerializer):
    """
    JWT refresh/access tokenlarini qaytaradi va foydalanuvchi haqidagi
    qo'shimcha claim'larni token ichiga qo'shadi.
    """

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["email"] = user.email
        token["avatar"] = user.avatar.url if user.avatar else None
        return token


# ───────────────────────────── Register (internal)
# Public registratsiya `apps.accounts` orqali (kod + tasdiq).
# Ushbu serializer developer/admin/test uchun qoldirilgan.
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

        # create_user parolni hashlaydi va saqlaydi
        user = User.objects.create_user(password=password, **validated_data)
        user.is_active = True  # ehtiyot chora: active bo'lsin
        user.save(update_fields=["is_active"])

        # E-mail verifikatsiya -> accounts servisiga delegatsiya
        if not user.is_verified:
            try:
                from apps.accounts.services import (
                    create_and_send_email_verification_code,
                )

                create_and_send_email_verification_code(user)
            except Exception:  # noqa: BLE001
                # TODO: logger.warning("Verification send failed", exc_info=True)
                pass

        return user


# ───────────────────────────── Google Login
class GoogleAuthSerializer(serializers.Serializer):
    id_token = serializers.CharField(write_only=True)

    def validate(self, attrs):
        raw_token = attrs["id_token"]
        try:
            info = google_id_token.verify_oauth2_token(
                raw_token, google_requests.Request()
            )
        except Exception:  # noqa: BLE001
            raise serializers.ValidationError("Invalid Google token.")

        email = info.get("email")
        if not email:
            raise serializers.ValidationError("Google e-mail topilmadi.")

        self.user, _ = User.objects.get_or_create(
            email=email,
            defaults={
                "first_name": info.get("given_name", ""),
                "last_name": info.get("family_name", ""),
                "is_verified": True,  # Google hisobini verified deb qabul qilamiz
                "google_id": info.get("sub"),
            },
        )
        return attrs

    def create(self, validated_data):
        refresh = AuthTokenSerializer.get_token(self.user)
        return {"refresh": str(refresh), "access": str(refresh.access_token)}


# ───────────────────────────── Password reset (delegated to accounts)
class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        if not User.objects.filter(email=value, is_active=True).exists():
            raise serializers.ValidationError("Foydalanuvchi topilmadi.")
        return value

    def save(self, **kwargs):
        from django.contrib.auth.tokens import default_token_generator
        from apps.accounts.services import send_password_reset  # siz yozadigan servis

        user = User.objects.get(email=self.validated_data["email"])
        token = default_token_generator.make_token(user)
        send_password_reset(
            user, token
        )  # servis reset URL yasab, Celery task chaqiradi
        return token


class PasswordResetConfirmSerializer(serializers.Serializer):
    email = serializers.EmailField()
    token = serializers.CharField()
    new_password = serializers.CharField(
        write_only=True, validators=[validate_password]
    )

    def validate(self, attrs):
        from django.contrib.auth.tokens import default_token_generator

        email = attrs["email"]
        token = attrs["token"]

        user = User.objects.filter(email=email).first()
        if not user or not default_token_generator.check_token(user, token):
            raise serializers.ValidationError("Token yaroqsiz.")
        self.user = user
        return attrs

    def save(self, **kwargs):
        self.user.set_password(self.validated_data["new_password"])
        self.user.save(update_fields=["password"])
        return self.user


# ───────────────────────────── Profile & Short
class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "phone",
            "country",
            "avatar",
            "bio",
            "role",
            "is_verified",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "email",
            "role",
            "is_verified",
            "created_at",
            "updated_at",
        )


class UserShortSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "first_name", "last_name", "avatar")


__all__ = [
    "AuthTokenSerializer",
    "RegisterSerializer",
    "GoogleAuthSerializer",
    "PasswordResetRequestSerializer",
    "PasswordResetConfirmSerializer",
    "ProfileSerializer",
    "UserShortSerializer",
]
