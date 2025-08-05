import json
import logging
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model
from channels.db import database_sync_to_async
from apps.notifications.models import Notification

User = get_user_model()
logger = logging.getLogger(__name__)


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer for handling notifications
    """

    async def connect(self):
        """
        Handle WebSocket connection with JWT authentication
        """
        try:
            # Extract token from query string
            query_string = self.scope["query_string"].decode()
            token = None
            for param in query_string.split("&"):
                if param.startswith("token="):
                    token = param.split("=")[1]
                    break

            if not token:
                logger.error("No token provided in WebSocket connection")
                await self.close()
                return

            # Validate JWT token
            access_token = AccessToken(token)
            user_id = access_token["user_id"]
            user = await database_sync_to_async(User.objects.get)(id=user_id)
            self.user = user

            # Add user to their notification group
            self.group_name = f"user_{user.id}"
            await self.channel_layer.group_add(self.group_name, self.channel_name)
            await self.accept()
            logger.info(f"WebSocket connected for user {user.email}")
        except Exception as e:
            logger.error(f"WebSocket connection error: {str(e)}")
            await self.close()

    async def disconnect(self, close_code):
        """
        Handle WebSocket disconnection
        """
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
            logger.info(f"WebSocket disconnected for user {self.user.email}")

    async def receive(self, text_data):
        """
        Handle incoming WebSocket messages
        """
        try:
            data = json.loads(text_data)
            message_type = data.get("type")
            if message_type == "mark_read":
                notification_id = data.get("notification_id")
                if notification_id:
                    await self.mark_notification_read(notification_id)
            elif message_type == "review_notification":
                await self.review_notification(data)
            elif message_type == "review_report_notification":
                await self.review_report_notification(data)
            elif message_type == "dispute_notification":
                await self.dispute_notification(data)
        except json.JSONDecodeError:
            logger.error(f"Invalid JSON received from {self.user.email}")
        except Exception as e:
            logger.error(
                f"Error handling WebSocket message for {self.user.email}: {str(e)}"
            )

    @database_sync_to_async
    def mark_notification_read(self, notification_id):
        """
        Mark a notification as read
        """
        try:
            notification = Notification.objects.get(id=notification_id, user=self.user)
            notification.is_read = True
            notification.save()
            logger.info(
                f"Notification {notification_id} marked as read for {self.user.email}"
            )
        except Notification.DoesNotExist:
            logger.error(
                f"Notification {notification_id} not found for {self.user.email}"
            )

    async def review_notification(self, event):
        """
        Send review notification to WebSocket
        """
        await self.send(
            text_data=json.dumps(
                {
                    "type": "review_notification",
                    "review_id": event["review_id"],
                    "message": event["message"],
                    "action_url": event.get("action_url"),
                }
            )
        )

    async def review_report_notification(self, event):
        """
        Send review report notification to WebSocket
        """
        await self.send(
            text_data=json.dumps(
                {
                    "type": "review_report_notification",
                    "report_id": event["report_id"],
                    "message": event["message"],
                    "action_url": event.get("action_url"),
                }
            )
        )

    async def dispute_notification(self, event):
        """
        Send dispute notification to WebSocket
        """
        await self.send(
            text_data=json.dumps(
                {
                    "type": "dispute_notification",
                    "dispute_id": event["dispute_id"],
                    "message": event["message"],
                    "action_url": event.get("action_url"),
                }
            )
        )


@database_sync_to_async
def send_chat_notification(user_id, message):
    """
    Send a notification to a user's WebSocket group
    """
    from channels.layers import get_channel_layer

    channel_layer = get_channel_layer()
    group_name = f"user_{user_id}"
    return channel_layer.group_send(group_name, message)
