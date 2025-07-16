import datetime
import secrets
import string

from django.utils import timezone
from rest_framework import serializers

from apps.users.models import User
from apps.accounts.models import EmailVerification
from apps.accounts.tasks import send_verification_email


def generate_code(length: int = 6) -> str:
    return "".join(secrets.choice(string.digits) for _ in range(length))


class RequestVerificationCodeSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def create(self, validated_data):
        email = validated_data["email"]
        code = generate_code()
        expires_at = timezone.now() + datetime.timedelta(seconds=100)  # 100s

        ev, _ = EmailVerification.objects.update_or_create(
            email=email,
            defaults={
                "code": code,
                "expires_at": expires_at,
                "is_used": False,
                "verified": False,
            },
        )

        # fon orqali yuboramiz
        send_verification_email.delay(email, code, expires_in_seconds=100)

        return ev


class RegisterSerializer(serializers.ModelSerializer):
    code = serializers.CharField(write_only=True, max_length=6)

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
        if sum(c.isdigit() for c in value) < 1 or sum(c.isupper() for c in value) < 1:
            raise serializers.ValidationError(
                "Parolda kamida 1 ta raqam va 1 ta katta harf bo‘lishi shart."
            )
        return value

    def validate(self, attrs):
        email = attrs.get("email")
        code = attrs.pop("code")

        try:
            ev = EmailVerification.objects.get(email=email, code=code, is_used=False)
        except EmailVerification.DoesNotExist:
            raise serializers.ValidationError({"code": "Kod noto‘g‘ri yoki topilmadi."})

        if ev.is_expired():
            raise serializers.ValidationError({"code": "Kod muddati tugagan."})

        # bu koddan foydalanildi
        ev.mark_used()
        ev.verified = True
        ev.save(update_fields=["verified", "is_used"])

        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User.objects.create(
            **validated_data, is_verified=True  # email tasdiqlandi
        )
        user.set_password(password)
        user.save()
        return user
