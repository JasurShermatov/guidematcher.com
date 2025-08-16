# apps/chat/consumers.py
import logging
import uuid
import asyncio
from typing import Any, Dict, List, Optional, Union, Set
from collections import defaultdict
from datetime import datetime, timedelta

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.contrib.auth.models import AnonymousUser
from django.utils import timezone
from django.db import transaction
from django.db.models import F, Prefetch
from django.core.cache import cache

from apps.chat.models import ChatRoom, Message, MessageRead, UserTypingStatus
from apps.chat.serializers import MessageListSerializer
from apps.users.serializers import UserShortSerializer

logger = logging.getLogger(__name__)


# ==================== RATE LIMITER ====================


class RateLimiter:
    """
    WebSocket uchun rate limiter.
    """

    def __init__(self, max_messages: int = 30, time_window: int = 60):
        self._message_times: Dict[str, List[float]] = defaultdict(list)
        self._max_messages = max_messages
        self._time_window = time_window
        self._lock = asyncio.Lock()

    async def check_limit(self, user_id: str) -> bool:
        """Rate limit tekshirish"""
        async with self._lock:
            now = datetime.now().timestamp()
            times = self._message_times[user_id]

            # Eski vaqtlarni tozalash
            times[:] = [t for t in times if now - t < self._time_window]

            if len(times) >= self._max_messages:
                return False

            times.append(now)
            return True

    async def cleanup(self):
        """Eski ma'lumotlarni tozalash"""
        async with self._lock:
            now = datetime.now().timestamp()
            for user_id in list(self._message_times.keys()):
                times = self._message_times[user_id]
                times[:] = [t for t in times if now - t < self._time_window]
                if not times:
                    del self._message_times[user_id]


# ==================== CONNECTION POOL ====================


class ConnectionPool:
    """
    WebSocket connection pooling.
    """

    def __init__(self, max_per_user: int = 5):
        self._connections: Dict[str, Set[str]] = defaultdict(set)
        self._max_per_user = max_per_user
        self._lock = asyncio.Lock()

    async def add_connection(self, user_id: str, channel_name: str) -> bool:
        """Yangi connection qo'shish"""
        async with self._lock:
            user_connections = self._connections[user_id]

            if len(user_connections) >= self._max_per_user:
                # Eng eski connection'ni yopish
                oldest = min(user_connections)
                user_connections.remove(oldest)
                logger.warning(f"Max connections for user {user_id}, closing {oldest}")

            user_connections.add(channel_name)
            return True

    async def remove_connection(self, user_id: str, channel_name: str):
        """Connection olib tashlash"""
        async with self._lock:
            self._connections[user_id].discard(channel_name)
            if not self._connections[user_id]:
                del self._connections[user_id]

    async def get_user_connections(self, user_id: str) -> Set[str]:
        """User connection'larini olish"""
        async with self._lock:
            return self._connections.get(user_id, set()).copy()


# ==================== MAIN CONSUMER ====================


