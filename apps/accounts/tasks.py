# apps/accounts/tasks.py
import logging
from celery import shared_task
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, max_retries=3)
def send_verification_email(self, email, code, expires_in_seconds=100):
    logger.info("Sending verification email -> %s (%s)", email, code)

    context = {"code": code, "expires_in_seconds": expires_in_seconds}
    html_content = render_to_string("emails/verification_code.html", context)
    text_content = f"Your GuideMatcher verification code: {code}\nExpires in {expires_in_seconds} seconds."

    subject = "GuideMatcher Verification Code"
    from_email = settings.DEFAULT_FROM_EMAIL

    msg = EmailMultiAlternatives(subject, text_content, from_email, [email])
    msg.attach_alternative(html_content, "text/html")
    sent = msg.send(fail_silently=False)

    logger.info("Email sent result=%s to=%s", sent, email)
    return sent
