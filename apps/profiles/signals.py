# apps/profiles/signals.py
# apps/profiles/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.users.models import User
from .models import CustomerProfile, ClientProfile
import logging

logger = logging.getLogger(__name__)


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """
    User yaratilgandan keyin avtomatik ravishda tegishli profil yaratadi
    """
    if created:
        try:
            # Role ni case-insensitive tekshirish
            role = instance.role.lower() if instance.role else None

            if role == "customer":
                # CustomerProfile yaratish - city ixtiyoriy
                profile, prof_created = CustomerProfile.objects.get_or_create(
                    user=instance,
                    defaults={
                        "professional_bio": "",  # Bo'sh string
                        "years_of_experience": 0,
                        "city": None,  # Keyinchalik to'ldiradi
                    },
                )
                if prof_created:
                    logger.info(f"✅ CustomerProfile yaratildi: {instance.email}")

            elif role == "client":
                profile, prof_created = ClientProfile.objects.get_or_create(
                    user=instance
                )
                if prof_created:
                    logger.info(f"✅ ClientProfile yaratildi: {instance.email}")

            else:
                logger.warning(f"⚠️ Noma'lum role: {instance.role} - {instance.email}")

        except Exception as e:
            logger.error(f"❌ Profil yaratishda xatolik: {e} - User: {instance.email}")
