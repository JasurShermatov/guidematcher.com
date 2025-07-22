from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.users.models import User
from apps.profiles.models import ClientProfile, CustomerProfile
from apps.notifications.models import UserNotificationSettings


@receiver(post_save, sender=User)
def create_related_objects(sender, instance: User, created, **kwargs):
    """
    User yaratilganda avtomatik bog‘liq obyektlarni yaratadi:
    - ClientProfile yoki CustomerProfile
    - UserNotificationSettings
    """
    if not created:
        return

    if instance.is_client:
        ClientProfile.objects.get_or_create(user=instance)

    elif instance.is_customer:
        CustomerProfile.objects.get_or_create(user=instance)

    UserNotificationSettings.objects.get_or_create(user=instance)
