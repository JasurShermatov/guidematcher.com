# apps/chat/consumers.py
import logging
import uuid
from typing import Any, Dict, List, Optional, Union

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.contrib.auth.models import AnonymousUser
from django.utils import timezone
from django.db import transaction
from django.db.models import F

from apps.chat.models import ChatRoom, Message, MessageRead, UserTypingStatus
from apps.chat.serializers import MessageListSerializer
from apps.users.serializers import UserShortSerializer

logger = logging.getLogger(__name__)


class ChatConsumer(AsyncJsonWebsocketConsumer):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.room_id: Optional[str] = None
        self.group_name: Optional[str] = None
        self.room_info: Optional[Dict[str, Any]] = None

    async def connect(self):
        try:
            # Extract room ID from URL
            self.room_id = self.scope["url_route"]["kwargs"]["room_id"]
            self.group_name = f"chat_{self.room_id}"

            # Validate user authentication
            user = self.scope.get("user")
            if not self._is_user_authenticated(user):
                await self.close(code=4401)  # Unauthorized
                return

            # Check room access and get room info
            room_info = await self._get_room_info(user.id, self.room_id)
            if not room_info:
                await self.close(code=4403)  # Forbidden
                return

            self.room_info = room_info

            # Join room group
            await self.channel_layer.group_add(self.group_name, self.channel_name)
            await self.accept()

            logger.info("WS connected: user=%s room=%s", user.id, self.room_id)

            # Send welcome message with room statistics
            await self.send_json(
                {
                    "type": "system",
                    "text": f"Connected to room {self.room_id}",
                    "code": "connected",
                    "room_stats": {
                        "room_id": self.room_id,
                        "total_messages": room_info.get("total_messages", 0),
                        "unread_count": room_info.get("unread_count", 0),
                        "last_activity_at": room_info.get("last_activity_at"),
                        "room_type": room_info.get("room_type"),
                    },
                }
            )

        except Exception as e:
            logger.error("Error during connection: %s", e)
            await self.close(code=4500)

    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
        try:
            # Set user as not typing
            user = self.scope.get("user")
            if self._is_user_authenticated(user) and self.room_id:
                await self._set_typing_status(user.id, self.room_id, False)

            # Leave room group
            if self.group_name:
                await self.channel_layer.group_discard(
                    self.group_name, self.channel_name
                )

            logger.info("WS disconnected: code=%s room=%s", close_code, self.room_id)

        except Exception as e:
            logger.error("Error during disconnection: %s", e)

    # ══════════════════════════════════════════════════════════════════
    # MESSAGE HANDLING
    # ══════════════════════════════════════════════════════════════════

    async def receive_json(self, content: Dict[str, Any], **kwargs):
        """Handle incoming JSON messages."""
        event_type = content.get("type")
        if not event_type:
            await self._send_error("Missing 'type' field", code="missing_type")
            return

        # Event handler mapping
        handlers = {
            "message.send": self._handle_message_send,
            "location.send": self._handle_location_send,
            "file.broadcast": self._handle_file_broadcast,
            "typing": self._handle_typing,
            "read": self._handle_read,
            "ping": self._handle_ping,
            "room.stats": self._handle_room_stats,
        }

        handler = handlers.get(event_type)
        if not handler:
            await self._send_error(
                f"Unknown event type: {event_type}", code="unknown_event"
            )
            return

        try:
            await handler(content)
        except Exception as e:
            logger.error("Error handling %s: %s", event_type, e, exc_info=True)
            await self._send_error(
                f"Error processing {event_type}", code="handler_error"
            )

    # ══════════════════════════════════════════════════════════════════
    # EVENT HANDLERS
    # ══════════════════════════════════════════════════════════════════

    async def _handle_message_send(self, payload: Dict[str, Any]):
        """Handle text message sending."""
        text = (payload.get("text", "") or "").strip()
        if not text:
            await self._send_error("Message text cannot be empty", code="empty_text")
            return

        if len(text) > 4000:  # Reasonable limit
            await self._send_error("Message too long", code="message_too_long")
            return

        reply_to = payload.get("reply_to")
        if reply_to and not self._is_valid_uuid(reply_to):
            await self._send_error("Invalid reply_to UUID", code="invalid_reply_to")
            return

        result = await self._create_message_optimized(
            sender_id=self.scope["user"].id,
            room_id=self.room_id,
            message_type=Message.MessageType.TEXT,
            text=text,
            reply_to=reply_to,
        )

        if result:
            await self._broadcast_message_and_stats(
                result["message"], result["room_stats"]
            )
        else:
            await self._send_error("Failed to create message", code="create_failed")

    async def _handle_location_send(self, payload: Dict[str, Any]):
        """Handle location message sending."""
        try:
            lat = float(payload["latitude"])
            lon = float(payload["longitude"])

            # Validate coordinates
            if not (-90 <= lat <= 90) or not (-180 <= lon <= 180):
                raise ValueError("Invalid coordinates")

        except (KeyError, ValueError, TypeError):
            await self._send_error(
                "Invalid latitude/longitude", code="invalid_location"
            )
            return

        name = str(payload.get("name", "")).strip()[:255]  # Limit length

        result = await self._create_message_optimized(
            sender_id=self.scope["user"].id,
            room_id=self.room_id,
            message_type=Message.MessageType.LOCATION,
            latitude=lat,
            longitude=lon,
            location_name=name,
        )

        if result:
            await self._broadcast_message_and_stats(
                result["message"], result["room_stats"]
            )
        else:
            await self._send_error(
                "Failed to create location message", code="create_failed"
            )

    async def _handle_file_broadcast(self, payload: Dict[str, Any]):
        """Handle file message broadcasting (file uploaded via REST)."""
        message_id = payload.get("message_id")
        if not message_id or not self._is_valid_uuid(message_id):
            await self._send_error(
                "Valid message_id required", code="invalid_message_id"
            )
            return

        msg_data = await self._get_message_data_optimized(message_id, self.room_id)
        if not msg_data:
            await self._send_error("Message not found", code="message_not_found")
            return

        await self._broadcast_message(msg_data)

    async def _handle_typing(self, payload: Dict[str, Any]):
        """Handle typing status updates."""
        is_typing = bool(payload.get("is_typing", False))

        user_info = await self._set_typing_with_user_info(
            self.scope["user"].id, self.room_id, is_typing
        )

        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "chat.typing",
                "user_id": str(self.scope["user"].id),
                "is_typing": is_typing,
                "user_info": user_info,
            },
        )

    async def _handle_read(self, payload: Dict[str, Any]):
        """Handle bulk message read marking."""
        message_ids = payload.get("message_ids", [])
        if not isinstance(message_ids, list):
            await self._send_error(
                "message_ids must be a list", code="invalid_message_ids"
            )
            return

        valid_ids = [mid for mid in message_ids if self._is_valid_uuid(mid)]
        if not valid_ids:
            return  # No valid IDs, nothing to do

        user_info = await self._mark_messages_read_optimized(
            self.scope["user"].id, valid_ids, self.room_id
        )

        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "chat.read",
                "user_id": str(self.scope["user"].id),
                "message_ids": valid_ids,
                "user_info": user_info,
            },
        )

    async def _handle_ping(self, payload: Dict[str, Any]):
        """Handle ping/keepalive requests."""
        room_stats = await self._get_room_stats(self.room_id)
        await self.send_json(
            {
                "type": "pong",
                "room_stats": room_stats,
                "timestamp": timezone.now().isoformat(),
            }
        )

    async def _handle_room_stats(self, payload: Dict[str, Any]):
        """Handle room statistics requests."""
        room_stats = await self._get_room_stats(self.room_id)
        await self.send_json({"type": "room_stats", "stats": room_stats})

    async def chat_message(self, event):
        """Send message to client."""
        await self.send_json({"type": "message", **event["message"]})

    async def chat_typing(self, event):
        """Send typing status to client (exclude sender)."""
        if event["user_id"] != str(self.scope["user"].id):
            await self.send_json({"type": "typing", **event})

    async def chat_read(self, event):
        """Send read receipt to client (exclude sender)."""
        if event["user_id"] != str(self.scope["user"].id):
            await self.send_json({"type": "read", **event})

    async def chat_room_updated(self, event):
        """Send room update to client."""
        await self.send_json({"type": "room_updated", **event})

    def _is_user_authenticated(self, user) -> bool:
        """Check if user is authenticated."""
        return (
            user
            and not isinstance(user, AnonymousUser)
            and user.is_authenticated
            and user.is_active
        )

    def _is_valid_uuid(self, value: Any) -> bool:
        """Validate UUID format."""
        try:
            uuid.UUID(str(value))
            return True
        except (ValueError, TypeError, AttributeError):
            return False

    async def _broadcast_message(self, msg_data: Dict[str, Any]):
        """Broadcast message to room group."""
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "chat.message",
                "message": msg_data,
            },
        )

    async def _broadcast_message_and_stats(
        self, msg_data: Dict[str, Any], room_stats: Dict[str, Any]
    ):
        """Broadcast message and updated room stats."""
        await self._broadcast_message(msg_data)
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "chat.room_updated",
                **room_stats,
            },
        )

    async def _send_error(self, message: str, code: str = "error"):
        """Send error message to client."""
        await self.send_json(
            {
                "type": "error",
                "detail": message,
                "code": code,
                "timestamp": timezone.now().isoformat(),
            }
        )

    @database_sync_to_async
    def _get_room_info(
        self, user_id: Union[str, int], room_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get room info and validate user access."""
        try:
            room = ChatRoom.objects.select_related("booking").get(
                id=room_id, participants__id=user_id, is_active=True
            )

            # Get user object for unread count calculation
            from apps.users.models import User

            user = User.objects.get(id=user_id)

            return {
                "exists": True,
                "total_messages": room.total_messages,
                "unread_count": room.get_unread_count(user),
                "last_activity_at": (
                    room.last_activity_at.isoformat() if room.last_activity_at else None
                ),
                "room_type": room.room_type,
            }
        except ChatRoom.DoesNotExist:
            logger.warning(
                "Room access denied or room not found: user=%s room=%s",
                user_id,
                room_id,
            )
            return None
        except Exception as e:
            logger.error("Error getting room info: %s", e)
            return None

    @database_sync_to_async
    def _create_message_optimized(
        self,
        sender_id: Union[str, int],
        room_id: str,
        message_type: str,
        text: str = "",
        reply_to: Optional[str] = None,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        location_name: str = "",
    ) -> Optional[Dict[str, Any]]:
        """Create message with optimized denormalization updates."""
        try:
            with transaction.atomic():
                # Prepare message data
                message_data = {
                    "room_id": room_id,
                    "sender_id": sender_id,
                    "message_type": message_type,
                }

                if text:
                    message_data["text"] = text
                if latitude is not None and longitude is not None:
                    message_data["latitude"] = latitude
                    message_data["longitude"] = longitude
                    message_data["location_name"] = location_name[:255]
                if reply_to:
                    message_data["reply_to_id"] = reply_to

                # Create message
                message = Message.objects.create(**message_data)

                # Get room with lock to prevent race conditions
                room = ChatRoom.objects.select_for_update().get(pk=room_id)

                # Update reply count if this is a reply
                if message.reply_to:
                    message.reply_to.replies_count = F("replies_count") + 1
                    message.reply_to.save(update_fields=["replies_count"])

                # Update room denormalized fields
                room.update_last_message(message, save=False)

                # Update unread counts for other participants
                participants = room.participants.exclude(id=sender_id)
                for participant in participants:
                    room.increment_unread_count(participant, save=False)

                # Save room with all updates
                room.save(
                    update_fields=[
                        "last_message_at",
                        "last_message_preview",
                        "last_message_sender_id",
                        "last_message_type",
                        "total_messages",
                        "unread_counts",
                    ]
                )

                # Serialize message for response
                serialized_message = self._serialize_message_optimized(message)

                return {
                    "message": serialized_message,
                    "room_stats": {
                        "total_messages": room.total_messages,
                        "last_activity_at": (
                            room.last_activity_at.isoformat()
                            if room.last_activity_at
                            else None
                        ),
                        "last_message_preview": room.last_message_preview,
                    },
                }

        except Exception as e:
            logger.error("Error creating message: %s", e, exc_info=True)
            return None

    @database_sync_to_async
    def _get_message_data_optimized(
        self, message_id: str, room_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get message data with optimized query."""
        try:
            message = Message.objects.select_related("sender", "reply_to__sender").get(
                id=message_id, room_id=room_id, is_deleted=False
            )
            return self._serialize_message_optimized(message)
        except Message.DoesNotExist:
            return None
        except Exception as e:
            logger.error("Error getting message data: %s", e)
            return None

    @database_sync_to_async
    def _set_typing_with_user_info(
        self, user_id: Union[str, int], room_id: str, is_typing: bool
    ) -> Dict[str, Any]:
        """Set typing status and return user info."""
        try:
            typing_status, _ = UserTypingStatus.objects.get_or_create(
                room_id=room_id, user_id=user_id, defaults={"is_typing": is_typing}
            )

            if typing_status.is_typing != is_typing:
                typing_status.is_typing = is_typing
                typing_status.save(update_fields=["is_typing", "last_typed_at"])

            # Get user info for other clients
            from apps.users.models import User

            user = User.objects.get(id=user_id)
            return UserShortSerializer(user).data

        except Exception as e:
            logger.error("Error setting typing status: %s", e)
            return {}

    @database_sync_to_async
    def _set_typing_status(
        self, user_id: Union[str, int], room_id: str, is_typing: bool
    ):
        """Simple typing status update."""
        try:
            UserTypingStatus.objects.update_or_create(
                room_id=room_id, user_id=user_id, defaults={"is_typing": is_typing}
            )
        except Exception as e:
            logger.error("Error setting typing status: %s", e)

    @database_sync_to_async
    def _mark_messages_read_optimized(
        self, user_id: Union[str, int], message_ids: List[str], room_id: str
    ) -> Dict[str, Any]:
        """Bulk mark messages as read with denormalization updates."""
        try:
            with transaction.atomic():
                # Filter out messages that are already read
                existing_reads = set(
                    MessageRead.objects.filter(
                        user_id=user_id, message_id__in=message_ids
                    ).values_list("message_id", flat=True)
                )

                new_message_ids = [
                    mid for mid in message_ids if mid not in existing_reads
                ]

                if new_message_ids:
                    # Bulk create read receipts
                    read_receipts = [
                        MessageRead(
                            message_id=mid, user_id=user_id, read_at=timezone.now()
                        )
                        for mid in new_message_ids
                    ]
                    MessageRead.objects.bulk_create(
                        read_receipts, ignore_conflicts=True
                    )

                    # Update message read counts
                    Message.objects.filter(id__in=new_message_ids).update(
                        read_count=F("read_count") + 1
                    )

                    # Update room unread count
                    from apps.users.models import User

                    user = User.objects.get(id=user_id)
                    room = ChatRoom.objects.get(id=room_id)

                    # Decrease unread count by number of newly read messages
                    current_unread = room.get_unread_count(user)
                    new_unread = max(0, current_unread - len(new_message_ids))
                    room.unread_counts[str(user_id)] = new_unread
                    room.save(update_fields=["unread_counts"])

                    return UserShortSerializer(user).data
                else:
                    # No new reads, just return user info
                    from apps.users.models import User

                    user = User.objects.get(id=user_id)
                    return UserShortSerializer(user).data

        except Exception as e:
            logger.error("Error marking messages read: %s", e, exc_info=True)
            return {}

    @database_sync_to_async
    def _get_room_stats(self, room_id: str) -> Dict[str, Any]:
        """Get current room statistics."""
        try:
            room = ChatRoom.objects.get(id=room_id)
            user = self.scope.get("user")

            return {
                "total_messages": room.total_messages,
                "unread_count": room.get_unread_count(user) if user else 0,
                "last_activity_at": (
                    room.last_activity_at.isoformat() if room.last_activity_at else None
                ),
                "last_message_at": (
                    room.last_message_at.isoformat() if room.last_message_at else None
                ),
                "last_message_preview": room.last_message_preview,
                "room_type": room.room_type,
                "is_active": room.is_active,
            }
        except ChatRoom.DoesNotExist:
            return {}
        except Exception as e:
            logger.error("Error getting room stats: %s", e)
            return {}

    def _serialize_message_optimized(self, message: Message) -> Dict[str, Any]:

        try:
            data = MessageListSerializer(message, context={"request": None}).data

            # Add WebSocket-specific fields
            data.update(
                {
                    "websocket_timestamp": timezone.now().isoformat(),
                    "room_id": str(message.room_id),
                }
            )

            return data
        except Exception as e:
            logger.error("Error serializing message: %s", e)
            return {}


class ChatNotificationConsumer(AsyncJsonWebsocketConsumer):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.user_group: Optional[str] = None

    async def connect(self):

        try:
            user = self.scope.get("user")
            if not user or isinstance(user, AnonymousUser) or not user.is_authenticated:
                await self.close(code=4401)
                return

            self.user_group = f"user_{user.id}"
            await self.channel_layer.group_add(self.user_group, self.channel_name)
            await self.accept()

            logger.info("Notification WS connected: user=%s", user.id)

            await self.send_json(
                {
                    "type": "system",
                    "text": "Connected to notifications",
                    "code": "connected",
                    "timestamp": timezone.now().isoformat(),
                }
            )

        except Exception as e:
            logger.error("Error connecting to notifications: %s", e)
            await self.close(code=4500)

    async def disconnect(self, close_code):
        try:
            if self.user_group:
                await self.channel_layer.group_discard(
                    self.user_group, self.channel_name
                )
            logger.info("Notification WS disconnected: code=%s", close_code)
        except Exception as e:
            logger.error("Error disconnecting from notifications: %s", e)

    async def receive_json(self, content: Dict[str, Any], **kwargs):
        if content.get("type") == "ping":
            await self.send_json(
                {"type": "pong", "timestamp": timezone.now().isoformat()}
            )

    async def chat_notification(self, event):
        await self.send_json(
            {"type": "notification", "timestamp": timezone.now().isoformat(), **event}
        )
