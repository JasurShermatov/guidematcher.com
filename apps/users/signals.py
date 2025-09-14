# apps/users/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db import transaction
from apps.users.models import User
from apps.profiles.models import ClientProfile, CustomerProfile
from apps.users.models import UserNotificationSettings

@receiver(post_save, sender=User)
def create_related_objects(sender, instance: User, created, **kwargs):
    """
    Har bir yangi User uchun:
    - Role CLIENT -> ClientProfile
    - Role CUSTOMER -> CustomerProfile
    - Har doim -> UserNotificationSettings
    """
    if not created:
        return

    try:
        with transaction.atomic():
            if instance.role == User.UserRole.CLIENT:
                ClientProfile.objects.get_or_create(user=instance)
            elif instance.role == User.UserRole.CUSTOMER:
                CustomerProfile.objects.get_or_create(user=instance)

            UserNotificationSettings.objects.get_or_create(user=instance)
    except Exception as e:
        # Productionda logging ishlatish tavsiya qilinadi
        import logging

        logger = logging.getLogger(__name__)
        logger.error(f"[User Signals] Related objects yaratishda xatolik: {e}")
