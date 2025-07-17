import datetime
import secrets
import string

from django.utils import timezone
from rest_framework import serializers

from apps.users.models import User
from apps.accounts.models import EmailVerification
from apps.accounts.tasks import send_verification_email


DEFAULT_EXPIRE_SECONDS = 100  # TODO: settings.ACCOUNTS_CODE_EXPIRE_SECONDS


def generate_code(length: int = 6) -> str:
    return "".join(secrets.choice(string.digits) for _ in range(length))


class RequestVerificationCodeSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def create(self, validated_data):
        email = validated_data["email"].lower().strip()

        # Agar user allaqachon mavjud bo'lsa va verified bo'lsa - optional policy:
        # if User.objects.filter(email=email, is_verified=True).exists():
        #     raise serializers.ValidationError({"email": "Bu email allaqachon ro'yxatdan o'tgan."})

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
        # Minimal policy; qo'shimcha Django validators ham ishlatish mumkin
        if sum(c.isdigit() for c in value) < 1 or sum(c.isupper() for c in value) < 1:
            raise serializers.ValidationError(
                "Parolda kamida 1 ta raqam va 1 ta katta harf bo‘lishi shart."
            )
        return value

    def validate(self, attrs):
        email = attrs.get("email").lower().strip()
        code = attrs.pop("code")

        # 1) user mavjud emasligiga ishonch hosil qilamiz
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError(
                {"email": "Bu email bilan foydalanuvchi mavjud."}
            )

        # 2) kodni tekshirish
        try:
            ev = EmailVerification.objects.get(email=email, code=code, is_used=False)
        except EmailVerification.DoesNotExist:
            raise serializers.ValidationError({"code": "Kod noto‘g‘ri yoki topilmadi."})

        if ev.is_expired():
            raise serializers.ValidationError({"code": "Kod muddati tugagan."})

        # register bosqichida keyin ishlatish uchun saqlaymiz
        self.ev = ev
        attrs["email"] = email  # normalize qilingan
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")

        # User yaratish: manager orqali (normalize + default flags)
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.is_verified = True  # tasdiqlandi
        user.is_active = True
        user.save()

        # kodni ishlatilgan deb belgilaymiz
        self.ev.mark_used(save=False)
        self.ev.verified = True
        self.ev.save(update_fields=["is_used", "verified"])

        return user
