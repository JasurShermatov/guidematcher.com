from celery import shared_task
from django.core.mail import send_mass_mail
from django.conf import settings


@shared_task
def send_admin_broadcast_email(email_list, subject, body):
    msgs = [(subject, body, settings.DEFAULT_FROM_EMAIL, [e]) for e in email_list]
    send_mass_mail(msgs, fail_silently=False)
