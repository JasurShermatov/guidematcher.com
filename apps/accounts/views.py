# apps/accounts/views.py (Updated with better error handling)

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.conf import settings
from django.db import transaction
from .models import VerificationCode, PasswordResetAttempt
from .serializers import (
    RequestCodeSerializer,
    RegisterSerializer,
    LoginSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    UserSerializer,
)
from .tasks import send_verification_email
import logging

User = get_user_model()
logger = logging.getLogger(__name__)


def get_client_ip(request):
    """Get client IP address from request"""
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        ip = x_forwarded_for.split(",")[0].strip()
    else:
        ip = request.META.get("REMOTE_ADDR")
    return ip


@api_view(["POST"])
@permission_classes([AllowAny])
def request_code(request):
    """
    Request verification code for registration or password reset
    """
    logger.info(f"Verification code request received: {request.data}")

    serializer = RequestCodeSerializer(data=request.data)
    if not serializer.is_valid():
        logger.warning(f"Invalid request code data: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    email = serializer.validated_data["email"]
    code_type = serializer.validated_data["code_type"]
    ip_address = get_client_ip(request)

    try:
        with transaction.atomic():
            # Generate verification code
            logger.info(
                f"Generating verification code for {email} ({code_type}) from IP {ip_address}"
            )

            verification_code = VerificationCode.generate_code(
                email=email, code_type=code_type, ip_address=ip_address
            )

            logger.info(
                f"Verification code created: ID={verification_code.id}, expires_at={verification_code.expires_at}"
            )

            # Send email asynchronously
            try:
                send_verification_email.delay(
                    email=email, code=verification_code.code, code_type=code_type
                )
                logger.info(f"Verification email queued for {email}")
            except Exception as email_error:
                logger.error(
                    f"Failed to queue verification email for {email}: {str(email_error)}"
                )
                # Don't fail the request if email queueing fails
                pass

            return Response(
                {
                    "detail": "Tasdiqlash kodi emailingizga yuborildi.",
                    "expires_in": verification_code.get_remaining_time(),
                    "code_id": verification_code.id,  # For debugging
                },
                status=status.HTTP_200_OK,
            )

    except Exception as e:
        logger.error(f"Error sending verification code to {email}: {str(e)}")
        return Response(
            {
                "detail": "Kod yuborishda xatolik yuz berdi. Iltimos qaytadan urinib ko'ring."
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    """
    Register new user with verification code
    """
    logger.info(
        f"User registration request received for email: {request.data.get('email')}"
    )

    serializer = RegisterSerializer(data=request.data)
    if not serializer.is_valid():
        logger.warning(f"Invalid registration data: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    try:
        with transaction.atomic():
            # Create user
            user = serializer.save()
            logger.info(f"User created successfully: {user.email} (ID: {user.id})")

            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            access_token = refresh.access_token

            # Create user profile based on role
            try:
                if user.role == "Guide":
                    from apps.profiles.models import GuideProfile

                    GuideProfile.objects.create(user=user)
                    logger.info(f"GuideProfile created for user {user.email}")
                else:
                    from apps.profiles.models import ClientProfile

                    ClientProfile.objects.create(user=user)
                    logger.info(f"ClientProfile created for user {user.email}")
            except Exception as profile_error:
                logger.error(
                    f"Error creating profile for {user.email}: {str(profile_error)}"
                )
                # Don't fail registration if profile creation fails

            # Create notification preferences
            try:
                from apps.notifications.models import NotificationPreference

                NotificationPreference.objects.create(user=user)
                logger.info(f"NotificationPreference created for user {user.email}")
            except Exception as notif_error:
                logger.error(
                    f"Error creating notification preferences for {user.email}: {str(notif_error)}"
                )
                # Don't fail registration if notification preference creation fails

            logger.info(f"Registration completed successfully for: {user.email}")

            return Response(
                {
                    "user": UserSerializer(user).data,
                    "access_token": str(access_token),
                    "refresh_token": str(refresh),
                    "detail": "Ro'yxatdan o'tish muvaffaqiyatli yakunlandi!",
                },
                status=status.HTTP_201_CREATED,
            )

    except Exception as e:
        logger.error(f"Error during registration: {str(e)}")
        return Response(
            {"detail": "Ro'yxatdan o'tishda xatolik yuz berdi."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    """
    Login user
    """
    logger.info(f"Login request received for email: {request.data.get('email')}")

    serializer = LoginSerializer(data=request.data, context={"request": request})
    if not serializer.is_valid():
        logger.warning(f"Invalid login data: {serializer.errors}")

        # Log failed login attempt
        email = request.data.get("email")
        if email:
            ip_address = get_client_ip(request)
            try:
                from apps.users.models import LoginAttempt

                LoginAttempt.objects.create(
                    email=email,
                    ip_address=ip_address,
                    success=False,
                    user_agent=request.META.get("HTTP_USER_AGENT", ""),
                )
            except:
                pass  # Don't fail if logging fails

            # Increment failed attempts for existing user
            try:
                user = User.objects.get(email=email)
                user.failed_login_attempts += 1
                user.last_failed_login = timezone.now()
                user.save(update_fields=["failed_login_attempts", "last_failed_login"])
            except User.DoesNotExist:
                pass

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    user = serializer.validated_data["user"]
    ip_address = get_client_ip(request)

    try:
        # Update last login info
        user.last_login = timezone.now()
        user.last_login_ip = ip_address
        user.failed_login_attempts = 0
        user.save(
            update_fields=["last_login", "last_login_ip", "failed_login_attempts"]
        )

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        access_token = refresh.access_token

        # Log successful login attempt
        try:
            from apps.users.models import LoginAttempt

            LoginAttempt.objects.create(
                email=user.email,
                ip_address=ip_address,
                success=True,
                user_agent=request.META.get("HTTP_USER_AGENT", ""),
            )
        except:
            pass  # Don't fail if logging fails

        logger.info(f"User logged in successfully: {user.email}")

        return Response(
            {
                "user": UserSerializer(user).data,
                "access_token": str(access_token),
                "refresh_token": str(refresh),
                "detail": "Tizimga kirish muvaffaqiyatli!",
            },
            status=status.HTTP_200_OK,
        )

    except Exception as e:
        logger.error(f"Error during login for {user.email}: {str(e)}")
        return Response(
            {"detail": "Tizimga kirishda xatolik yuz berdi."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([AllowAny])
def password_reset_request(request):
    """
    Request password reset code
    """
    logger.info(
        f"Password reset request received for email: {request.data.get('email')}"
    )

    serializer = PasswordResetRequestSerializer(data=request.data)
    if not serializer.is_valid():
        logger.warning(f"Invalid password reset request: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    email = serializer.validated_data["email"]
    ip_address = get_client_ip(request)

    # Check rate limiting
    if not PasswordResetAttempt.can_attempt(email=email, ip_address=ip_address):
        logger.warning(
            f"Rate limit exceeded for password reset: {email} from {ip_address}"
        )
        return Response(
            {"detail": "Juda ko'p urinish. Iltimos keyinroq qaytadan urinib ko'ring."},
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    try:
        with transaction.atomic():
            # Generate verification code
            verification_code = VerificationCode.generate_code(
                email=email, code_type="password_reset", ip_address=ip_address
            )

            # Send email
            send_verification_email.delay(
                email=email, code=verification_code.code, code_type="password_reset"
            )

            # Log attempt
            PasswordResetAttempt.objects.create(
                email=email, ip_address=ip_address, success=True
            )

            logger.info(f"Password reset code sent to {email}")

            return Response(
                {
                    "detail": "Parolni tiklash kodi emailingizga yuborildi.",
                    "expires_in": verification_code.get_remaining_time(),
                },
                status=status.HTTP_200_OK,
            )

    except Exception as e:
        logger.error(f"Error sending password reset code to {email}: {str(e)}")
        return Response(
            {"detail": "Kod yuborishda xatolik yuz berdi."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([AllowAny])
def password_reset_confirm(request):
    """
    Confirm password reset with code
    """
    logger.info(
        f"Password reset confirmation request for email: {request.data.get('email')}"
    )

    serializer = PasswordResetConfirmSerializer(data=request.data)
    if not serializer.is_valid():
        logger.warning(f"Invalid password reset confirmation: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    user = serializer.validated_data["user"]
    new_password = serializer.validated_data["new_password"]

    try:
        with transaction.atomic():
            # Update password
            user.set_password(new_password)
            user.failed_login_attempts = 0
            user.save()

            logger.info(f"Password reset successful for {user.email}")

            return Response(
                {"detail": "Parol muvaffaqiyatli o'zgartirildi."},
                status=status.HTTP_200_OK,
            )

    except Exception as e:
        logger.error(f"Error resetting password for {user.email}: {str(e)}")
        return Response(
            {"detail": "Parolni o'zgartirishda xatolik yuz berdi."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
def logout(request):
    """
    Logout user (blacklist refresh token)
    """
    try:
        refresh_token = request.data.get("refresh")
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()

        logger.info(
            f"User logged out: {request.user.email if request.user.is_authenticated else 'anonymous'}"
        )

        return Response(
            {"detail": "Tizimdan muvaffaqiyatli chiqildi."}, status=status.HTTP_200_OK
        )

    except Exception as e:
        logger.error(f"Error during logout: {str(e)}")
        return Response(
            {"detail": "Chiqishda xatolik yuz berdi."},
            status=status.HTTP_400_BAD_REQUEST,
        )


@api_view(["POST"])
@permission_classes([AllowAny])
def refresh_token(request):
    """
    Refresh access token
    """
    try:
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response(
                {"detail": "Refresh token talab qilinadi."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        token = RefreshToken(refresh_token)
        access_token = token.access_token

        logger.info("Token refreshed successfully")

        return Response({"access": str(access_token)}, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error refreshing token: {str(e)}")
        return Response(
            {"detail": "Token yangilashda xatolik yuz berdi."},
            status=status.HTTP_400_BAD_REQUEST,
        )
