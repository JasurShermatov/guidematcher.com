# apps/chat/consumers.py
import json
import logging
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.utils import timezone
from django.db import models

logger = logging.getLogger("apps.chat.consumers")

CLOSE_CODES = {
    "BAD_REQUEST": 4000,
    "UNAUTHORIZED": 4001,
    "FORBIDDEN": 4003,
    "NOT_FOUND": 4004,
    "INTERNAL_ERROR": 4500,
}


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        logger.debug("WS CONNECT START - scope.path=%s", self.scope.get("path"))

        # 1) conversation_id
        try:
            conv_id_raw = self.scope["url_route"]["kwargs"].get("conversation_id")
            if conv_id_raw is None:
                logger.warning("No conversation_id in URL kwargs")
                await self.close(code=CLOSE_CODES["BAD_REQUEST"])
                return
            self.conversation_id = str(conv_id_raw)
            logger.debug("Parsed conversation_id=%s", self.conversation_id)
        except Exception as e:
            logger.exception("Failed to parse conversation_id: %s", e)
            await self.close(code=CLOSE_CODES["BAD_REQUEST"])
            return

        # 2) Auth
        try:
            scope_user = getattr(self.scope, "user", None)
            if scope_user and not getattr(scope_user, "is_anonymous", True):
                user = scope_user
                logger.debug(
                    "User from scope middleware: %s", getattr(user, "id", None)
                )
            else:
                user = await self.get_user_from_token()
                logger.debug(
                    "User resolved from token: %s",
                    getattr(user, "id", None) if user else None,
                )

            if not user or getattr(user, "is_anonymous", True):
                logger.warning("Unauthorized WS connect attempt (no user)")
                await self.close(code=CLOSE_CODES["UNAUTHORIZED"])
                return

            self.user = user
        except Exception as e:
            logger.exception("Error while authenticating websocket user: %s", e)
            await self.close(code=CLOSE_CODES["UNAUTHORIZED"])
            return

        # 3) Conversation
        try:
            self.conversation = await self.get_conversation()
            if not self.conversation:
                logger.warning("Conversation not found: %s", self.conversation_id)
                await self.close(code=CLOSE_CODES["NOT_FOUND"])
                return
        except Exception as e:
            logger.exception("Error loading conversation: %s", e)
            await self.close(code=CLOSE_CODES["NOT_FOUND"])
            return

        # 4) Permission
        try:
            can_access = await self.user_can_access_conversation(self.conversation)
            logger.debug("user_can_access_conversation=%s", can_access)
            if not can_access:
                logger.warning(
                    "User %s forbidden for conversation %s",
                    self.user.id,
                    self.conversation_id,
                )
                await self.close(code=CLOSE_CODES["FORBIDDEN"])
                return
        except Exception as e:
            logger.exception("Error checking conversation permission: %s", e)
            await self.close(code=CLOSE_CODES["FORBIDDEN"])
            return

        # 5) Group add + accept
        try:
            self.conversation_group_name = f"chat_{self.conversation_id}"
            await self.channel_layer.group_add(
                self.conversation_group_name, self.channel_name
            )
            await self.accept()
            logger.info(
                "User %s accepted into conversation %s",
                self.user.id,
                self.conversation_id,
            )

            await self.channel_layer.group_send(
                self.conversation_group_name,
                {
                    "type": "user_online",
                    "user_id": str(self.user.id),  # ensure UUID safe for JSON
                    "user_name": getattr(self.user, "full_name", None)
                    or getattr(self.user, "email", ""),
                },
            )
        except Exception as e:
            logger.exception("Error during group_add / accept: %s", e)
            await self.close(code=CLOSE_CODES["INTERNAL_ERROR"])

    async def disconnect(self, close_code):
        logger.info(
            "WS disconnect - user=%s conv=%s code=%s",
            getattr(self, "user", None) and str(getattr(self.user, "id", None)),
            getattr(self, "conversation_id", None),
            close_code,
        )
        if hasattr(self, "conversation_group_name"):
            try:
                await self.channel_layer.group_send(
                    self.conversation_group_name,
                    {
                        "type": "user_offline",
                        "user_id": str(self.user.id),
                        "user_name": getattr(self.user, "full_name", None)
                        or getattr(self.user, "email", ""),
                    },
                )
                await self.channel_layer.group_discard(
                    self.conversation_group_name, self.channel_name
                )
            except Exception as e:
                logger.exception("Error in disconnect cleanup: %s", e)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({"error": "Invalid JSON"}))
            return

        msg_type = data.get("type")

        if msg_type == "chat_message":
            await self.handle_chat_message(data)
        elif msg_type == "message_read":
            await self.handle_message_read(data)
        elif msg_type == "message_action":
            await self.handle_message_action(data)
        elif msg_type == "typing":
            await self.handle_typing(data)

    async def handle_chat_message(self, data):
        content = (data.get("content") or "").strip()
        if not content:
            await self.send(
                text_data=json.dumps({"error": "Message content cannot be empty"})
            )
            return
        if len(content) > 5000:
            await self.send(
                text_data=json.dumps({"error": "Message too long (max 5000)"})
            )
            return

        other_user = await self.get_other_user()
        if await self.users_are_blocked(self.user, other_user):
            await self.send(
                text_data=json.dumps({"error": "Cannot send message to this user"})
            )
            return

        message = await self.create_message(content)
        message_data = await self.serialize_message(message)

        await self.channel_layer.group_send(
            self.conversation_group_name,
            {"type": "chat_message", "message": message_data},
        )

    async def handle_message_read(self, data):
        message_id = data.get("message_id")
        if not message_id:
            return
        ok = await self.mark_message_read(message_id)
        if ok:
            await self.channel_layer.group_send(
                self.conversation_group_name,
                {
                    "type": "message_read",
                    "message_id": message_id,
                    "user_id": str(self.user.id),
                },
            )

    async def handle_message_action(self, data):
        message_id = data.get("message_id")
        action = data.get("action")
        if not message_id or not action:
            return
        success = await self.perform_message_action(message_id, action)
        if success:
            msg_data = await self.get_message_data(message_id)
            await self.channel_layer.group_send(
                self.conversation_group_name,
                {
                    "type": "message_action",
                    "message_id": message_id,
                    "action": action,
                    "message": msg_data,
                    "user_id": str(self.user.id),
                },
            )

    async def handle_typing(self, data):
        is_typing = bool(data.get("is_typing", False))
        await self.channel_layer.group_send(
            self.conversation_group_name,
            {
                "type": "typing_indicator",
                "user_id": str(self.user.id),
                "user_name": getattr(self.user, "full_name", None)
                or getattr(self.user, "email", ""),
                "is_typing": is_typing,
            },
        )

    # Outgoing event handlers
    async def chat_message(self, event):
        await self.send(
            text_data=json.dumps({"type": "chat_message", "message": event["message"]})
        )

    async def message_read(self, event):
        if event["user_id"] != str(self.user.id):
            await self.send(
                text_data=json.dumps(
                    {
                        "type": "message_read",
                        "message_id": event["message_id"],
                        "user_id": event["user_id"],
                    }
                )
            )

    async def message_action(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "message_action",
                    "message_id": event["message_id"],
                    "action": event["action"],
                    "message": event["message"],
                    "user_id": event["user_id"],
                }
            )
        )

    async def typing_indicator(self, event):
        if event["user_id"] != str(self.user.id):
            await self.send(
                text_data=json.dumps(
                    {
                        "type": "typing_indicator",
                        "user_name": event["user_name"],
                        "is_typing": event["is_typing"],
                    }
                )
            )

    async def user_online(self, event):
        if event["user_id"] != str(self.user.id):
            await self.send(
                text_data=json.dumps(
                    {"type": "user_online", "user_name": event["user_name"]}
                )
            )

    async def user_offline(self, event):
        if event["user_id"] != str(self.user.id):
            await self.send(
                text_data=json.dumps(
                    {"type": "user_offline", "user_name": event["user_name"]}
                )
            )

    # DB helpers
    @database_sync_to_async
    def get_user_from_token(self):
        from django.apps import apps
        from rest_framework_simplejwt.tokens import AccessToken

        User = apps.get_model("users", "User")
        try:
            query_string = self.scope.get("query_string", b"").decode()
            params = parse_qs(query_string)
            token = params.get("token", [None])[0]

            if not token:
                headers = {
                    k.decode().lower(): v.decode()
                    for k, v in self.scope.get("headers", [])
                }
                auth_header = headers.get("authorization") or headers.get(
                    "http_authorization"
                )
                if auth_header:
                    if auth_header.lower().startswith("bearer "):
                        token = auth_header.split(" ", 1)[1].strip()
                    else:
                        token = auth_header.strip()

            if not token:
                logger.debug("No token provided")
                return None

            access = AccessToken(token)
            user_id = access.get("user_id")
            if not user_id:
                return None
            return User.objects.get(id=user_id)
        except Exception as e:
            logger.exception("Failed to get user from token: %s", e)
            return None

    @database_sync_to_async
    def get_conversation(self):
        from .models import Conversation

        try:
            return Conversation.objects.get(pk=self.conversation_id)
        except Conversation.DoesNotExist:
            return None

    @database_sync_to_async
    def user_can_access_conversation(self, conversation):
        return conversation.has_user(self.user)

    @database_sync_to_async
    def get_other_user(self):
        return self.conversation.get_other_user(self.user)

    @database_sync_to_async
    def users_are_blocked(self, user1, user2):
        from .models import BlockedUser

        return BlockedUser.objects.filter(
            models.Q(blocker=user1, blocked=user2)
            | models.Q(blocker=user2, blocked=user1)
        ).exists()

    @database_sync_to_async
    def create_message(self, content):
        from .models import Message

        msg = Message.objects.create(
            conversation=self.conversation, sender=self.user, content=content
        )
        self.conversation.updated_at = timezone.now()
        self.conversation.save(update_fields=["updated_at"])
        return msg

    @database_sync_to_async
    def serialize_message(self, message):
        from django.http import HttpRequest
        from .serializers import MessageListSerializer

        req = HttpRequest()
        req.user = self.user
        return MessageListSerializer(message, context={"request": req}).data

    @database_sync_to_async
    def mark_message_read(self, message_id):
        from .models import Message

        try:
            m = Message.objects.get(id=message_id, conversation=self.conversation)
            if m.sender_id != self.user.id:
                m.mark_as_read()
            return True
        except Message.DoesNotExist:
            return False

    @database_sync_to_async
    def perform_message_action(self, message_id, action):
        from .models import Message

        try:
            m = Message.objects.get(
                id=message_id, conversation=self.conversation, sender=self.user
            )
            if action == "delete_sender":
                return m.delete_for_sender(self.user)
            elif action == "delete_both":
                return m.delete_for_both(self.user)
            elif action == "recover":
                return m.recover_message(self.user)
            return False
        except Message.DoesNotExist:
            return False

    @database_sync_to_async
    def get_message_data(self, message_id):
        from .models import Message
        from django.http import HttpRequest
        from .serializers import MessageListSerializer

        try:
            m = Message.objects.get(id=message_id)
            req = HttpRequest()
            req.user = self.user
            return MessageListSerializer(m, context={"request": req}).data
        except Message.DoesNotExist:
            return None
