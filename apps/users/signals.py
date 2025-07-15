# apps/users/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

from apps.users.models import User, EmailVerification
from apps.profiles.models import ClientProfile, CustomerProfile
from apps.notifications.models import UserNotificationSettings
from apps.common.utils import generate_random_code
from apps.users.tasks import send_verification_email


@receiver(post_save, sender=User)
def create_related_objects(sender, instance: User, created, **kwargs):
    """
    • Foydalanuvchi yaratildi → tegishli profil & notification settings yaratish
    • E-mail tasdiqlanmagan bo‘lsa → verifikatsiya kodini yuborish
    """
    if not created:
        return

    # --- Profil ---
    if instance.is_client and not hasattr(instance, "client_profile"):
        ClientProfile.objects.create(user=instance)
    elif instance.is_customer and not hasattr(instance, "customer_profile"):
        CustomerProfile.objects.create(user=instance)

    # --- Notification settings ---
    UserNotificationSettings.objects.get_or_create(user=instance)

    # --- Email verification ---
    if not instance.is_verified:
        code = generate_random_code()
        ev = EmailVerification.objects.create(
            user=instance,
            email=instance.email,
            code=code,
            expires_at=timezone.now() + timezone.timedelta(minutes=15),
        )
        # Celery background task
        send_verification_email.delay(instance.email, code)


@receiver(post_save, sender=EmailVerification)
def send_verification_on_create(sender, instance: EmailVerification, created, **kwargs):
    """
    Agar EmailVerification yozuvi qo‘lda yaratilsa (admin, cron va h.k.)
    ham e-mail jo‘natilsin.
    """
    if created:
        send_verification_email.delay(instance.email, instance.code)
