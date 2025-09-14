# apps/accounts/serializers.py
import datetime
import secrets
import string
import logging

from django.conf import settings
from django.utils import timezone
from django.db import transaction

from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from django.core.cache import cache

from apps.users.models import User, Country
from apps.accounts.models import EmailVerification
from apps.accounts.tasks import send_verification_email, send_welcome_email
from .services import (
    create_and_send_password_reset_code,
    validate_password_reset_code,
)

logger = logging.getLogger(__name__)

# Kod muddati (sekundlarda)
DEFAULT_EXPIRE_SECONDS = getattr(
    settings, "ACCOUNTS_VERIFICATION_CODE_TTL_SECONDS", 300
)


def generate_code(length: int = 6) -> str:
    """Faqat raqamlardan iborat tasodifiy kod."""
    return "".join(secrets.choice(string.digits) for _ in range(length))


# ──────────────────────────────────────────────────────────────────────────────
# 1) Verification code so‘rash
# ──────────────────────────────────────────────────────────────────────────────
class RequestVerificationCodeSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        email = value.lower().strip()

        # 15 daqiqada 3 martadan ko‘p so‘rashni cheklaymiz
        cache_key = f"verification_request:{email}"
        request_count = cache.get(cache_key, 0)
        if request_count >= 3:
            raise serializers.ValidationError(
                "Too many verification code requests. Please wait 15 minutes and try again."
            )
        return email

    def create(self, validated_data):
        email = validated_data["email"]

        # Eski aktiv (is_used=False) yozuvlarni 'used' qilib qo‘yish (ixtiyoriy)
        EmailVerification.objects.filter(email=email, is_used=False).update(
            is_used=True
        )

        code = generate_code()
        now = timezone.now()
        expires_at = now + datetime.timedelta(seconds=DEFAULT_EXPIRE_SECONDS)

        # 🔧 MUHIM: duplikatni bartaraf etish — bitta email uchun bitta qator
        # bor bo‘lsa yangilanadi, bo‘lmasa yaratiladi.
        with transaction.atomic():
            ev, _created = EmailVerification.objects.update_or_create(
                email=email,
                defaults={
                    "code": code,
                    "created_at": now,  # agar modelda bo‘lsa
                    "expires_at": expires_at,
                    "is_used": False,
                    "verified": False,
                },
            )

        # email yuborishni Celery orqali fon rejimida boshlaymiz
        send_verification_email.delay(
            email, code, expires_in_seconds=DEFAULT_EXPIRE_SECONDS
        )

        # Rate-limit hisoblagichini yangilash (15 daqiqa)
        cache_key = f"verification_request:{email}"
        cache.set(cache_key, cache.get(cache_key, 0) + 1, timeout=15 * 60)

        return ev


# ──────────────────────────────────────────────────────────────────────────────
# 2) Ro‘yxatdan o‘tish
# ──────────────────────────────────────────────────────────────────────────────
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
                "Password must contain at least one lowercase letter, one uppercase letter, one digit, and one special character (@$!%*?&)."
            )
        return value

    def validate_role(self, value):
        valid_roles = ["Client", "Customer"]
        if value not in valid_roles:
            raise serializers.ValidationError(
                f"Role must be one of: {', '.join(valid_roles)}."
            )
        return value

    def validate_country(self, value):
        return value.strip()

    def validate(self, attrs):
        email = attrs.get("email").lower().strip()
        code = attrs.pop("code")
        country_name = attrs.pop("country").strip()

        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError(
                {"email": "This email is already registered."}
            )

        # Kodni tekshirish
        try:
            ev = EmailVerification.objects.get(email=email, code=code, is_used=False)
        except EmailVerification.DoesNotExist:
            raise serializers.ValidationError(
                {"code": "Invalid or already used verification code."}
            )

        if hasattr(ev, "is_expired") and ev.is_expired():
            raise serializers.ValidationError(
                {"code": "Verification code has expired."}
            )

        # Country obyektini olish yoki yaratish
        try:
            country_instance = Country.objects.get(name__iexact=country_name)
        except Country.DoesNotExist:
            with transaction.atomic():
                country_instance, _ = Country.objects.get_or_create(
                    name=country_name, defaults={"is_active": True}
                )

        attrs["country"] = country_instance
        attrs["email"] = email
        self.ev = ev
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")

        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.is_verified = True
        user.is_active = True
        user.save()

        # Verifikatsiya yozuvini yakunlash
        self.ev.is_used = True
        self.ev.verified = True
        self.ev.save(update_fields=["is_used", "verified"])

        # Xush kelibsiz xati
        send_welcome_email.delay(user.email, user.first_name)

        return user


