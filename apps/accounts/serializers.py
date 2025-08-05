# apps/accounts/serializers.py (Updated RegisterSerializer)

from rest_framework import serializers
from django.contrib.auth import get_user_model, authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone
from .models import VerificationCode
from apps.common.models import Country
import logging

User = get_user_model()
logger = logging.getLogger(__name__)


class RequestCodeSerializer(serializers.Serializer):
    """
    Serializer for requesting verification code
    """

    email = serializers.EmailField()
    code_type = serializers.ChoiceField(
        choices=VerificationCode.CODE_TYPES, default="registration"
    )

    def validate_email(self, value):
        """Validate email for registration"""
        code_type = self.initial_data.get("code_type", "registration")

        if code_type == "registration":
            if User.objects.filter(email=value).exists():
                raise serializers.ValidationError(
                    "Bu email manzil allaqachon ro'yxatdan o'tgan."
                )
        elif code_type == "password_reset":
            if not User.objects.filter(email=value).exists():
                raise serializers.ValidationError(
                    "Bu email manzil bilan hisob topilmadi."
                )

        return value


class RegisterSerializer(serializers.Serializer):
    """
    Serializer for user registration with verification code
    """

    role = serializers.ChoiceField(choices=User.ROLE_CHOICES)
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    country = serializers.CharField(max_length=100)
    code = serializers.CharField(max_length=6, write_only=True)

    def validate_first_name(self, value):
        """Validate first name"""
        if not value or not value.strip():
            raise serializers.ValidationError("Ism kiritish majburiy.")
        return value.strip()

    def validate_last_name(self, value):
        """Validate last name"""
        if not value or not value.strip():
            raise serializers.ValidationError("Familiya kiritish majburiy.")
        return value.strip()

    def validate_email(self, value):
        """Check if email is already registered"""
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                "Bu email manzil allaqachon ro'yxatdan o'tgan."
            )
        return value.lower().strip()

    def validate_password(self, value):
        """Validate password using Django's built-in validators"""
        try:
            validate_password(value)
        except ValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value

    def validate_country(self, value):
        """Validate country exists"""
        if not value or not value.strip():
            raise serializers.ValidationError("Mamlakat kiritish majburiy.")

        value = value.strip()

        # Check if country exists, if not create it
        if not Country.objects.filter(name__iexact=value).exists():
            try:
                Country.objects.create(name=value, code=value[:3].upper())
                logger.info(f"Created new country: {value}")
            except Exception as e:
                logger.error(f"Error creating country {value}: {str(e)}")
                # Don't fail validation if country creation fails

        return value

    def validate_code(self, value):
        """Validate verification code format"""
        if not value or not value.strip():
            raise serializers.ValidationError("Tasdiqlash kodi kiritish majburiy.")

        value = value.strip()

        if not value.isdigit() or len(value) != 6:
            raise serializers.ValidationError(
                "Tasdiqlash kodi 6 xonali raqam bo'lishi kerak."
            )

        return value

    def validate(self, attrs):
        """Validate verification code"""
        email = attrs.get("email")
        code = attrs.get("code")

        logger.info(f"Validating registration for {email} with code {code}")

        try:
            # Find the most recent valid verification code
            verification_code = VerificationCode.get_valid_code(
                email=email, code_type="registration"
            )

            if not verification_code:
                logger.warning(f"No valid verification code found for {email}")

                # Check if there are any codes at all
                any_code = (
                    VerificationCode.objects.filter(
                        email=email, code_type="registration"
                    )
                    .order_by("-created_at")
                    .first()
                )

                if not any_code:
                    raise serializers.ValidationError(
                        {
                            "code": "Tasdiqlash kodi topilmadi. Iltimos, avval kod so'rang."
                        }
                    )
                elif any_code.is_expired():
                    raise serializers.ValidationError(
                        {
                            "code": "Tasdiqlash kodi muddati tugagan. Iltimos, yangi kod so'rang."
                        }
                    )
                elif any_code.is_used:
                    raise serializers.ValidationError(
                        {
                            "code": "Bu tasdiqlash kodi allaqachon ishlatilgan. Yangi kod so'rang."
                        }
                    )
                else:
                    raise serializers.ValidationError(
                        {"code": "Tasdiqlash kodi yaroqsiz. Yangi kod so'rang."}
                    )

            logger.info(f"Found verification code {verification_code.id} for {email}")

            # Verify the code
            if not verification_code.verify(code):
                logger.warning(f"Code verification failed for {email}")

                if verification_code.is_expired():
                    raise serializers.ValidationError(
                        {"code": "Tasdiqlash kodi muddati tugagan."}
                    )
                elif verification_code.attempts >= verification_code.max_attempts:
                    raise serializers.ValidationError(
                        {
                            "code": "Tasdiqlash kodi urinishlari soni tugagan. Yangi kod so'rang."
                        }
                    )
                else:
                    remaining_attempts = verification_code.get_remaining_attempts()
                    raise serializers.ValidationError(
                        {
                            "code": f"Noto'g'ri tasdiqlash kodi. {remaining_attempts} ta urinish qoldi."
                        }
                    )

            logger.info(f"Code verification successful for {email}")
            return attrs

        except serializers.ValidationError:
            raise
        except Exception as e:
            logger.error(
                f"Unexpected error during code validation for {email}: {str(e)}"
            )
            raise serializers.ValidationError(
                {"code": "Tasdiqlash kodini tekshirishda xatolik yuz berdi."}
            )

    def create(self, validated_data):
        """Create new user"""
        validated_data.pop("code")  # Remove code from user data

        logger.info(f"Creating user with email: {validated_data['email']}")

        try:
            with transaction.atomic():
                user = User.objects.create_user(
                    email=validated_data["email"],
                    password=validated_data["password"],
                    first_name=validated_data["first_name"],
                    last_name=validated_data["last_name"],
                    role=validated_data["role"],
                    country=validated_data["country"],
                    is_active=True,
                    is_verified=True,
                )

                logger.info(f"User created successfully: {user.email} (ID: {user.id})")
                return user

        except Exception as e:
            logger.error(f"Error creating user {validated_data['email']}: {str(e)}")
            raise serializers.ValidationError(
                "Foydalanuvchi yaratishda xatolik yuz berdi."
            )