class ChatConsumer(AsyncJsonWebsocketConsumer):
    """
    Optimized WebSocket consumer for chat.
    """

    # Class-level singletons
    rate_limiter = RateLimiter(max_messages=30, time_window=60)
    connection_pool = ConnectionPool(max_per_user=5)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.room_id: Optional[str] = None
        self.group_name: Optional[str] = None
        self.user_id: Optional[str] = None
        self.user_name: Optional[str] = None

        # Cleanup tasks
        self.periodic_tasks: List[asyncio.Task] = []

        # Cache keys
        self.cache_keys: Set[str] = set()

    # ==================== CONNECTION LIFECYCLE ====================

    async def connect(self):
        """WebSocket ulanish"""
        try:
            # Room ID olish
            self.room_id = self.scope["url_route"]["kwargs"]["room_id"]
            self.group_name = f"chat_{self.room_id}"

            # User authentication
            user = self.scope.get("user")
            if not self._is_user_authenticated(user):
                logger.warning(
                    f"Unauthorized connection attempt to room {self.room_id}"
                )
                await self.close(code=4401)  # Unauthorized
                return

            self.user_id = str(user.id)
            self.user_name = user.get_full_name() or user.username

            # Connection pool check
            await self.connection_pool.add_connection(self.user_id, self.channel_name)

            # Room access check
            has_access = await self._check_room_access(self.user_id, self.room_id)
            if not has_access:
                logger.warning(
                    f"Access denied: user={self.user_id} room={self.room_id}"
                )
                await self.close(code=4403)  # Forbidden
                return

            # Channel group'ga qo'shish
            await self.channel_layer.group_add(self.group_name, self.channel_name)

            # Accept connection
            await self.accept()

            # Start periodic tasks
            await self._start_periodic_tasks()

            # Send welcome message
            room_info = await self._get_room_info_cached(self.room_id, self.user_id)
            await self.send_json(
                {
                    "type": "connected",
                    "room_id": self.room_id,
                    "user": {"id": self.user_id, "name": self.user_name},
                    "room_info": room_info,
                    "timestamp": timezone.now().isoformat(),
                }
            )

            # Notify others about join
            await self._notify_user_joined()

            logger.info(f"WS connected: user={self.user_id} room={self.room_id}")

        except Exception as e:
            logger.error(f"Connection error: {e}", exc_info=True)
            await self.close(code=4500)

    async def disconnect(self, close_code):
        """WebSocket uzilishi"""
        try:
            # Cancel periodic tasks
            for task in self.periodic_tasks:
                task.cancel()
            self.periodic_tasks.clear()

            # Clear typing status
            if self.user_id and self.room_id:
                await self._set_typing_status(self.user_id, self.room_id, False)

            # Leave channel group
            if self.group_name:
                await self.channel_layer.group_discard(
                    self.group_name, self.channel_name
                )

            # Remove from connection pool
            if self.user_id:
                await self.connection_pool.remove_connection(
                    self.user_id, self.channel_name
                )

            # Clear cache keys
            await self._clear_cache()

            # Notify others about leave
            if self.user_id and self.group_name:
                await self._notify_user_left()

            # MUHIM: Memory cleanup
            self.room_id = None
            self.group_name = None
            self.user_id = None
            self.user_name = None
            self.cache_keys.clear()

            logger.info(f"WS disconnected: code={close_code}")

        except Exception as e:
            logger.error(f"Disconnect error: {e}")

    # ==================== MESSAGE RECEIVING ====================

    async def receive_json(self, content: Dict[str, Any], **kwargs):
        """JSON xabar qabul qilish"""

        # Rate limiting
        if not await self.rate_limiter.check_limit(self.user_id):
            await self.send_json(
                {
                    "type": "error",
                    "code": "rate_limit",
                    "message": "Too many messages. Please wait.",
                    "retry_after": 60,
                }
            )
            return

        # Get event type
        event_type = content.get("type")
        if not event_type:
            await self._send_error("Missing 'type' field", "missing_type")
            return

        # Handler mapping
        handlers = {
            "message.send": self._handle_message_send,
            "message.edit": self._handle_message_edit,
            "message.delete": self._handle_message_delete,
            "location.send": self._handle_location_send,
            "file.broadcast": self._handle_file_broadcast,
            "typing": self._handle_typing,
            "read": self._handle_read,
            "ping": self._handle_ping,
            "room.stats": self._handle_room_stats,
        }

        handler = handlers.get(event_type)
        if not handler:
            await self._send_error(f"Unknown event: {event_type}", "unknown_event")
            return

        try:
            await handler(content)
        except Exception as e:
            logger.error(f"Handler error for {event_type}: {e}", exc_info=True)
            await self._send_error("Processing error", "handler_error")

    # ==================== MESSAGE HANDLERS ====================

    async def _handle_message_send(self, payload: Dict[str, Any]):
        """Text xabar yuborish"""
        text = (payload.get("text", "") or "").strip()

        # Validation
        if not text:
            await self._send_error("Empty message", "empty_text")
            return

        if len(text) > 4000:
            await self._send_error("Message too long (max 4000)", "text_too_long")
            return

        # XSS prevention
        text = self._sanitize_text(text)

        # Reply validation
        reply_to = payload.get("reply_to")
        if reply_to and not self._is_valid_uuid(reply_to):
            await self._send_error("Invalid reply_to", "invalid_reply_to")
            return

        # Create message
        message_data = await self._create_message_optimized(
            sender_id=self.user_id,
            room_id=self.room_id,
            message_type=Message.MessageType.TEXT,
            text=text,
            reply_to=reply_to,
        )

        if message_data:
            # Broadcast to all
            await self._broadcast_message(message_data)

            # Clear room cache
            await self._invalidate_room_cache(self.room_id)

    async def _handle_message_edit(self, payload: Dict[str, Any]):
        """Xabar tahrirlash"""
        message_id = payload.get("message_id")
        new_text = (payload.get("text", "") or "").strip()

        if not message_id or not self._is_valid_uuid(message_id):
            await self._send_error("Invalid message_id", "invalid_message_id")
            return

        if not new_text:
            await self._send_error("Empty text", "empty_text")
            return

        # Edit message
        result = await self._edit_message(
            message_id=message_id,
            user_id=self.user_id,
            new_text=self._sanitize_text(new_text),
        )

        if result:
            await self._broadcast_message_edit(result)

    async def _handle_message_delete(self, payload: Dict[str, Any]):
        """Xabar o'chirish"""
        message_id = payload.get("message_id")

        if not message_id or not self._is_valid_uuid(message_id):
            await self._send_error("Invalid message_id", "invalid_message_id")
            return

        # Soft delete
        result = await self._delete_message(message_id, self.user_id)

        if result:
            await self._broadcast_message_delete(message_id)

    async def _handle_location_send(self, payload: Dict[str, Any]):
        """Location yuborish"""
        try:
            lat = float(payload["latitude"])
            lon = float(payload["longitude"])

            if not (-90 <= lat <= 90) or not (-180 <= lon <= 180):
                raise ValueError("Invalid coordinates")

        except (KeyError, ValueError, TypeError):
            await self._send_error("Invalid location", "invalid_location")
            return

        name = self._sanitize_text(payload.get("name", ""))[:255]

        # Create location message
        message_data = await self._create_message_optimized(
            sender_id=self.user_id,
            room_id=self.room_id,
            message_type=Message.MessageType.LOCATION,
            latitude=lat,
            longitude=lon,
            location_name=name,
        )

        if message_data:
            await self._broadcast_message(message_data)

    async def _handle_typing(self, payload: Dict[str, Any]):
        """Typing status"""
        is_typing = bool(payload.get("is_typing", False))

        await self._set_typing_status(self.user_id, self.room_id, is_typing)

        # Broadcast to others
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "chat.typing",
                "user_id": self.user_id,
                "user_name": self.user_name,
                "is_typing": is_typing,
            },
        )

    async def _handle_read(self, payload: Dict[str, Any]):
        """O'qilganlik belgisi"""
        message_ids = payload.get("message_ids", [])

        if not isinstance(message_ids, list):
            await self._send_error("message_ids must be list", "invalid_type")
            return

        # Validate UUIDs
        valid_ids = [mid for mid in message_ids if self._is_valid_uuid(mid)]

        if valid_ids:
            result = await self._mark_messages_read_optimized(
                self.user_id, valid_ids, self.room_id
            )

            if result:
                # Broadcast read receipts
                await self.channel_layer.group_send(
                    self.group_name,
                    {
                        "type": "chat.read",
                        "user_id": self.user_id,
                        "message_ids": valid_ids,
                        "user_info": result,
                    },
                )

    async def _handle_ping(self, payload: Dict[str, Any]):
        """Ping/Pong"""
        await self.send_json({"type": "pong", "timestamp": timezone.now().isoformat()})

    async def _handle_room_stats(self, payload: Dict[str, Any]):
        """Room statistikasi"""
        stats = await self._get_room_stats_cached(self.room_id)
        await self.send_json({"type": "room_stats", "stats": stats})

    # ==================== CHANNEL LAYER HANDLERS ====================

    async def chat_message(self, event):
        """Xabarni client'ga yuborish"""
        await self.send_json({"type": "message", **event.get("message", {})})

    async def chat_typing(self, event):
        """Typing holatini yuborish"""
        # O'ziga yubormaslik
        if event.get("user_id") != self.user_id:
            await self.send_json(
                {
                    "type": "typing",
                    "user_id": event["user_id"],
                    "user_name": event.get("user_name"),
                    "is_typing": event["is_typing"],
                }
            )

    async def chat_read(self, event):
        """Read receipt yuborish"""
        # O'ziga yubormaslik
        if event.get("user_id") != self.user_id:
            await self.send_json({"type": "read", **event})

    async def chat_message_edited(self, event):
        """Tahrirlangan xabar"""
        await self.send_json({"type": "message_edited", **event})

    async def chat_message_deleted(self, event):
        """O'chirilgan xabar"""
        await self.send_json(
            {"type": "message_deleted", "message_id": event["message_id"]}
        )

    async def chat_user_joined(self, event):
        """User qo'shildi"""
        if event.get("user_id") != self.user_id:
            await self.send_json({"type": "user_joined", **event})

    async def chat_user_left(self, event):
        """User chiqdi"""
        if event.get("user_id") != self.user_id:
            await self.send_json({"type": "user_left", **event})

    # ==================== DATABASE OPERATIONS ====================

    @database_sync_to_async
    def _check_room_access(self, user_id: str, room_id: str) -> bool:
        """Room access tekshirish"""
        return ChatRoom.objects.filter(
            id=room_id, participants__id=user_id, is_active=True
        ).exists()

    @database_sync_to_async
    def _get_room_info_cached(self, room_id: str, user_id: str) -> Dict[str, Any]:
        """Room info with caching"""
        cache_key = f"room_info:{room_id}:{user_id}"
        cached = cache.get(cache_key)

        if cached:
            return cached

        try:
            room = ChatRoom.objects.select_related("booking").get(id=room_id)

            from apps.users.models import User

            user = User.objects.get(id=user_id)

            info = {
                "room_id": str(room_id),
                "room_type": room.room_type,
                "total_messages": room.total_messages,
                "unread_count": room.get_unread_count(user),
                "last_activity": (
                    room.last_activity_at.isoformat() if room.last_activity_at else None
                ),
                "participants_count": room.participants.count(),
            }

            # Cache for 5 minutes
            cache.set(cache_key, info, 300)
            self.cache_keys.add(cache_key)

            return info

        except (ChatRoom.DoesNotExist, User.DoesNotExist):
            return {}

    @database_sync_to_async
    def _create_message_optimized(
        self,
        sender_id: str,
        room_id: str,
        message_type: str,
        text: str = "",
        reply_to: Optional[str] = None,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        location_name: str = "",
    ) -> Optional[Dict[str, Any]]:
        """Optimized message creation"""
        try:
            with transaction.atomic():
                # Create message
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
                    message_data["location_name"] = location_name
                if reply_to:
                    message_data["reply_to_id"] = reply_to

                message = Message.objects.create(**message_data)

                # Signal will handle room updates

                # Serialize
                serializer = MessageListSerializer(message)
                return serializer.data

        except Exception as e:
            logger.error(f"Message creation error: {e}", exc_info=True)
            return None

    @database_sync_to_async
    def _edit_message(
        self, message_id: str, user_id: str, new_text: str
    ) -> Optional[Dict]:
        """Edit message"""
        try:
            with transaction.atomic():
                message = Message.objects.select_for_update().get(
                    id=message_id, sender_id=user_id, is_deleted=False
                )

                # Check time limit (24 hours)
                if timezone.now() - message.created_at > timedelta(hours=24):
                    return None

                message.text = new_text
                message.is_edited = True
                message.edited_at = timezone.now()
                message.save(update_fields=["text", "is_edited", "edited_at"])

                serializer = MessageListSerializer(message)
                return serializer.data

        except Message.DoesNotExist:
            return None

    @database_sync_to_async
    def _delete_message(self, message_id: str, user_id: str) -> bool:
        """Soft delete message"""
        try:
            with transaction.atomic():
                message = Message.objects.get(
                    id=message_id, sender_id=user_id, is_deleted=False
                )

                message.is_deleted = True
                message.deleted_at = timezone.now()
                message.save(update_fields=["is_deleted", "deleted_at"])

                return True

        except Message.DoesNotExist:
            return False

    @database_sync_to_async
    def _mark_messages_read_optimized(
        self, user_id: str, message_ids: List[str], room_id: str
    ) -> Optional[Dict[str, Any]]:
        """Bulk mark as read"""
        try:
            with transaction.atomic():
                # Get existing reads
                existing = set(
                    MessageRead.objects.filter(
                        user_id=user_id, message_id__in=message_ids
                    ).values_list("message_id", flat=True)
                )

                # Create new reads
                new_ids = [mid for mid in message_ids if mid not in existing]

                if new_ids:
                    reads = [
                        MessageRead(
                            message_id=mid, user_id=user_id, read_at=timezone.now()
                        )
                        for mid in new_ids
                    ]

                    MessageRead.objects.bulk_create(reads, ignore_conflicts=True)

                    # Update counts (signal will handle)

                from apps.users.models import User

                user = User.objects.get(id=user_id)
                return UserShortSerializer(user).data

        except Exception as e:
            logger.error(f"Mark read error: {e}")
            return None

    @database_sync_to_async
    def _set_typing_status(self, user_id: str, room_id: str, is_typing: bool):
        """Set typing status"""
        UserTypingStatus.objects.update_or_create(
            room_id=room_id, user_id=user_id, defaults={"is_typing": is_typing}
        )

    @database_sync_to_async
    def _get_room_stats_cached(self, room_id: str) -> Dict[str, Any]:
        """Get room stats with cache"""
        cache_key = f"room_stats:{room_id}"
        cached = cache.get(cache_key)

        if cached:
            return cached

        try:
            room = ChatRoom.objects.get(id=room_id)

            stats = {
                "total_messages": room.total_messages,
                "last_activity": (
                    room.last_activity_at.isoformat() if room.last_activity_at else None
                ),
                "participants": room.participants.count(),
                "is_active": room.is_active,
            }

            cache.set(cache_key, stats, 60)  # 1 minute cache
            return stats

        except ChatRoom.DoesNotExist:
            return {}

    # ==================== HELPER METHODS ====================

    def _is_user_authenticated(self, user) -> bool:
        """Check authentication"""
        return (
            user
            and not isinstance(user, AnonymousUser)
            and user.is_authenticated
            and user.is_active
        )

    def _is_valid_uuid(self, value: Any) -> bool:
        """UUID validation"""
        try:
            uuid.UUID(str(value))
            return True
        except (ValueError, TypeError, AttributeError):
            return False

    def _sanitize_text(self, text: str) -> str:
        """XSS prevention"""
        import html

        return html.escape(text.strip())

    async def _send_error(self, message: str, code: str = "error"):
        """Send error to client"""
        await self.send_json(
            {
                "type": "error",
                "code": code,
                "message": message,
                "timestamp": timezone.now().isoformat(),
            }
        )

    async def _broadcast_message(self, message_data: Dict[str, Any]):
        """Broadcast new message"""
        await self.channel_layer.group_send(
            self.group_name, {"type": "chat.message", "message": message_data}
        )

    async def _broadcast_message_edit(self, message_data: Dict[str, Any]):
        """Broadcast edited message"""
        await self.channel_layer.group_send(
            self.group_name, {"type": "chat.message_edited", **message_data}
        )

    async def _broadcast_message_delete(self, message_id: str):
        """Broadcast deleted message"""
        await self.channel_layer.group_send(
            self.group_name, {"type": "chat.message_deleted", "message_id": message_id}
        )

    async def _notify_user_joined(self):
        """Notify about user join"""
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "chat.user_joined",
                "user_id": self.user_id,
                "user_name": self.user_name,
                "timestamp": timezone.now().isoformat(),
            },
        )

    async def _notify_user_left(self):
        """Notify about user leave"""
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "chat.user_left",
                "user_id": self.user_id,
                "user_name": self.user_name,
                "timestamp": timezone.now().isoformat(),
            },
        )

    async def _invalidate_room_cache(self, room_id: str):
        """Clear room cache"""
        pattern = f"room_*:{room_id}*"
        cache.delete_pattern(pattern)

    async def _clear_cache(self):
        """Clear all user cache"""
        for key in self.cache_keys:
            cache.delete(key)
        self.cache_keys.clear()

    async def _start_periodic_tasks(self):
        """Start periodic cleanup tasks"""
        # Typing status cleanup every 30 seconds
        task = asyncio.create_task(self._periodic_typing_cleanup())
        self.periodic_tasks.append(task)

    async def _periodic_typing_cleanup(self):
        """Periodic typing cleanup"""
        while True:
            try:
                await asyncio.sleep(30)
                # Cleanup old typing statuses
                await self._cleanup_old_typing()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Periodic cleanup error: {e}")

    @database_sync_to_async
    def _cleanup_old_typing(self):
        """Clean old typing statuses"""
        cutoff = timezone.now() - timedelta(minutes=2)
        UserTypingStatus.objects.filter(
            room_id=self.room_id, is_typing=True, last_typed_at__lt=cutoff
        ).update(is_typing=False)