# ──────────────────────────────────────────────────────────────────────────────
# 3) JWT login serializer
# ──────────────────────────────────────────────────────────────────────────────
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        return super().get_token(user)

    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user

        data.update(
            {
                "user_id": user.id,
                "email": user.email,
                "role": user.role,
                "profile_id": None,
            }
        )
        return data


# ──────────────────────────────────────────────────────────────────────────────
# 4) Password reset — code so‘rash
# ──────────────────────────────────────────────────────────────────────────────
class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        email = value.lower().strip()
        cache_key = f"password_reset_request:{email}"
        request_count = cache.get(cache_key, 0)

        if request_count >= 3:
            logger.warning(
                f"Rate limit exceeded for password reset: {email} - {request_count} attempts"
            )
            raise serializers.ValidationError(
                "Too many password reset requests. Please wait 30 minutes and try again."
            )
        return email

    def create(self, validated_data):
        email = validated_data["email"]

        # Rate-limit hisoblagichi (30 daqiqa)
        cache_key = f"password_reset_request:{email}"
        cache.set(cache_key, cache.get(cache_key, 0) + 1, timeout=30 * 60)

        try:
            user = User.objects.get(email=email, is_active=True)
            create_and_send_password_reset_code(user)
            logger.info(f"Password reset code sent to {email}")
        except User.DoesNotExist:
            # Xavfsizlik uchun jim turamiz
            logger.info(f"Password reset attempted for non-existent email: {email}")

        return {
            "message": "If an account exists with this email, a password reset code has been sent.",
            "detail": "Please check your email for the verification code.",
        }


# ──────────────────────────────────────────────────────────────────────────────
# 5) Password reset — tasdiqlash
# ──────────────────────────────────────────────────────────────────────────────
class PasswordResetConfirmSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6)
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate_new_password(self, value):
        if not (
            any(c.islower() for c in value)
            and any(c.isupper() for c in value)
            and any(c.isdigit() for c in value)
            and any(c in "@$!%*?&" for c in value)
        ):
            raise serializers.ValidationError(
                "Password must contain at least one lowercase, one uppercase, one digit, and one special character (@$!%*?&)."
            )
        return value

    def validate(self, attrs):
        email = attrs["email"].lower().strip()
        code = attrs["code"]

        cache_key = f"password_reset_verify:{email}"
        attempt_count = cache.get(cache_key, 0)

        if attempt_count >= 5:
            logger.warning(f"Too many verification attempts for {email}")
            raise serializers.ValidationError(
                {"code": "Too many failed attempts. Please request a new code."}
            )

        try:
            user = validate_password_reset_code(email, code)
            attrs["user"] = user
            cache.delete(cache_key)
        except ValueError as e:
            cache.set(cache_key, attempt_count + 1, timeout=15 * 60)
            raise serializers.ValidationError({"code": str(e)})

        return attrs

    def save(self, **kwargs):
        user = self.validated_data["user"]
        new_password = self.validated_data["new_password"]
        user.set_password(new_password)
        user.save(update_fields=["password", "updated_at"])

        logger.info(f"Password successfully reset for {user.email}")
        return user


# ──────────────────────────────────────────────────────────────────────────────
# 6) Logout
# ──────────────────────────────────────────────────────────────────────────────
class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField(
        required=True, help_text="Refresh token obtained from login"
    )
