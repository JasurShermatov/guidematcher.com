from rest_framework import serializers
from apps.chat.models import ChatRoom, Message, MessageRead, UserTypingStatus
from apps.users.serializers import UserShortSerializer
from apps.common.validators import (
    validate_image_file,
    validate_document_file,
)  # mavjud validatorlaringiz


# ─────────────── ChatRoom ───────────────
class ChatRoomSerializer(serializers.ModelSerializer):
    participants = UserShortSerializer(many=True, read_only=True)

    class Meta:
        model = ChatRoom
        fields = (
            "id",
            "room_type",
            "participants",
            "booking",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("created_at", "updated_at")


# ─────────────── Message ───────────────
class MessageSerializer(serializers.ModelSerializer):
    sender = UserShortSerializer(read_only=True)

    class Meta:
        model = Message
        fields = (
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
        )
        read_only_fields = (
            "sender",
            "room",
            "is_edited",
            "edited_at",
            "is_deleted",
            "deleted_at",
            "created_at",
        )

    # ------- validate content per-type ----------
    def validate(self, attrs):
        mtype = attrs.get("message_type") or self.instance.message_type  # PATCH kerak
        if mtype == Message.MessageType.TEXT and not attrs.get("text"):
            raise serializers.ValidationError({"text": "Text required"})
        if mtype == Message.MessageType.IMAGE:
            validate_image_file(attrs.get("image"))
        if mtype in (
            Message.MessageType.FILE,
            Message.MessageType.AUDIO,
            Message.MessageType.VIDEO,
        ):
            validate_document_file(attrs.get("file"))
        if mtype == Message.MessageType.LOCATION:
            if attrs.get("latitude") is None or attrs.get("longitude") is None:
                raise serializers.ValidationError({"latitude": "lat/lon required"})
        return attrs


# ─────────────── Read receipt ───────────────
class MessageReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = MessageRead
        fields = ("id", "message", "user", "read_at")
        read_only_fields = ("user", "read_at")


# ─────────────── Typing status ───────────────
class TypingStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserTypingStatus
        fields = ("room", "user", "is_typing", "last_typed_at")
        read_only_fields = ("user", "last_typed_at")
