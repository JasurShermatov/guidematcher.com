# apps/accounts/services.py
from __future__ import annotations
import logging
import secrets
import string
import datetime
from typing import Optional
from django.conf import settings
from django.utils import timezone
from django.utils.http import urlencode
from apps.users.models import User
from apps.accounts.models import EmailVerification
from apps.accounts.tasks import send_verification_email, send_password_reset_email

logger = logging.getLogger(__name__)


def generate_code(
    length: int = getattr(settings, "ACCOUNTS_VERIFICATION_CODE_LENGTH", 6)
) -> str:
    return "".join(secrets.choice(string.digits) for _ in range(length))


def create_and_send_email_verification_code(
    user: User,
    *,
    ttl_seconds: Optional[int] = None,
    force_send: bool = False,
) -> EmailVerification | None:
    if user.is_verified and not force_send:
        logger.debug("User already verified; skip sending code. user=%s", user.email)
        return None

    ttl_seconds = (
        ttl_seconds
        if ttl_seconds is not None
        else getattr(settings, "ACCOUNTS_VERIFICATION_CODE_TTL_SECONDS", 5 * 60)
    )

    expires_at = timezone.now() + datetime.timedelta(seconds=ttl_seconds)
    code = generate_code()

    # Invalidate previous codes
    EmailVerification.objects.filter(email=user.email, is_used=False).update(
        is_used=True
    )

    ev = EmailVerification.objects.create(
        email=user.email,
        code=code,
        expires_at=expires_at,
        is_used=False,
        verified=False,
    )

    logger.info(
        "Created email verification code for %s (expires %s)", user.email, expires_at
    )

    try:
        send_verification_email.delay(user.email, code, expires_in_seconds=ttl_seconds)
    except Exception:  # noqa: BLE001
        logger.exception("Failed to enqueue verification email for %s", user.email)

    return ev


def build_password_reset_url(user: User, token: str) -> str:
    base = getattr(
        settings,
        "FRONTEND_PASSWORD_RESET_URL",
        "http://localhost:3000/reset-password",
    )
    params = urlencode({"email": user.email, "token": token})
    return f"{base}?{params}"


def send_password_reset(user: User, token: str) -> None:
    reset_url = build_password_reset_url(user, token)
    logger.info("Sending password reset mail to %s", user.email)

    try:
        send_password_reset_email.delay(user.email, reset_url)
    except Exception:  # noqa: BLE001
        logger.exception("Failed to enqueue password reset email for %s", user.email)
