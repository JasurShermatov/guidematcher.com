from django.contrib.auth import get_user_model
from django.urls import reverse
from .models import Notification, NotificationPreference, EmailLog
import logging
from django.utils import timezone
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from .serializers import NotificationSerializer

User = get_user_model()
logger = logging.getLogger(__name__)


class NotificationService:
    """
    Service class for handling notifications
    """

    @staticmethod
    def should_send_email(user, notification_type):
        """
        Check if email should be sent based on user preferences
        """
        try:
            preferences = NotificationPreference.objects.get(user=user)
            preference_map = {
                "booking_request": preferences.email_booking_requests,
                "booking_confirmed": preferences.email_booking_updates,
                "booking_cancelled": preferences.email_booking_updates,
                "booking_completed": preferences.email_booking_updates,
                "new_message": preferences.email_messages,
                "new_review": preferences.email_reviews,
                "promotion": preferences.email_promotions,
                "system_update": preferences.email_system_updates,
            }
            return preference_map.get(notification_type, False)
        except NotificationPreference.DoesNotExist:
            logger.warning(f"No notification preferences for user {user.email}")
            return True  # Default to sending if no preferences set

    @staticmethod
    def should_send_push(user, notification_type):
        """
        Check if push notification should be sent based on user preferences
        """
        try:
            preferences = NotificationPreference.objects.get(user=user)
            preference_map = {
                "booking_request": preferences.push_booking_requests,
                "booking_confirmed": preferences.push_booking_updates,
                "booking_cancelled": preferences.push_booking_updates,
                "booking_completed": preferences.push_booking_updates,
                "new_message": preferences.push_messages,
                "new_review": preferences.push_reviews,
                "promotion": preferences.push_promotions,
            }
            return preference_map.get(notification_type, False)
        except NotificationPreference.DoesNotExist:
            logger.warning(f"No notification preferences for user {user.email}")
            return True  # Default to sending if no preferences set

    @staticmethod
    def send_booking_notification(booking, notification_type):
        """
        Send notification for booking-related events
        """
        try:
            user = (
                booking.client
                if notification_type in ["booking_confirmed", "booking_completed"]
                else booking.guide
            )
            title_map = {
                "booking_confirmed": "Bron tasdiqlandi",
                "booking_cancelled": "Bron bekor qilindi",
                "booking_completed": "Bron yakunlandi",
            }
            message_map = {
                "booking_confirmed": f"Sizning {booking.title} broningiz tasdiqlandi.",
                "booking_cancelled": f"Sizning {booking.title} broningiz bekor qilindi.",
                "booking_completed": f"Sizning {booking.title} broningiz muvaffaqiyatli yakunlandi.",
            }
            action_url = f"{reverse('bookings:booking_detail', args=[booking.id])}"
            notification = Notification.create_notification(
                user=user,
                notification_type=notification_type,
                title=title_map.get(notification_type, "Bron yangilanishi"),
                message=message_map.get(notification_type, "Bron statusi yangilandi."),
                priority=(
                    "high" if notification_type == "booking_confirmed" else "medium"
                ),
                action_url=action_url,
                action_text="Batafsil",
                booking_id=booking.id,
            )
            if NotificationService.should_send_email(user, notification_type):
                from .tasks import send_email_notification

                send_email_notification.delay(notification.id)
            if NotificationService.should_send_push(user, notification_type):
                NotificationService.send_push_notification(notification)
            logger.info(
                f"Booking notification sent to {user.email}: {notification_type}"
            )
            return notification
        except Exception as e:
            logger.error(f"Error sending booking notification: {str(e)}")
            return None

    @staticmethod
    def send_booking_request_notification(booking_request, notification_type):
        """
        Send notification for booking request-related events
        """
        try:
            user = (
                booking_request.guide
                if notification_type == "new_request"
                else booking_request.client
            )
            title_map = {
                "new_request": "Yangi bron so'rovi",
                "request_accept": "So'rov qabul qilindi",
                "request_reject": "So'rov rad etildi",
                "request_counter": "Qarshi taklif",
            }
            message_map = {
                "new_request": f"{booking_request.client.full_name} sizga yangi bron so'rovini yubordi.",
                "request_accept": f"Sizning {booking_request.requested_service.name} so'rovingiz qabul qilindi.",
                "request_reject": f"Sizning {booking_request.requested_service.name} so'rovingiz rad etildi.",
                "request_counter": f"{booking_request.guide.full_name} sizning so'rovingizga qarshi taklif yubordi.",
            }
            action_url = f"{reverse('bookings:booking_request_detail', args=[booking_request.id])}"
            notification = Notification.create_notification(
                user=user,
                notification_type=notification_type,
                title=title_map.get(notification_type, "So'rov yangilanishi"),
                message=message_map.get(
                    notification_type, "So'rov statusi yangilandi."
                ),
                priority="high" if notification_type == "new_request" else "medium",
                action_url=action_url,
                action_text="Batafsil",
                booking_id=booking_request.id,
            )
            if NotificationService.should_send_email(user, notification_type):
                from .tasks import send_email_notification

                send_email_notification.delay(notification.id)
            if NotificationService.should_send_push(user, notification_type):
                NotificationService.send_push_notification(notification)
            logger.info(
                f"Booking request notification sent to {user.email}: {notification_type}"
            )
            return notification
        except Exception as e:
            logger.error(f"Error sending booking request notification: {str(e)}")
            return None

    @staticmethod
    def send_message_notification(message, sender, receiver):
        """
        Send notification for new messages
        """
        try:
            notification = Notification.create_notification(
                user=receiver,
                notification_type="new_message",
                title="Yangi xabar",
                message=f"{sender.full_name} sizga xabar yubordi: {message.content[:50]}...",
                priority="medium",
                action_url=f"{reverse('chat:conversation_detail', args=[message.conversation_id])}",
                action_text="Xabarni ko'rish",
                message_id=message.id,
            )
            if NotificationService.should_send_email(receiver, "new_message"):
                from .tasks import send_email_notification

                send_email_notification.delay(notification.id)
            if NotificationService.should_send_push(receiver, "new_message"):
                NotificationService.send_push_notification(notification)
            logger.info(f"Message notification sent to {receiver.email}")
            return notification
        except Exception as e:
            logger.error(f"Error sending message notification: {str(e)}")
            return None

    @staticmethod
    def send_push_notification(notification):
        """
        Send push notification via WebSocket
        """
        try:
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f"user_{notification.user.id}",
                {
                    "type": "notification_message",
                    "notification": NotificationSerializer(notification).data,
                },
            )
            notification.push_sent = True
            notification.push_sent_at = timezone.now()
            notification.save(update_fields=["push_sent", "push_sent_at"])
            logger.info(f"Push notification sent to {notification.user.email}")
        except Exception as e:
            logger.error(f"Error sending push notification: {str(e)}")