# ==================== NOTIFICATION CONSUMER ====================


class ChatNotificationConsumer(AsyncJsonWebsocketConsumer):
    """
    Global notifications consumer.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.user_id: Optional[str] = None
        self.user_group: Optional[str] = None

    async def connect(self):
        """Connect to notifications"""
        try:
            user = self.scope.get("user")

            if not user or isinstance(user, AnonymousUser) or not user.is_authenticated:
                await self.close(code=4401)
                return

            self.user_id = str(user.id)
            self.user_group = f"user_{self.user_id}"

            # Add to user group
            await self.channel_layer.group_add(self.user_group, self.channel_name)

            await self.accept()

            # Send connection confirmation
            await self.send_json(
                {"type": "connected", "timestamp": timezone.now().isoformat()}
            )

            logger.info(f"Notification WS connected: user={self.user_id}")

        except Exception as e:
            logger.error(f"Notification connection error: {e}")
            await self.close(code=4500)

    async def disconnect(self, close_code):
        """Disconnect from notifications"""
        try:
            if self.user_group:
                await self.channel_layer.group_discard(
                    self.user_group, self.channel_name
                )

            # Cleanup
            self.user_id = None
            self.user_group = None

            logger.info(f"Notification WS disconnected: code={close_code}")

        except Exception as e:
            logger.error(f"Notification disconnect error: {e}")

        # ==================== NOTIFICATION CONSUMER (davomi) ====================

    async def receive_json(self, content: Dict[str, Any], **kwargs):
        """Handle incoming messages"""
        if content.get("type") == "ping":
            await self.send_json(
                {"type": "pong", "timestamp": timezone.now().isoformat()}
            )

    async def chat_notification(self, event):
        """Send notification to user"""
        await self.send_json(
            {"type": "notification", "timestamp": timezone.now().isoformat(), **event}
        )

    async def chat_new_message(self, event):
        """New message notification"""
        await self.send_json({"type": "new_message", **event})

    async def chat_room_invite(self, event):
        """Room invite notification"""
        await self.send_json({"type": "room_invite", **event})
