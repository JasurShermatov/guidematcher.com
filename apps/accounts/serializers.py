import datetime
import secrets
import string

from django.utils import timezone
from rest_framework import serializers

from apps.users.models import User
from apps.accounts.models import EmailVerification
from apps.accounts.tasks import send_verification_email


# --- Helper funksiyalar ---
def generate_code(length: int = 6) -> str:
    """Tasodifiy raqamli kod yaratish (masalan: 123456)."""
    return "".join(secrets.choice(string.digits) for _ in range(length))


# --- 1) Emailga tasdiqlash kodi soʻrash ---
class RequestVerificationCodeSerializer(serializers.Serializer):
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=User.UserRole.choices, write_only=True)


    def create(self, validated_data):
        code = generate_code()
        expires_at = timezone.now() + datetime.timedelta(minutes=10)

        ev, _ = EmailVerification.objects.update_or_create(
            email=validated_data["email"],
            is_used=False,
            defaults={
                "code": code,
                "expires_at": expires_at,
            },
        )

        # Celery orqali fon rejimida email yuborish
        send_verification_email.delay(validated_data["email"], code, "register")

        return ev


# --- 2) Roʻyxatdan oʻtish (Register) ---
class RegisterSerializer(serializers.ModelSerializer):
    code = serializers.CharField(write_only=True, max_length=6)

    class Meta:
        model = User
        fields = (
            "email", "password", "first_name", "last_name",
            "role", "country", "code",
        )
        extra_kwargs = {
            "password": {"write_only": True, "min_length": 8},
        }

    def validate_password(self, value: str) -> str:
        """Parol kuchini tekshirish: kamida 1 raqam va 1 katta harf bo‘lishi kerak."""
        if sum(c.isdigit() for c in value) < 1 or sum(c.isupper() for c in value) < 1:
            raise serializers.ValidationError(
                "Parolda kamida 1 ta raqam va 1 ta katta harf bo‘lishi kerak."
            )
        return value

    def validate(self, attrs):
        email = attrs["email"]
        code = attrs.pop("code")

        try:
            ev = EmailVerification.objects.get(
                email=email, code=code, is_used=False
            )
        except EmailVerification.DoesNotExist:
            raise serializers.ValidationError({"code": "Kod xato yoki eskirgan."})

        if ev.expires_at < timezone.now():
            raise serializers.ValidationError({"code": "Kod muddati tugagan."})

        # Kod ishlatilgan deb belgilanadi
        ev.is_used = True
        ev.save(update_fields=["is_used"])

        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User.objects.create(**validated_data, is_verified=True)
        user.set_password(password)
        user.save()
        return user