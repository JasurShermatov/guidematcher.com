import datetime
import secrets
import string

from django.utils import timezone
from rest_framework import serializers
from apps.users.models import User, Country
from apps.accounts.models import EmailVerification
from apps.accounts.tasks import send_verification_email

DEFAULT_EXPIRE_SECONDS = 300  # 5 daqiqa


def generate_code(length: int = 6) -> str:
    return "".join(secrets.choice(string.digits) for _ in range(length))


class RequestVerificationCodeSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def create(self, validated_data):
        email = validated_data["email"].lower().strip()

        code = generate_code()
        expires_at = timezone.now() + datetime.timedelta(seconds=DEFAULT_EXPIRE_SECONDS)

        ev, _ = EmailVerification.objects.update_or_create(
            email=email,
            defaults={
                "code": code,
                "expires_at": expires_at,
                "is_used": False,
                "verified": False,
            },
        )

        send_verification_email.delay(
            email, code, expires_in_seconds=DEFAULT_EXPIRE_SECONDS
        )
        return ev


class RegisterSerializer(serializers.ModelSerializer):
    code = serializers.CharField(write_only=True, max_length=6)
    role = serializers.CharField(max_length=20)
    country = serializers.CharField(max_length=100)

    class Meta:
        model = User
        fields = (
            "email",
            "password",
            "first_name",
            "last_name",
            "role",
            "country",
            "code",
        )
        extra_kwargs = {
            "password": {"write_only": True, "min_length": 8},
        }

    def validate_password(self, value):
        if not (
            any(c.islower() for c in value)
            and any(c.isupper() for c in value)
            and any(c.isdigit() for c in value)
            and any(c in "@$!%*?&" for c in value)
        ):
            raise serializers.ValidationError(
                "Parolda kamida 1 ta kichik harf, 1 ta katta harf, 1 ta raqam va 1 ta maxsus belgi (@$!%*?&) bo‘lishi shart."
            )
        return value

    def validate_role(self, value):
        valid_roles = ["Client", "Customer"]
        if value not in valid_roles:
            raise serializers.ValidationError(
                f"Role {valid_roles} dan biri bo‘lishi kerak."
            )
        return value

    def validate_country(self, value):
        if not value or value.strip() == "":
            raise serializers.ValidationError(
                "Mamlakat maydoni bo‘sh bo‘lmasligi kerak."
            )
        return value

    def validate(self, attrs):
        email = attrs.get("email").lower().strip()
        code = attrs.pop("code")
        country_name = attrs.pop("country")

        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError(
                {"email": "Bu email bilan foydalanuvchi allaqachon ro'yxatdan o'tgan."}
            )

        try:
            ev = EmailVerification.objects.get(email=email, code=code, is_used=False)
        except EmailVerification.DoesNotExist:
            raise serializers.ValidationError(
                {"code": "Tasdiqlash kodi noto‘g‘ri yoki ishlatilgan."}
            )

        if ev.is_expired():
            raise serializers.ValidationError(
                {"code": "Tasdiqlash kodi muddati tugagan."}
            )

        try:
            country_instance = Country.objects.get(name__iexact=country_name)
        except Country.DoesNotExist:
            country_instance = Country.objects.create(name=country_name)
        attrs["country"] = country_instance

        self.ev = ev
        attrs["email"] = email
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.is_verified = True
        user.is_active = True
        user.save()

        self.ev.mark_used(save=False)
        self.ev.verified = True
        self.ev.save(update_fields=["is_used", "verified"])

        return user
