from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from .models import User, EmailVerification
import uuid
import logging

logger = logging.getLogger(__name__)


@receiver(post_save, sender=User)
def create_email_verification(sender, instance, created, **kwargs):
    """
    Create an email verification token for new users
    """
    if created and not instance.is_verified:
        try:
            token = str(uuid.uuid4())
            expires_at = timezone.now() + timezone.timedelta(hours=24)
            EmailVerification.objects.create(
                user=instance, token=token, expires_at=expires_at
            )
            # Placeholder for sending email
            logger.info(
                f"Email verification token created for {instance.email}: {token}"
            )
            # Example: send_verification_email(instance.email, token)
        except Exception as e:
            logger.error(
                f"Error creating email verification for {instance.email}: {str(e)}"
            )
