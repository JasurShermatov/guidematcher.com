# apps/accounts/serializers.py
import datetime
import secrets
import string
from django.conf import settings
from django.utils import timezone
from django.core.cache import cache
from rest_framework import serializers
from apps.users.models import User, Country
from apps.accounts.models import EmailVerification
from apps.accounts.tasks import send_verification_email, send_welcome_email

# Predefined country list (example, can be expanded or sourced from a library like pycountry)
VALID_COUNTRIES = ["Uzbekistan", "United States", "United Kingdom", "Russia", "China"]

DEFAULT_EXPIRE_SECONDS = getattr(
    settings, "ACCOUNTS_VERIFICATION_CODE_TTL_SECONDS", 300
)


def generate_code(length: int = 6) -> str:
    return "".join(secrets.choice(string.digits) for _ in range(length))


class RequestVerificationCodeSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        email = value.lower().strip()
        # Rate limiting: max 3 requests per 15 minutes per email
        cache_key = f"verification_request:{email}"
        request_count = cache.get(cache_key, 0)
        if request_count >= 3:
            raise serializers.ValidationError(
                "Too many verification code requests. Please wait 15 minutes and try again."
            )
        return email

    def create(self, validated_data):
        email = validated_data["email"]
        # Invalidate previous codes
        EmailVerification.objects.filter(email=email, is_used=False).update(
            is_used=True
        )

        code = generate_code()
        expires_at = timezone.now() + datetime.timedelta(seconds=DEFAULT_EXPIRE_SECONDS)

        ev = EmailVerification.objects.create(
            email=email,
            code=code,
            expires_at=expires_at,
            is_used=False,
            verified=False,
        )

        send_verification_email.delay(
            email, code, expires_in_seconds=DEFAULT_EXPIRE_SECONDS
        )

        # Increment rate limit counter
        cache_key = f"verification_request:{email}"
        request_count = cache.get(cache_key, 0) + 1
        cache.set(cache_key, request_count, timeout=15 * 60)  # 15 minutes

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
        country_name = value.strip()
        if country_name not in VALID_COUNTRIES:
            raise serializers.ValidationError(
                f"Invalid country. Must be one of: {', '.join(VALID_COUNTRIES)}."
            )
        return country_name

    def validate(self, attrs):
        email = attrs.get("email").lower().strip()
        code = attrs.pop("code")
        country_name = attrs.pop("country")

        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError(
                {"email": "This email is already registered."}
            )

        try:
            ev = EmailVerification.objects.get(email=email, code=code, is_used=False)
        except EmailVerification.DoesNotExist:
            raise serializers.ValidationError(
                {"code": "Invalid or already used verification code."}
            )

        if ev.is_expired():
            raise serializers.ValidationError(
                {"code": "Verification code has expired."}
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

        # Send welcome email
        send_welcome_email.delay(user.email, user.first_name)

        return user
