# apps/accounts/tasks.py
from celery import shared_task
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string


@shared_task(bind=True, max_retries=3, default_retry_delay=10)
def send_verification_email(self, email: str, code: str, purpose: str) -> None:
    """
    purpose: register | reset_password | change_email
    """
    ctx = {"code": code, "purpose": purpose.capitalize()}
    subject = f"TravMatch • {ctx['purpose']} verification code"
    html_body = render_to_string("emails/verification.html", ctx)
    msg = EmailMultiAlternatives(subject, html_body, settings.DEFAULT_FROM_EMAIL, [email])
    msg.attach_alternative(html_body, "text/html")
    msg.send()