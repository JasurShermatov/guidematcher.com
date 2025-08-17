# apps/users/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db import transaction

from apps.users.models import User
from apps.profiles.models import ClientProfile, CustomerProfile
from apps.notifications.models import UserNotificationSettings


@receiver(post_save, sender=User)
def create_related_objects(sender, instance: User, created, **kwargs):
    """
    Har bir yangi User uchun avtomatik ravishda tegishli profile va notification settings yaratish.
    - Agar role = client -> ClientProfile
    - Agar role = customer -> CustomerProfile
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
        # TODO: productionda logging ishlatish
        print(f"[User Signals] Related objects yaratishda xatolik: {e}")
