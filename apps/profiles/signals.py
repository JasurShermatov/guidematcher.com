# apps/profiles/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.users.models import User
from .models import CustomerProfile, ClientProfile
import logging

logger = logging.getLogger(__name__)


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):

    if created:
        print(f"🔄 Signal ishga tushdi: {instance.email} | Role: {instance.role}")

        try:
            user_role = instance.role

            if user_role == User.UserRole.CUSTOMER:
                profile, prof_created = CustomerProfile.objects.get_or_create(
                    user=instance,
                    defaults={
                        "professional_bio": "",
                        "years_of_experience": 0,
                        "city": None,
                        "service_areas": "",
                        "currency": "USD",
                        "verification_status": CustomerProfile.VerificationStatus.PENDING,
                        "total_bookings": 0,
                        "total_reviews": 0,
                        "average_rating": 0,
                        "is_available": True,
                    },
                )
                if prof_created:
                    logger.info(
                        f"✅ CustomerProfile yaratildi: ID={profile.id} | User={instance.email}"
                    )
                    print(f"✅ CustomerProfile yaratildi: ID={profile.id}")
                else:
                    logger.info(f"ℹ️ CustomerProfile allaqachon mavjud: ID={profile.id}")

            elif user_role == User.UserRole.CLIENT:  # Enum ishlatish
                profile, prof_created = ClientProfile.objects.get_or_create(
                    user=instance,
                    defaults={
                        "preferred_contact": "chat",
                    },
                )
                if prof_created:
                    logger.info(f"✅ ClientProfile yaratildi: {instance.email}")
                    print(f"✅ ClientProfile yaratildi: {instance.email}")
                else:
                    logger.info(f"ℹ️ ClientProfile allaqachon mavjud")

            else:
                logger.warning(f"⚠️ Noma'lum role: '{instance.role}' - {instance.email}")
                print(f"⚠️ Noma'lum role: '{instance.role}' - {instance.email}")

        except Exception as e:
            error_msg = (
                f"❌ Profil yaratishda xatolik: {str(e)} | User: {instance.email}"
            )
            logger.error(error_msg)
            print(error_msg)
            import traceback

            print(traceback.format_exc())


print("📡 Profile signals moduli yuklandi")
