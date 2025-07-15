# apps/users/serializers.py
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from apps.users.models import EmailVerification
from apps.common.utils import generate_random_code

User = get_user_model()


# ───────────────────────────── Auth tokens
class AuthTokenSerializer(TokenObtainPairSerializer):
    """JWT’ga qo‘shimcha user ma’lumotlari joylaymiz"""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["email"] = user.email
        token["avatar"] = user.avatar.url if user.avatar else None
        return token


# ───────────────────────────── Register
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = User
        fields = ("email", "first_name", "last_name", "password", "country")

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.is_active = True  # e-mail tekshirilguncha ham login bo‘la oladi
        user.save()

        # e-mail verification code
        code = generate_random_code()
        EmailVerification.objects.create(
            user=user,
            email=user.email,
            code=code,
            expires_at=timezone.now() + timezone.timedelta(minutes=30),
        )
        # Celery task (yoki sinchiklab utils)
        from apps.users.tasks import send_verification_email

        send_verification_email.delay(user.email, code)

        return user


# ───────────────────────────── Verify / Resend
class VerifyEmailSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6)

    def validate(self, attrs):
        try:
            ver = EmailVerification.objects.get(
                email=attrs["email"], code=attrs["code"], is_used=False
            )
        except EmailVerification.DoesNotExist:
            raise serializers.ValidationError("Kod noto‘g‘ri yoki ishlatilgan.")
        if ver.is_expired:
            raise serializers.ValidationError("Kod eskirgan.")
        attrs["verification"] = ver
        return attrs

    def save(self, **kwargs):
        ver = self.validated_data["verification"]
        ver.is_used = True
        ver.save(update_fields=["is_used"])
        ver.user.is_verified = True
        ver.user.save(update_fields=["is_verified"])
        return ver.user


class ResendVerificationSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        user = User.objects.filter(email=value).first()
        if not user:
            raise serializers.ValidationError("E-mail topilmadi.")
        if user.is_verified:
            raise serializers.ValidationError("E-mail allaqachon tasdiqlangan.")
        self.user = user
        return value

    def save(self, **kwargs):
        code = generate_random_code()
        EmailVerification.objects.create(
            user=self.user,
            email=self.user.email,
            code=code,
            expires_at=timezone.now() + timezone.timedelta(minutes=30),
        )
        from apps.users.tasks import send_verification_email

        send_verification_email.delay(self.user.email, code)
        return self.user


# ───────────────────────────── Google Login
class GoogleAuthSerializer(serializers.Serializer):
    id_token = serializers.CharField(write_only=True)

    def validate(self, attrs):
        try:
            info = id_token.verify_oauth2_token(
                attrs["id_token"],
                google_requests.Request(),
            )
        except Exception:
            raise serializers.ValidationError("Invalid Google token.")

        email = info.get("email")
        if not email:
            raise serializers.ValidationError("Google e-mail topilmadi.")
        self.info = info
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
        return {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        }


# ───────────────────────────── Password reset
class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        if not User.objects.filter(email=value, is_active=True).exists():
            raise serializers.ValidationError("Foydalanuvchi topilmadi.")
        return value

    def save(self, **kwargs):
        from django.contrib.auth.tokens import default_token_generator

        user = User.objects.get(email=self.validated_data["email"])
        token = default_token_generator.make_token(user)
        from apps.users.tasks import send_password_reset_email

        send_password_reset_email.delay(user.email, token)
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
            raise serializers.ValidationError("Token yaroqsiz.")
        self.user = user
        return attrs

    def save(self, **kwargs):
        self.user.set_password(self.validated_data["new_password"])
        self.user.save()
        return self.user


# ───────────────────────────── Profile
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
