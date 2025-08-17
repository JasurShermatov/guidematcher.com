from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import ClientProfile, GuideProfile, GuideLanguage, Portfolio, Favorite
from apps.notifications.services import NotificationService
import logging

User = get_user_model()
logger = logging.getLogger(__name__)


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """
    Create ClientProfile or GuideProfile for new users
    """
    if created:
        try:
            if instance.role == "Guide":
                GuideProfile.objects.create(user=instance)
                notification = NotificationService.create_notification(
                    user=instance,
                    notification_type="system_update",
                    title="Gid profili yaratildi",
                    message="TravMatch platformasida gid profilingiz muvaffaqiyatli yaratildi. Profilni to'ldiring va tasdiqlash uchun yuboring.",
                    priority="medium",
                    action_url="/profile/",
                    action_text="Profilni ko'rish",
                )
                if notification and NotificationService.should_send_email(
                    instance, "system_update"
                ):
                    from apps.notifications.tasks import send_email_notification

                    send_email_notification.delay(notification.id)
                if notification and NotificationService.should_send_push(
                    instance, "system_update"
                ):
                    NotificationService.send_push_notification(notification)
                logger.info(
                    f"Guide profile and notification created for user {instance.email}"
                )
            else:
                ClientProfile.objects.create(user=instance)
                notification = NotificationService.create_notification(
                    user=instance,
                    notification_type="system_update",
                    title="Mijoz profili yaratildi",
                    message="TravMatch platformasida mijoz profilingiz muvaffaqiyatli yaratildi. Profilni to'ldiring va sayohatlarni boshlang!",
                    priority="medium",
                    action_url="/profile/",
                    action_text="Profilni ko'rish",
                )
                if notification and NotificationService.should_send_email(
                    instance, "system_update"
                ):
                    from apps.notifications.tasks import send_email_notification

                    send_email_notification.delay(notification.id)
                if notification and NotificationService.should_send_push(
                    instance, "system_update"
                ):
                    NotificationService.send_push_notification(notification)
                logger.info(
                    f"Client profile and notification created for user {instance.email}"
                )
        except Exception as e:
            logger.error(f"Error creating profile for {instance.email}: {str(e)}")


@receiver(post_save, sender=GuideProfile)
def notify_guide_verification(sender, instance, **kwargs):
    """
    Send notification when a guide's profile is verified
    """
    if (
        instance.is_verified
        and instance.verification_date
        and not kwargs.get("raw", False)
    ):
        try:
            notification = NotificationService.create_notification(
                user=instance.user,
                notification_type="system_update",
                title="Gid profili tasdiqlandi",
                message="Sizning gid profilingiz muvaffaqiyatli tasdiqlandi! Endi mijozlar sizni qidiruvda ko'ra oladi.",
                priority="high",
                action_url="/profile/",
                action_text="Profilni ko'rish",
            )
            if notification and NotificationService.should_send_email(
                instance.user, "system_update"
            ):
                from apps.notifications.tasks import send_email_notification

                send_email_notification.delay(notification.id)
            if notification and NotificationService.should_send_push(
                instance.user, "system_update"
            ):
                NotificationService.send_push_notification(notification)
            logger.info(f"Verification notification sent to {instance.user.email}")
        except Exception as e:
            logger.error(
                f"Error sending verification notification for {instance.user.email}: {str(e)}"
            )


@receiver(post_save, sender="bookings.Booking")
def update_guide_total_tours(sender, instance, **kwargs):
    """
    Update total_tours for guide when a booking is completed
    """
    if instance.status == "completed" and not kwargs.get("raw", False):
        try:
            guide_profile = GuideProfile.objects.get(user=instance.guide)
            guide_profile.total_tours = instance.guide.bookings.filter(
                status="completed"
            ).count()
            guide_profile.save(update_fields=["total_tours"])
            logger.info(
                f"Updated total_tours for guide {instance.guide.email}: {guide_profile.total_tours}"
            )
        except GuideProfile.DoesNotExist:
            logger.error(f"Guide profile not found for {instance.guide.email}")
        except Exception as e:
            logger.error(
                f"Error updating total_tours for {instance.guide.email}: {str(e)}"
            )


