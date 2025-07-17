# apps/users/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.users.models import User
from apps.profiles.models import ClientProfile, CustomerProfile
from apps.notifications.models import UserNotificationSettings


@receiver(post_save, sender=User)
def create_related_objects(sender, instance: User, created, **kwargs):
    """
    Yangi foydalanuvchi yaratilganda:
      • tegishli profil (client/customer)
      • notification settings
    E-mail verifikatsiyani bu yerda yubormaymiz (accounts app mas'ul).
    """
    if not created:
        return

    if instance.is_client and not hasattr(instance, "client_profile"):
        ClientProfile.objects.create(user=instance)
    elif instance.is_customer and not hasattr(instance, "customer_profile"):
        CustomerProfile.objects.create(user=instance)

    UserNotificationSettings.objects.get_or_create(user=instance)
