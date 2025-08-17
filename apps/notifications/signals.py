from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from .models import Notification, NotificationPreference
from .services import NotificationService
import logging
from django.utils import timezone

User = get_user_model()
logger = logging.getLogger(__name__)


@receiver(post_save, sender=User)
def create_notification_preferences(sender, instance, created, **kwargs):
    """
    Create NotificationPreference instance for new users
    """
    if created:
        try:
            NotificationPreference.objects.create(user=instance)
            logger.info(f"Notification preferences created for user {instance.email}")
        except Exception as e:
            logger.error(
                f"Error creating notification preferences for {instance.email}: {str(e)}"
            )


@receiver(post_save, sender=User)
def send_welcome_notification(sender, instance, created, **kwargs):
    """
    Send welcome notification after user registration
    """
    if created and not instance.is_verified:
        try:
            notification = Notification.create_notification(
                user=instance,
                notification_type="system_update",
                title="TravMatch ga xush kelibsiz!",
                message=f"Assalomu alaykum, {instance.full_name}! TravMatch platformasiga xush kelibsiz. Iltimos, emailingizni tasdiqlang.",
                priority="medium",
                action_url="/verify-email/",
                action_text="Emailni tasdiqlash",
            )
            if NotificationService.should_send_email(instance, "system_update"):
                from .tasks import send_email_notification

                send_email_notification.delay(notification.id)
            if NotificationService.should_send_push(instance, "system_update"):
                NotificationService.send_push_notification(notification)
            logger.info(f"Welcome notification sent to {instance.email}")
        except Exception as e:
            logger.error(
                f"Error sending welcome notification to {instance.email}: {str(e)}"
            )


@receiver(post_save, sender=Notification)
def log_notification_creation(sender, instance, created, **kwargs):
    """
    Log notification creation for debugging
    """
    if created:
        try:
            logger.info(
                f"Notification created: {instance.title} for {instance.user.email} (type: {instance.type})"
            )
        except Exception as e:
            logger.error(
                f"Error logging notification creation for {instance.id}: {str(e)}"
            )


@receiver(post_save, sender="users.EmailVerification")
def send_verification_success_notification(sender, instance, **kwargs):
    """
    Send notification after successful email verification
    """
    if instance.is_used and not instance.updated_at > instance.created_at:
        try:
            notification = Notification.create_notification(
                user=instance.user,
                notification_type="system_update",
                title="Email tasdiqlandi",
                message="Email manzilingiz muvaffaqiyatli tasdiqlandi. Endi siz platformaning barcha funksiyalaridan foydalanishingiz mumkin!",
                priority="medium",
                action_url="/profile/",
                action_text="Profilni ko'rish",
            )
            if NotificationService.should_send_email(instance.user, "system_update"):
                from .tasks import send_email_notification

                send_email_notification.delay(notification.id)
            if NotificationService.should_send_push(instance.user, "system_update"):
                NotificationService.send_push_notification(notification)
            logger.info(
                f"Verification success notification sent to {instance.user.email}"
            )
        except Exception as e:
            logger.error(
                f"Error sending verification success notification to {instance.user.email}: {str(e)}"
            )


@receiver(post_save, sender="bookings.Booking")
def notify_booking_status_change(sender, instance, created, **kwargs):
    """
    Send notification on booking status change
    """
    if not created and instance.status in ["confirmed", "cancelled", "completed"]:
        try:
            notification_type = {
                "confirmed": "booking_confirmed",
                "cancelled": "booking_cancelled",
                "completed": "booking_completed",
            }.get(instance.status)
            if notification_type:
                NotificationService.send_booking_notification(
                    instance, notification_type
                )
        except Exception as e:
            logger.error(
                f"Error sending booking status notification for booking {instance.id}: {str(e)}"
            )


@receiver(post_save, sender="chat.Message")
def notify_new_message(sender, instance, created, **kwargs):
    """
    Send notification for new chat messages
    """
    if created:
        try:
            from apps.chat.models import Message

            message = instance
            receiver = message.receiver
            sender = message.sender
            NotificationService.send_message_notification(message, sender, receiver)
        except Exception as e:
            logger.error(
                f"Error sending new message notification for message {instance.id}: {str(e)}"
            )