class LoginSerializer(serializers.Serializer):
    """
    Serializer for user login
    """

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        """Authenticate user"""
        email = attrs.get("email")
        password = attrs.get("password")

        if email and password:
            user = authenticate(
                request=self.context.get("request"),
                email=email.lower().strip(),
                password=password,
            )

            if not user:
                raise serializers.ValidationError("Email yoki parol noto'g'ri.")

            if not user.is_active:
                raise serializers.ValidationError("Hisob faol emas.")

            attrs["user"] = user
            return attrs
        else:
            raise serializers.ValidationError("Email va parol kiritish shart.")


class PasswordResetRequestSerializer(serializers.Serializer):
    """
    Serializer for password reset request
    """

    email = serializers.EmailField()

    def validate_email(self, value):
        """Check if user exists"""
        if not User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Bu email manzil bilan hisob topilmadi.")
        return value


class PasswordResetConfirmSerializer(serializers.Serializer):
    """
    Serializer for password reset confirmation
    """

    email = serializers.EmailField()
    code = serializers.CharField(max_length=6)
    new_password = serializers.CharField(write_only=True)

    def validate_new_password(self, value):
        """Validate new password"""
        try:
            validate_password(value)
        except ValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value

    def validate(self, attrs):
        """Validate verification code"""
        email = attrs.get("email")
        code = attrs.get("code")

        # Find valid verification code
        verification_code = VerificationCode.get_valid_code(
            email=email, code_type="password_reset"
        )

        if not verification_code:
            raise serializers.ValidationError({"code": "Tasdiqlash kodi topilmadi."})

        if not verification_code.verify(code):
            if verification_code.is_expired():
                raise serializers.ValidationError(
                    {"code": "Tasdiqlash kodi muddati tugagan."}
                )
            else:
                raise serializers.ValidationError(
                    {"code": "Noto'g'ri tasdiqlash kodi."}
                )

        # Get user
        try:
            user = User.objects.get(email=email)
            attrs["user"] = user
        except User.DoesNotExist:
            raise serializers.ValidationError({"email": "Foydalanuvchi topilmadi."})

        return attrs


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for user data
    """

    full_name = serializers.ReadOnlyField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "role",
            "country",
            "city",
            "phone",
            "profile_picture",
            "bio",
            "is_verified",
            "date_joined",
        ]
        read_only_fields = ["id", "is_verified", "date_joined"]
