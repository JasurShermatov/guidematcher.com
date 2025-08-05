from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import ChatRoom, Message, MessageAttachment
from apps.users.serializers import UserSerializer
from apps.bookings.models import BookingRequest

User = get_user_model()


class MessageAttachmentSerializer(serializers.ModelSerializer):
    """
    Serializer for message attachments
    """

    class Meta:
        model = MessageAttachment
        fields = [
            "id",
            "file_url",
            "file_name",
            "file_size",
            "content_type",
            "created_at",
        ]
        read_only_fields = ["created_at"]


class MessageSerializer(serializers.ModelSerializer):
    """
    Serializer for messages
    """

    sender = UserSerializer(read_only=True)
    attachments = MessageAttachmentSerializer(many=True, read_only=True)
    booking_request_id = serializers.UUIDField(
        source="booking_request.id", read_only=True
    )

    class Meta:
        model = Message
        fields = [
            "id",
            "room",
            "sender",
            "message_type",
            "content",
            "file_url",
            "file_name",
            "file_size",
            "is_read",
            "read_at",
            "created_at",
            "attachments",
            "booking_request_id",
        ]
        read_only_fields = ["sender", "is_read", "read_at", "created_at"]


class ChatRoomSerializer(serializers.ModelSerializer):
    """
    Serializer for chat rooms
    """

    client = UserSerializer(read_only=True)
    guide = UserSerializer(read_only=True)
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = ChatRoom
        fields = [
            "id",
            "client",
            "guide",
            "is_active",
            "last_message_at",
            "last_message",
            "created_at",
        ]
        read_only_fields = ["created_at", "last_message_at"]

    def get_last_message(self, obj):
        """
        Get the last message in the chat room
        """
        last_message = obj.messages.order_by("-created_at").first()
        if last_message:
            return MessageSerializer(last_message).data
        return None


class MessageCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating messages
    """

    file = serializers.FileField(required=False, allow_null=True)
    booking_request = serializers.PrimaryKeyRelatedField(
        queryset=BookingRequest.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = Message
        fields = ["content", "message_type", "file", "booking_request"]

    def validate(self, attrs):
        """
        Validate message data
        """
        message_type = attrs.get("message_type", "text")
        content = attrs.get("content")
        file = attrs.get("file")
        booking_request = attrs.get("booking_request")

        if message_type == "text" and not content:
            raise serializers.ValidationError(
                {"content": "Text messages must have content."}
            )
        if message_type in ["image", "file"] and not file:
            raise serializers.ValidationError(
                {"file": "File is required for image or file messages."}
            )
        if message_type == "booking_request" and not booking_request:
            raise serializers.ValidationError(
                {
                    "booking_request": "Booking request is required for booking_request messages."
                }
            )

        return attrs

    def create(self, validated_data):
        """
        Create a message with optional file attachment
        """
        file = validated_data.pop("file", None)
        room = self.context["room"]
        sender = self.context["request"].user

        message = Message.objects.create(room=room, sender=sender, **validated_data)

        if file:
            from .validators import validate_file

            file_data = validate_file(file)
            MessageAttachment.objects.create(
                message=message,
                file_url=file_data["file_url"],
                file_name=file.name,
                file_size=file.size,
                content_type=file.content_type,
            )

        return message
