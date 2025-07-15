# apps/users/tasks.py
from celery import shared_task
from apps.common.utils import send_email_notification


@shared_task
def send_verification_email(to_email: str, code: str):
    send_email_notification(
        recipient_email=to_email,
        subject="Verify your email",
        template_name="emails/verify_email.html",
        context={"code": code},
    )


@shared_task
def send_password_reset_email(to_email: str, token: str):
    send_email_notification(
        recipient_email=to_email,
        subject="Password reset",
        template_name="emails/password_reset.html",
        context={"token": token},
    )
