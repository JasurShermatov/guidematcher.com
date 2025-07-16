# apps/chat/consumers.py
import logging
import uuid
from typing import Any, Dict, List, Optional

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.contrib.auth.models import AnonymousUser
from django.utils import timezone

from apps.chat.models import ChatRoom, Message, MessageRead, UserTypingStatus
from apps.chat.serializers import MessageSerializer
from apps.users.serializers import UserShortSerializer

logger = logging.getLogger(__name__)


class ChatConsumer(AsyncJsonWebsocketConsumer):
    """
    Real-time chat (Channels).
    Group name: chat_<room_uuid>

    🔐 Auth: Query-string JWT middleware scope["user"].
    ❗ Room UUID URLConf param: <room_id>

    Client -> Server events (JSON: { "type": "<event>", ... }):
        message.send   { "text": "...", ["reply_to": "<uuid>"] }
        location.send  { "latitude": float, "longitude": float, "name": str }
        file.broadcast { "message_id": "<uuid>" }   # message already created via REST upload
        typing         { "is_typing": bool }
        read           { "message_ids": ["uuid", ...] }
        ping           {}  # keepalive

    Server -> Client events:
        message  { <MessageSerializer fields ...> }
        typing   { "user_id": "<uuid>", "is_typing": bool }
        read     { "user_id": "<uuid>", "message_ids": [...] }
        system   { "text": str }
        error    { "detail": str, "code": str? }
        pong     {}

    NOTE: Katta fayllar REST orqali yuklanadi; WS faqat natijani (message) tarqatadi.
    """

    # ------------------------------
    # Lifecycle
    # ------------------------------
    async def connect(self):
        self.room_id = self.scope["url_route"]["kwargs"]["room_id"]
        self.group_name = f"chat_{self.room_id}"

        user = self.scope.get("user")
        if not user or isinstance(user, AnonymousUser) or not user.is_authenticated:
            await self.close(code=4401)  # Unauthorized
            return

        # Room mavjudmi va user participantmi?
        if not await self._user_in_room(user.id, self.room_id):
            await self.close(code=4403)  # Forbidden
            return

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        logger.debug("WS connected user=%s room=%s", user.id, self.room_id)

        # Salomlashish / qo'shimcha meta (istasa front foydalanadi)
        await self.send_json(
            {
                "type": "system",
                "text": f"Connected to room {self.room_id}",
                "room_id": self.room_id,
                "user_id": str(user.id),
            }
        )

    async def disconnect(self, close_code):
        try:
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
        except Exception:  # noqa
            pass
        logger.debug("WS disconnected code=%s room=%s", close_code, self.room_id)

    # ------------------------------
    # Incoming messages (dispatch)
    # ------------------------------
    async def receive_json(self, content: Dict[str, Any], **kwargs):
        event_type = content.get("type")
        if not event_type:
            await self._send_error("Missing 'type' field.", code="missing_type")
            return

        # dispatch map
        client_actions = {
            "message.send": self._handle_message_send,
            "location.send": self._handle_location_send,
            "file.broadcast": self._handle_file_broadcast,
            "typing": self._handle_typing,
            "read": self._handle_read,
            "ping": self._handle_ping,
        }

        handler = client_actions.get(event_type)
        if not handler:
            await self._send_error(f"Unknown event: {event_type}", code="unknown_event")
            return

        await handler(content)

    # ------------------------------
    # Client event handlers
    # ------------------------------
    async def _handle_message_send(self, payload: Dict[str, Any]):
        """Create TEXT message from WS."""
        text = (payload.get("text") or "").strip()
        if not text:
            await self._send_error("Empty message.", code="empty_text")
            return

        reply_to = payload.get("reply_to")
        msg_data = await self._create_message(
            sender_id=self.scope["user"].id,
            room_id=self.room_id,
            message_type=Message.MessageType.TEXT,
            text=text,
            reply_to=reply_to,
        )
        await self._broadcast_message(msg_data)

    async def _handle_location_send(self, payload: Dict[str, Any]):
        """Create LOCATION message from WS."""
        try:
            lat = float(payload["latitude"])
            lon = float(payload["longitude"])
        except Exception:  # noqa
            await self._send_error("Invalid latitude/longitude.", code="bad_location")
            return

        name = payload.get("name", "")
        msg_data = await self._create_message(
            sender_id=self.scope["user"].id,
            room_id=self.room_id,
            message_type=Message.MessageType.LOCATION,
            latitude=lat,
            longitude=lon,
            location_name=name,
        )
        await self._broadcast_message(msg_data)

    async def _handle_file_broadcast(self, payload: Dict[str, Any]):
        """
        Fayl / rasm frontdan REST orqali allaqachon yuklangan bo‘lishi kerak.
        Bu yerda faqat message_id ni broadcast qilamiz (DB dan olib).
        """
        message_id = payload.get("message_id")
        if not message_id:
            await self._send_error("message_id required.", code="missing_message_id")
            return
        msg_data = await self._get_message_data(message_id, room_id=self.room_id)
        if not msg_data:
            await self._send_error("Message not found.", code="msg_not_found")
            return
        await self._broadcast_message(msg_data)

    async def _handle_typing(self, payload: Dict[str, Any]):
        is_typing = bool(payload.get("is_typing"))
        await self._set_typing(self.scope["user"].id, self.room_id, is_typing)
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "chat.typing",
                "user_id": str(self.scope["user"].id),
                "is_typing": is_typing,
            },
        )

    async def _handle_read(self, payload: Dict[str, Any]):
        message_ids = payload.get("message_ids") or []
        valid_ids = [mid for mid in message_ids if _safe_uuid(mid)]
        if valid_ids:
            await self._mark_read(self.scope["user"].id, valid_ids)
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "chat.read",
                    "user_id": str(self.scope["user"].id),
                    "message_ids": valid_ids,
                },
            )

    async def _handle_ping(self, payload: Dict[str, Any]):
        await self.send_json({"type": "pong"})

    # ------------------------------
    # Outbound group event handlers
    # (Channels calls these when group_send fires)
    # ------------------------------
    async def chat_message(self, event):
        await self.send_json({"type": "message", **event["message"]})

    async def chat_typing(self, event):
        await self.send_json({"type": "typing", **event})

    async def chat_read(self, event):
        await self.send_json({"type": "read", **event})

    # ------------------------------
    # Helpers
    # ------------------------------
    async def _broadcast_message(self, msg_data: Dict[str, Any]):
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "chat.message",
                "message": msg_data,
            },
        )

    async def _send_error(self, text: str, code: str = "error"):
        await self.send_json({"type": "error", "detail": text, "code": code})

    # ------------------------------
    # DB (sync -> async)
    # ------------------------------
    @database_sync_to_async
    def _user_in_room(self, user_id, room_id) -> bool:
        return ChatRoom.objects.filter(id=room_id, participants__id=user_id).exists()

    @database_sync_to_async
    def _create_message(
        self,
        sender_id,
        room_id,
        message_type,
        text: str = "",
        reply_to: Optional[str] = None,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        location_name: str = "",
    ) -> Dict[str, Any]:
        kwargs = {
            "room_id": room_id,
            "sender_id": sender_id,
            "message_type": message_type,
        }
        if text:
            kwargs["text"] = text
        if latitude is not None and longitude is not None:
            kwargs["latitude"] = latitude
            kwargs["longitude"] = longitude
            kwargs["location_name"] = location_name[:255]
        if reply_to and _safe_uuid(reply_to):
            kwargs["reply_to_id"] = reply_to

        msg = Message.objects.create(**kwargs)

        # room updated_at
        ChatRoom.objects.filter(pk=room_id).update(updated_at=timezone.now())

        return self._serialize_message(msg)

    @database_sync_to_async
    def _get_message_data(
        self, message_id: str, room_id: str
    ) -> Optional[Dict[str, Any]]:
        try:
            msg = Message.objects.select_related("sender", "reply_to", "room").get(
                id=message_id, room_id=room_id
            )
        except Message.DoesNotExist:
            return None
        return self._serialize_message(msg)

    @database_sync_to_async
    def _set_typing(self, user_id, room_id, is_typing):
        obj, _ = UserTypingStatus.objects.get_or_create(
            room_id=room_id, user_id=user_id
        )
        obj.is_typing = is_typing
        obj.save(update_fields=["is_typing", "last_typed_at"])

    @database_sync_to_async
    def _mark_read(self, user_id, message_ids: List[str]):
        """
        bulk_create bilan tez.
        """
        objs = []
        now = timezone.now()
        for mid in message_ids:
            if not _safe_uuid(mid):
                continue
            objs.append(MessageRead(message_id=mid, user_id=user_id, read_at=now))
        if objs:
            MessageRead.objects.bulk_create(objs, ignore_conflicts=True)

    # ------------------------------
    # Serialization (DB -> dict)
    # ------------------------------
    def _serialize_message(self, msg: Message) -> Dict[str, Any]:
        """
        Siz DRF serializerdan foydalanmoqchi bo‘lsangiz, shuni ishlatamiz.
        Yoki minimal payload qaytaring (quyidagi return_dict variantini yoqib).
        """
        data = MessageSerializer(msg).data

        # UserShortSerializer frontga kerak bo‘lsa:
        if msg.sender_id:
            data["sender_short"] = UserShortSerializer(msg.sender).data

        return data
        # --- Minimal, yengil variant:
        # return {
        #     "id": str(msg.id),
        #     "room": str(msg.room_id),
        #     "sender": str(msg.sender_id) if msg.sender_id else None,
        #     "message_type": msg.message_type,
        #     "text": msg.text,
        #     "image": msg.image.url if msg.image else None,
        #     "file": msg.file.url if msg.file else None,
        #     "file_name": msg.file_name,
        #     "file_size": msg.file_size,
        #     "latitude": float(msg.latitude) if msg.latitude is not None else None,
        #     "longitude": float(msg.longitude) if msg.longitude is not None else None,
        #     "location_name": msg.location_name,
        #     "reply_to": str(msg.reply_to_id) if msg.reply_to_id else None,
        #     "is_deleted": msg.is_deleted,
        #     "created_at": msg.created_at.isoformat(),
        #     "edited_at": msg.edited_at.isoformat() if msg.edited_at else None,
        # }
        # ------------------------------
        # End minimal
        # ------------------------------


# ------------------------------
# Utility
# ------------------------------
def _safe_uuid(val: Any) -> bool:
    try:
        uuid.UUID(str(val))
        return True
    except Exception:  # noqa
        return False
