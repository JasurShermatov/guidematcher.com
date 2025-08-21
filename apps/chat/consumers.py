# consumers.py
import json
from urllib.parse import parse_qs
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from django.utils import timezone
from rest_framework_simplejwt.tokens import AccessToken
from django.db import models
from django.conf import settings
import jwt
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

from apps.users.models import User
from .models import Conversation, Message, BlockedUser
from .serializers import MessageListSerializer


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):

        try:
            # Decode JWT
            user = await self.get_user("d6b25498-b3f2-4023-b0c7-07c903260ee9")
            if not user:
                await self.close(code=4003)  # Invalid user
                return

            self.scope["user"] = user
            await self.accept()
            print(f"✅ User {user.full_name} connected to chat")

        except jwt.ExpiredSignatureError:
            await self.close(code=4002)  # Token expired
        except jwt.InvalidTokenError:
            await self.close(code=4003)  # Invalid token

    @database_sync_to_async
    def get_user(self, user_id):
        try:
            return User.objects.get(id=user_id)
        except User.DoesNotExist:
            return None

    async def disconnect(self, close_code):
        if hasattr(self, "conversation_group_name"):
            # Send user offline status
            await self.channel_layer.group_send(
                self.conversation_group_name,
                {
                    "type": "user_offline",
                    "user_id": self.user.id,
                    "user_name": self.user.full_name or self.user.email,
                },
            )

            # Leave conversation group
            await self.channel_layer.group_discard(
                self.conversation_group_name, self.channel_name
            )

    async def receive(self, text_data):
        try:
            text_data_json = json.loads(text_data)
            message_type = text_data_json.get("type", "")

            if message_type == "chat_message":
                await self.handle_chat_message(text_data_json)
            elif message_type == "message_read":
                await self.handle_message_read(text_data_json)
            elif message_type == "message_action":
                await self.handle_message_action(text_data_json)
            elif message_type == "typing":
                await self.handle_typing(text_data_json)

        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({"error": "Invalid JSON"}))
        except Exception as e:
            await self.send(text_data=json.dumps({"error": str(e)}))

    async def handle_chat_message(self, data):
        content = data.get("content", "").strip()

        if not content:
            await self.send(
                text_data=json.dumps({"error": "Message content cannot be empty"})
            )
            return

        if len(content) > 5000:
            await self.send(
                text_data=json.dumps(
                    {"error": "Message too long (max 5000 characters)"}
                )
            )
            return

        # Check if users are blocked
        other_user = await self.get_other_user()
        if await self.users_are_blocked(self.user, other_user):
            await self.send(
                text_data=json.dumps({"error": "Cannot send message to this user"})
            )
            return

        # Create message
        message = await self.create_message(content)

        # Serialize message
        message_data = await self.serialize_message(message)

        # Send message to conversation group
        await self.channel_layer.group_send(
            self.conversation_group_name,
            {"type": "chat_message", "message": message_data},
        )

    async def handle_message_read(self, data):
        message_id = data.get("message_id")
        if message_id:
            await self.mark_message_read(message_id)

            # Notify other user that message was read
            await self.channel_layer.group_send(
                self.conversation_group_name,
                {
                    "type": "message_read",
                    "message_id": message_id,
                    "user_id": self.user.id,
                },
            )

    async def handle_message_action(self, data):
        message_id = data.get("message_id")
        action = data.get("action")  # 'delete_sender', 'delete_both', 'recover'

        if not message_id or not action:
            return

        success = await self.perform_message_action(message_id, action)

        if success:
            # Get updated message data
            message_data = await self.get_message_data(message_id)

            # Notify conversation group
            await self.channel_layer.group_send(
                self.conversation_group_name,
                {
                    "type": "message_action",
                    "message_id": message_id,
                    "action": action,
                    "message": message_data,
                    "user_id": self.user.id,
                },
            )

    async def handle_typing(self, data):
        is_typing = data.get("is_typing", False)

        # Send typing indicator to other user
        await self.channel_layer.group_send(
            self.conversation_group_name,
            {
                "type": "typing_indicator",
                "user_id": self.user.id,
                "user_name": self.user.full_name or self.user.email,
                "is_typing": is_typing,
            },
        )

    # WebSocket message handlers
    async def chat_message(self, event):
        await self.send(
            text_data=json.dumps({"type": "chat_message", "message": event["message"]})
        )

    async def message_read(self, event):
        # Don't send read receipt to the user who read the message
        if event["user_id"] != self.user.id:
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
        # Don't send typing indicator to the user who is typing
        if event["user_id"] != self.user.id:
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
        # Don't send online status to the user themselves
        if event["user_id"] != self.user.id:
            await self.send(
                text_data=json.dumps(
                    {"type": "user_online", "user_name": event["user_name"]}
                )
            )

    async def user_offline(self, event):
        # Don't send offline status to the user themselves
        if event["user_id"] != self.user.id:
            await self.send(
                text_data=json.dumps(
                    {"type": "user_offline", "user_name": event["user_name"]}
                )
            )

    @database_sync_to_async
    def get_user_from_token(self):
        try:
            query_string = self.scope.get("query_string", b"").decode()
            params = parse_qs(query_string)
            token = params.get("token", [None])[0]

            print("🔍 Query string:", query_string)
            print("🔍 Token found:", token)

            if not token:
                return None

            access_token = AccessToken(token)
            user_id = access_token["user_id"]
            print("🔍 Decoded user_id:", user_id)

            user = User.objects.get(id=user_id)
            print("✅ Authenticated user:", user)
            return user

        except Exception as e:
            print("❌ Token auth failed:", e)
            return None

    @database_sync_to_async
    def get_conversation(self):
        try:
            return Conversation.objects.get(id=self.conversation_id)
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
        return BlockedUser.objects.filter(
            models.Q(blocker=user1, blocked=user2)
            | models.Q(blocker=user2, blocked=user1)
        ).exists()

    @database_sync_to_async
    def create_message(self, content):
        message = Message.objects.create(
            conversation=self.conversation, sender=self.user, content=content
        )

        # Update conversation timestamp
        self.conversation.updated_at = timezone.now()
        self.conversation.save()

        return message

    @database_sync_to_async
    def serialize_message(self, message):
        from django.http import HttpRequest

        # Create a fake request for serializer context
        request = HttpRequest()
        request.user = self.user

        serializer = MessageListSerializer(message, context={"request": request})
        return serializer.data

    @database_sync_to_async
    def mark_message_read(self, message_id):
        try:
            message = Message.objects.get(id=message_id, conversation=self.conversation)
            # Only mark as read if user is not the sender
            if message.sender != self.user:
                message.mark_as_read()
            return True
        except Message.DoesNotExist:
            return False

    @database_sync_to_async
    def perform_message_action(self, message_id, action):
        try:
            message = Message.objects.get(
                id=message_id, conversation=self.conversation, sender=self.user
            )

            if action == "delete_sender":
                return message.delete_for_sender(self.user)
            elif action == "delete_both":
                return message.delete_for_both(self.user)
            elif action == "recover":
                return message.recover_message(self.user)

            return False
        except Message.DoesNotExist:
            return False

    @database_sync_to_async
    def get_message_data(self, message_id):
        try:
            message = Message.objects.get(id=message_id)

            from django.http import HttpRequest

            request = HttpRequest()
            request.user = self.user

            serializer = MessageListSerializer(message, context={"request": request})
            return serializer.data
        except Message.DoesNotExist:
            return None
