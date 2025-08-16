#  apps/accounts/services.py
from django.db import transaction
from typing import Optional
from django.conf import settings
from django.utils import timezone
import datetime
import logging
from apps.accounts.models import EmailVerification
from apps.users.models import User
from apps.accounts.utils import generate_code
from apps.accounts.tasks import send_password_reset_email
from datetime import timedelta
from django.core.exceptions import ValidationError

logger = logging.getLogger(__name__)


def create_and_send_password_reset_code(
    user: User,
    *,
    ttl_seconds: Optional[int] = None,
) -> EmailVerification:

    now = timezone.now()
    ttl_seconds = (
        ttl_seconds
        if ttl_seconds is not None
        else getattr(settings, "ACCOUNTS_PASSWORD_RESET_CODE_TTL_SECONDS", 5 * 60)
    )

    one_day_ago = now - timedelta(days=1)
    sent_today = EmailVerification.objects.filter(
        email=user.email, created_at__gte=one_day_ago
    ).count()
    if sent_today >= 10:
        raise ValidationError("Kunlik limitga yetdingiz. Ertaga urinib ko‘ring.")

    last_code = (
        EmailVerification.objects.filter(email=user.email)
        .order_by("-created_at")
        .first()
    )
    if last_code and (now - last_code.created_at).total_seconds() < 60:
        raise ValidationError("Yangi kodni faqat 1 daqiqadan keyin olishingiz mumkin.")

    expires_at = now + datetime.timedelta(seconds=ttl_seconds)
    code = generate_code()

    with transaction.atomic():
        ev, created = EmailVerification.objects.select_for_update().get_or_create(
            email=user.email,
            defaults={
                "code": code,
                "expires_at": expires_at,
                "is_used": False,
                "verified": False,
            },
        )

        if not created:
            ev.code = code
            ev.expires_at = expires_at
            ev.is_used = False
            ev.verified = False
            ev.save(update_fields=["code", "expires_at", "is_used", "verified"])

    logger.info(
        "Created/updated password reset code for %s (expires %s)",
        user.email,
        expires_at,
    )

    try:
        send_password_reset_email.delay(user.email, code)  # 👈 code ham jo‘natiladi
    except Exception:
        logger.exception("Failed to enqueue password reset email for %s", user.email)

    return ev


def validate_password_reset_code(email: str, code: str) -> User:
    """Validate password reset code and return user"""
    try:
        ev = EmailVerification.objects.get(
            email=email.lower().strip(), code=code, is_used=False
        )

        if ev.is_expired():
            raise ValueError("Code has expired")

        # Mark as used
        ev.mark_used()

        return User.objects.get(email=email)
    except EmailVerification.DoesNotExist:
        raise ValueError("Invalid or already used code")