@receiver(post_save, sender="reviews.Review")
def update_guide_rating(sender, instance, **kwargs):
    """
    Update guide's average_rating when a new review is added
    """
    if instance.guide and not kwargs.get("raw", False):
        try:
            guide_profile = GuideProfile.objects.get(user=instance.guide)
            guide_profile.update_rating()
            logger.info(
                f"Updated average_rating for guide {instance.guide.email}: {guide_profile.average_rating}"
            )
        except GuideProfile.DoesNotExist:
            logger.error(f"Guide profile not found for {instance.guide.email}")
        except Exception as e:
            logger.error(
                f"Error updating average_rating for {instance.guide.email}: {str(e)}"
            )


@receiver(post_save, sender=Portfolio)
def notify_portfolio_update(sender, instance, created, **kwargs):
    """
    Send notification when a guide adds or updates a portfolio item
    """
    if not kwargs.get("raw", False):
        try:
            action = "yuklandi" if created else "yangilandi"
            notification = NotificationService.create_notification(
                user=instance.guide,
                notification_type="system_update",
                title=f"Portfolio elementi {action}",
                message=f"Sizning portfolio elementingiz ({instance.title}) muvaffaqiyatli {action}.",
                priority="medium",
                action_url="/profile/portfolio/",
                action_text="Portfolioni ko'rish",
            )
            if notification and NotificationService.should_send_email(
                instance.guide, "system_update"
            ):
                from apps.notifications.tasks import send_email_notification

                send_email_notification.delay(notification.id)
            if notification and NotificationService.should_send_push(
                instance.guide, "system_update"
            ):
                NotificationService.send_push_notification(notification)
            logger.info(
                f"Portfolio {action} notification sent to {instance.guide.email}"
            )
        except Exception as e:
            logger.error(
                f"Error sending portfolio {action} notification for {instance.guide.email}: {str(e)}"
            )


@receiver(post_save, sender=Favorite)
def notify_favorite_added(sender, instance, created, **kwargs):
    """
    Send notification to guide when a client adds them to favorites
    """
    if created and instance.guide and not kwargs.get("raw", False):
        try:
            notification = NotificationService.create_notification(
                user=instance.guide,
                notification_type="system_update",
                title="Siz sevimlilarga qo'shildingiz",
                message=f"{instance.user.full_name} sizni sevimli gidlar ro'yxatiga qo'shdi.",
                priority="low",
                action_url=f"/profiles/{instance.user.id}/",
                action_text="Foydalanuvchi profilini ko'rish",
            )
            if notification and NotificationService.should_send_email(
                instance.guide, "system_update"
            ):
                from apps.notifications.tasks import send_email_notification

                send_email_notification.delay(notification.id)
            if notification and NotificationService.should_send_push(
                instance.guide, "system_update"
            ):
                NotificationService.send_push_notification(notification)
            logger.info(f"Favorite notification sent to {instance.guide.email}")
        except Exception as e:
            logger.error(
                f"Error sending favorite notification to {instance.guide.email}: {str(e)}"
            )


@receiver(post_delete, sender=Favorite)
def notify_favorite_removed(sender, instance, **kwargs):
    """
    Send notification to guide when a client removes them from favorites
    """
    if instance.guide and not kwargs.get("raw", False):
        try:
            notification = NotificationService.create_notification(
                user=instance.guide,
                notification_type="system_update",
                title="Sevimlilardan o'chirildingiz",
                message=f"{instance.user.full_name} sizni sevimli gidlar ro'yxatidan o'chirdi.",
                priority="low",
                action_url=f"/profiles/{instance.user.id}/",
                action_text="Foydalanuvchi profilini ko'rish",
            )
            if notification and NotificationService.should_send_email(
                instance.guide, "system_update"
            ):
                from apps.notifications.tasks import send_email_notification

                send_email_notification.delay(notification.id)
            if notification and NotificationService.should_send_push(
                instance.guide, "system_update"
            ):
                NotificationService.send_push_notification(notification)
            logger.info(f"Favorite removal notification sent to {instance.guide.email}")
        except Exception as e:
            logger.error(
                f"Error sending favorite removal notification to {instance.guide.email}: {str(e)}"
            )
