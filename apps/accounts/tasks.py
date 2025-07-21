# apps/accounts/tasks.py
import logging
from celery import shared_task
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)


# ------------------------------------------------------------------
# Verification e-mail
# ------------------------------------------------------------------
@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, max_retries=3)
def send_verification_email(self, email: str, code: str, expires_in_seconds: int = 100):
    """
    Emailga tasdiqlash (verification) kodi yuborish.
    """
    logger.info("Sending verification email -> %s (%s)", email, code)
    print(f"[EMAIL TASK] Yuborilmoqda: {email=} {code=}")

    try:
        context = {"code": code, "expires_in_seconds": expires_in_seconds}
        html_content = render_to_string("emails/verification_code.html", context)
        text_content = (
            f"Your GuideMatcher verification code: {code}\n"
            f"Expires in {expires_in_seconds} seconds."
        )

        subject = "GuideMatcher Verification Code"
        from_email = settings.DEFAULT_FROM_EMAIL

        msg = EmailMultiAlternatives(subject, text_content, from_email, [email])
        msg.attach_alternative(html_content, "text/html")
        sent = msg.send(fail_silently=False)

        logger.info("Verification email sent result=%s to=%s", sent, email)
        print(f"[EMAIL TASK] Yuborildi: {sent=}")
        return sent

    except Exception as e:
        logger.error(
            "Failed to send verification email to %s: %s", email, str(e), exc_info=True
        )
        print(f"[EMAIL ERROR] {type(e).__name__}: {e}")
        raise e  # Celery qayta urinib ko‘rishi uchun


# ------------------------------------------------------------------
# Password reset e-mail
# ------------------------------------------------------------------
@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, max_retries=3)
def send_password_reset_email(
    self, email: str, reset_url: str, token: str | None = None
):
    """
    Password reset e-mail.
    """
    logger.info("Sending password reset email -> %s", email)
    print(f"[EMAIL TASK] Parol tiklash yuborilmoqda: {email=}")

    try:
        context = {"reset_url": reset_url, "token": token}
        html_content = render_to_string("emails/password_reset.html", context)

        # Text fallback (plain)
        lines = [
            "You requested a password reset for your GuideMatcher account.",
            f"Reset your password: {reset_url}",
        ]
        if token:
            lines.append(f"Reset token: {token}")
        text_content = "\n".join(lines)

        subject = "GuideMatcher Password Reset"
        from_email = settings.DEFAULT_FROM_EMAIL

        msg = EmailMultiAlternatives(subject, text_content, from_email, [email])
        msg.attach_alternative(html_content, "text/html")
        sent = msg.send(fail_silently=False)

        logger.info("Password reset email sent result=%s to=%s", sent, email)
        print(f"[EMAIL TASK] Parol tiklash yuborildi: {sent=}")
        return sent

    except Exception as e:
        logger.error(
            "Failed to send password reset email to %s: %s",
            email,
            str(e),
            exc_info=True,
        )
        print(f"[EMAIL ERROR] {type(e).__name__}: {e}")
        raise e
