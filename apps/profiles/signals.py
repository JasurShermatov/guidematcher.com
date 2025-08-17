from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.users.models import User
from apps.profiles.models import CustomerProfile, ClientProfile


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:  # faqat yangi user yaratilganda ishlaydi
        if instance.role == "customer":
            CustomerProfile.objects.create(user=instance)
        elif instance.role == "client":
            ClientProfile.objects.create(user=instance)
