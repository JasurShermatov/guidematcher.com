import logging
from celery import shared_task
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, max_retries=3)
def send_verification_email(self, email, code, expires_in_seconds=100):
    """
    Verifikatsiya kodini yuboradi.
    retry_backoff=True -> 1s, 2s, 4s ... qayta urinish.
    """
    try:
        logger.info(f"📤 Email yuborilmoqda: {email}, code: {code}")
        html_content = render_to_string(
            'emails/verification_code.html',
            {'code': code, 'expires_in_seconds': expires_in_seconds}
        )
        subject = "GuideMatcher – Email tasdiqlash kodi"
        from_email = settings.DEFAULT_FROM_EMAIL

        # Plain text (spam kamaytiradi)
        text_content = f"Sizning tasdiqlash kodingiz: {code}\n" \
                       f"Kod {expires_in_seconds} soniya ichida eskiradi.\n" \
                       "Agar siz bu kodni so‘ramagan bo‘lsangiz, e’tibor bermang."

        msg = EmailMultiAlternatives(subject, text_content, from_email, [email])
        msg.attach_alternative(html_content, "text/html")
        sent = msg.send()

        logger.info(f"✅ Email yuborildi ({sent}): {email}")
    except Exception as e:
        logger.error(
            f"❌ Email yuborishda xatolik: {email} | {str(e)}",
            exc_info=True
        )
        raise  # Celery retry ishlashi uchun qayta ko‘tarib yuboramiz