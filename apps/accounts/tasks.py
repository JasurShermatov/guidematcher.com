# apps/accounts/tasks.py
import logging
from celery import shared_task
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, max_retries=3)
def send_verification_email(self, email: str, code: str, expires_in_seconds: int = 300):
    logger.info(f"Sending verification email to {email} with code {code}")
    try:
        context = {"code": code, "expires_in_seconds": expires_in_seconds}
        html_content = render_to_string("emails/verification_code.html", context)
        text_content = (
            f"Your TravMatch verification code: {code}\n"
            f"Expires in {expires_in_seconds} seconds."
        )

        subject = "TravMatch Verification Code"
        from_email = settings.DEFAULT_FROM_EMAIL

        msg = EmailMultiAlternatives(subject, text_content, from_email, [email])
        msg.attach_alternative(html_content, "text/html")
        sent = msg.send(fail_silently=False)

        logger.info(f"Verification email sent to {email}, result={sent}")
        return sent
    except Exception as e:
        logger.error(
            f"Failed to send verification email to {email}: {str(e)}", exc_info=True
        )
        raise e


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, max_retries=3)
def send_password_reset_email(
    self, email: str, reset_url: str, token: str | None = None
):
    logger.info(f"Sending password reset email to {email}")
    try:
        context = {"reset_url": reset_url, "token": token}
        html_content = render_to_string("emails/password_reset.html", context)
        text_content = (
            f"You requested a password reset for your TravMatch account.\n"
            f"Reset your password: {reset_url}\n"
            f"Reset token: {token or 'N/A'}"
        )

        subject = "TravMatch Password Reset"
        from_email = settings.DEFAULT_FROM_EMAIL

        msg = EmailMultiAlternatives(subject, text_content, from_email, [email])
        msg.attach_alternative(html_content, "text/html")
        sent = msg.send(fail_silently=False)

        logger.info(f"Password reset email sent to {email}, result={sent}")
        return sent
    except Exception as e:
        logger.error(
            f"Failed to send password reset email to {email}: {str(e)}", exc_info=True
        )
        raise e


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, max_retries=3)
def send_welcome_email(self, email: str, first_name: str):
    logger.info(f"Sending welcome email to {email}")
    try:
        context = {"first_name": first_name}
        html_content = render_to_string("emails/welcome.html", context)
        text_content = (
            f"Welcome to TravMatch, {first_name}!\n"
            "Your account has been successfully created. Start exploring now!"
        )

        subject = "Welcome to TravMatch!"
        from_email = settings.DEFAULT_FROM_EMAIL

        msg = EmailMultiAlternatives(subject, text_content, from_email, [email])
        msg.attach_alternative(html_content, "text/html")
        sent = msg.send(fail_silently=False)

        logger.info(f"Welcome email sent to {email}, result={sent}")
        return sent
    except Exception as e:
        logger.error(
            f"Failed to send welcome email to {email}: {str(e)}", exc_info=True
        )
        raise e
