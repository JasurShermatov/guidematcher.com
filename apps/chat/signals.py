from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import ChatRoom, Message
from apps.notifications.services import NotificationService
from apps.bookings.models import BookingRequest
import logging

User = get_user_model()
logger = logging.getLogger(__name__)


@receiver(post_save, sender=BookingRequest)
def create_chat_room_for_booking(sender, instance, created, **kwargs):
    """
    Create a chat room when a booking request is created
    """
    if created and not kwargs.get("raw", False):
        try:
            # Check if chat room already exists
            if not ChatRoom.objects.filter(
                client=instance.client, guide=instance.guide
            ).exists():
                ChatRoom.objects.create(
                    client=instance.client, guide=instance.guide, is_active=True
                )
                notification = NotificationService.create_notification(
                    user=instance.guide,
                    notification_type="booking_request",
                    title="Yangi bron so'rovi",
                    message=f"{instance.client.full_name} sizga yangi bron so'rovini yubordi.",
                    priority="high",
                    action_url=f"/chat/{instance.id}/",
                    action_text="Chatga o'tish",
                )
                if notification and NotificationService.should_send_email(
                    instance.guide, "booking_request"
                ):
                    from apps.notifications.tasks import send_email_notification

                    send_email_notification.delay(notification.id)
                if notification and NotificationService.should_send_push(
                    instance.guide, "booking_request"
                ):
                    NotificationService.send_push_notification(notification)
                logger.info(
                    f"Chat room and notification created for booking request {instance.id}"
                )
        except Exception as e:
            logger.error(
                f"Error creating chat room for booking {instance.id}: {str(e)}"
            )


@receiver(post_save, sender=Message)
def update_chat_room_timestamp(sender, instance, created, **kwargs):
    """
    Update chat room's last_message_at when a new message is sent
    """
    if created and not kwargs.get("raw", False):
        try:
            instance.room.last_message_at = timezone.now()
            instance.room.save(update_fields=["last_message_at"])
            logger.info(f"Updated last_message_at for chat room {instance.room.id}")
        except Exception as e:
            logger.error(
                f"Error updating chat room timestamp {instance.room.id}: {str(e)}"
            )
