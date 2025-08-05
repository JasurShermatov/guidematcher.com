# apps/accounts/debug_views.py (Faqat development uchun)
from os import path

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import VerificationCode
import logging

User = get_user_model()
logger = logging.getLogger(__name__)


@api_view(["GET"])
@permission_classes([AllowAny])
def debug_verification_codes(request):
    """
    Debug endpoint to check verification codes
    WARNING: Only use in development!
    """
    email = request.GET.get("email")

    if not email:
        return Response({"error": "Email parameter required"}, status=400)

    try:
        # Get all verification codes for this email
        codes = VerificationCode.objects.filter(email=email).order_by("-created_at")[:5]

        code_data = []
        for code in codes:
            code_data.append(
                {
                    "id": code.id,
                    "email": code.email,
                    "code": code.code,  # WARNING: Exposing actual code for debugging
                    "code_type": code.code_type,
                    "is_used": code.is_used,
                    "is_expired": code.is_expired(),
                    "is_valid": code.is_valid(),
                    "attempts": code.attempts,
                    "max_attempts": code.max_attempts,
                    "expires_at": code.expires_at,
                    "created_at": code.created_at,
                    "used_at": code.used_at,
                }
            )

        return Response(
            {
                "email": email,
                "total_codes": codes.count(),
                "codes": code_data,
                "current_time": timezone.now(),
            }
        )

    except Exception as e:
        logger.error(f"Debug verification codes error: {str(e)}")
        return Response({"error": str(e)}, status=500)


@api_view(["POST"])
@permission_classes([AllowAny])
def debug_verify_code(request):
    """
    Debug endpoint to manually verify codes
    WARNING: Only use in development!
    """
    email = request.data.get("email")
    code = request.data.get("code")

    if not email or not code:
        return Response({"error": "Email and code required"}, status=400)

    try:
        # Find the most recent unused code
        verification_code = (
            VerificationCode.objects.filter(
                email=email, code_type="registration", is_used=False
            )
            .order_by("-created_at")
            .first()
        )

        if not verification_code:
            return Response(
                {
                    "success": False,
                    "error": "No verification code found",
                    "debug_info": {
                        "email": email,
                        "code": code,
                        "total_codes": VerificationCode.objects.filter(
                            email=email
                        ).count(),
                    },
                }
            )

        # Debug information before verification
        debug_before = {
            "code_id": verification_code.id,
            "stored_code": verification_code.code,
            "input_code": code,
            "codes_match": verification_code.code == code,
            "is_expired": verification_code.is_expired(),
            "is_used": verification_code.is_used,
            "attempts": verification_code.attempts,
            "max_attempts": verification_code.max_attempts,
            "is_valid": verification_code.is_valid(),
            "expires_at": verification_code.expires_at,
            "current_time": timezone.now(),
        }

        # Attempt verification
        verification_result = verification_code.verify(code)

        # Debug information after verification
        verification_code.refresh_from_db()
        debug_after = {
            "verification_result": verification_result,
            "is_used_after": verification_code.is_used,
            "attempts_after": verification_code.attempts,
            "used_at": verification_code.used_at,
        }

        return Response(
            {
                "success": verification_result,
                "email": email,
                "debug_before": debug_before,
                "debug_after": debug_after,
            }
        )

    except Exception as e:
        logger.error(f"Debug verify code error: {str(e)}")
        return Response({"error": str(e)}, status=500)


@api_view(["DELETE"])
@permission_classes([AllowAny])
def debug_clear_codes(request):
    """
    Clear all verification codes for an email
    WARNING: Only use in development!
    """
    email = request.data.get("email")

    if not email:
        return Response({"error": "Email required"}, status=400)

    try:
        deleted_count = VerificationCode.objects.filter(email=email).delete()[0]

        return Response(
            {
                "success": True,
                "email": email,
                "deleted_count": deleted_count,
            }
        )

    except Exception as e:
        logger.error(f"Debug clear codes error: {str(e)}")
        return Response({"error": str(e)}, status=500)


@api_view(["GET"])
@permission_classes([AllowAny])
def debug_user_status(request):
    """
    Check user status
    WARNING: Only use in development!
    """
    email = request.GET.get("email")

    if not email:
        return Response({"error": "Email parameter required"}, status=400)

    try:
        user_exists = User.objects.filter(email=email).exists()
        user_data = None

        if user_exists:
            user = User.objects.get(email=email)
            user_data = {
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": user.role,
                "country": user.country,
                "is_active": user.is_active,
                "is_verified": user.is_verified,
                "date_joined": user.date_joined,
            }

        return Response(
            {
                "email": email,
                "user_exists": user_exists,
                "user_data": user_data,
            }
        )

    except Exception as e:
        logger.error(f"Debug user status error: {str(e)}")
        return Response({"error": str(e)}, status=500)


# Debug URLs (Add to urls.py only in development)
debug_urlpatterns = [
    path(
        "debug/verification-codes/",
        debug_verification_codes,
        name="debug_verification_codes",
    ),
    path("debug/verify-code/", debug_verify_code, name="debug_verify_code"),
    path("debug/clear-codes/", debug_clear_codes, name="debug_clear_codes"),
    path("debug/user-status/", debug_user_status, name="debug_user_status"),
]
