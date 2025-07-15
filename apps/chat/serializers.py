from rest_framework import serializers
from apps.chat.models import ChatRoom, Message, MessageRead, UserTypingStatus
from apps.users.serializers import UserShortSerializer  # qisqa user info


# ─────────────── ChatRoom ───────────────
class ChatRoomSerializer(serializers.ModelSerializer):
    participants = UserShortSerializer(many=True, read_only=True)

    class Meta:
        model = ChatRoom
        fields = [
            "id",
            "room_type",
            "participants",
            "booking",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


# ─────────────── Message ───────────────
class MessageSerializer(serializers.ModelSerializer):
    sender = UserShortSerializer(read_only=True)

    class Meta:
        model = Message
        fields = [
            "id",
            "room",
            "sender",
            "message_type",
            "text",
            "image",
            "file",
            "file_name",
            "file_size",
            "latitude",
            "longitude",
            "location_name",
            "reply_to",
            "is_edited",
            "edited_at",
            "is_deleted",
            "deleted_at",
            "created_at",
        ]
        read_only_fields = [
            "is_edited",
            "edited_at",
            "is_deleted",
            "deleted_at",
            "created_at",
            "sender",
            "room",
        ]


# ─────────────── Read receipt ───────────────
class MessageReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = MessageRead
        fields = ["id", "message", "user", "read_at"]
        read_only_fields = ["id", "user", "read_at"]


# ─────────────── Typing status ───────────────
class TypingStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserTypingStatus
        fields = ["room", "user", "is_typing", "last_typed_at"]
        read_only_fields = ["user", "last_typed_at"]
