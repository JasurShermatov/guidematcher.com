# apps/chat/serializers.py
from rest_framework import serializers
from django.utils import timezone
from apps.chat.models import ChatRoom, Message, MessageRead, UserTypingStatus
from apps.users.serializers import UserShortSerializer
from apps.common.validators import (
    validate_image_file,
    validate_document_file,
)


class ChatRoomListSerializer(serializers.ModelSerializer):

    participants = UserShortSerializer(many=True, read_only=True)
    other_participant = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    last_message_sender = serializers.SerializerMethodField()

    class Meta:
        model = ChatRoom
        fields = (
            "id",
            "room_type",
            "participants",
            "other_participant",
            "booking",
            "is_active",
            # Denormalized fields for performance
            "last_message_at",
            "last_message_preview",
            "last_message_type",
            "last_message_sender",
            "total_messages",
            "unread_count",
            "last_activity_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "last_message_at",
            "last_message_preview",
            "last_message_type",
            "total_messages",
            "last_activity_at",
            "created_at",
            "updated_at",
        )

    def get_other_participant(self, obj):
        """Get other participant for direct chats"""
        request = self.context.get("request")
        if not request or obj.room_type != ChatRoom.RoomType.DIRECT:
            return None

        other = obj.other_participant(request.user)
        return UserShortSerializer(other).data if other else None

    def get_unread_count(self, obj):
        """Get unread count for current user (from denormalized field)"""
        request = self.context.get("request")
        if not request:
            return 0
        return obj.get_unread_count(request.user)

    def get_last_message_sender(self, obj):
        """Get last message sender info"""
        if not obj.last_message_sender_id:
            return None

        # Try to get from prefetched participants first
        for participant in obj.participants.all():
            if str(participant.id) == str(obj.last_message_sender_id):
                return UserShortSerializer(participant).data

        # Fallback to database query (should be rare with proper prefetch)
        try:
            from apps.users.models import User

            sender = User.objects.get(id=obj.last_message_sender_id)
            return UserShortSerializer(sender).data
        except User.DoesNotExist:
            return None


class ChatRoomDetailSerializer(serializers.ModelSerializer):

    participants = UserShortSerializer(many=True, read_only=True)
    other_participant = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = ChatRoom
        fields = (
            "id",
            "room_type",
            "participants",
            "other_participant",
            "booking",
            "is_active",
            "last_message_at",
            "last_message_preview",
            "last_message_type",
            "total_messages",
            "unread_count",
            "last_activity_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "last_message_at",
            "last_message_preview",
            "last_message_type",
            "total_messages",
            "last_activity_at",
            "created_at",
            "updated_at",
        )

    def get_other_participant(self, obj):
        request = self.context.get("request")
        if not request or obj.room_type != ChatRoom.RoomType.DIRECT:
            return None
        other = obj.other_participant(request.user)
        return UserShortSerializer(other).data if other else None

    def get_unread_count(self, obj):
        request = self.context.get("request")
        if not request:
            return 0
        return obj.get_unread_count(request.user)


class ChatRoomCreateSerializer(serializers.ModelSerializer):

    participant_ids = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=False,
        help_text="List of participant user IDs",
    )

    class Meta:
        model = ChatRoom
        fields = (
            "room_type",
            "booking",
            "participant_ids",
        )

    def create(self, validated_data):
        participant_ids = validated_data.pop("participant_ids", [])
        room = super().create(validated_data)

        # Add creator as participant
        request = self.context.get("request")
        if request:
            room.participants.add(request.user)

        # Add other participants
        if participant_ids:
            from apps.users.models import User

            participants = User.objects.filter(id__in=participant_ids)
            room.participants.add(*participants)

        return room


class MessageListSerializer(serializers.ModelSerializer):

    sender = UserShortSerializer(read_only=True)
    reply_to_message = serializers.SerializerMethodField()
    is_read_by_user = serializers.SerializerMethodField()

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
            "reply_to_message",
            # Denormalized counts
            "read_count",
            "replies_count",
            # Status fields
            "is_edited",
            "edited_at",
            "is_deleted",
            "deleted_at",
            "is_read_by_user",
            "created_at",
        )
        read_only_fields = (
            "sender",
            "room",
            "read_count",
            "replies_count",
            "is_edited",
            "edited_at",
            "is_deleted",
            "deleted_at",
            "created_at",
        )

    def get_reply_to_message(self, obj):
        """Get basic info about replied message"""
        if not obj.reply_to:
            return None
        return {
            "id": obj.reply_to.id,
            "text": (
                obj.reply_to.text[:100] + "..."
                if len(obj.reply_to.text) > 100
                else obj.reply_to.text
            ),
            "message_type": obj.reply_to.message_type,
            "sender": (
                UserShortSerializer(obj.reply_to.sender).data
                if obj.reply_to.sender
                else None
            ),
        }

    def get_is_read_by_user(self, obj):
        """Check if current user has read this message"""
        request = self.context.get("request")
        if not request:
            return False

        # Use prefetched read_receipts if available
        if hasattr(obj, "_prefetched_read_receipts"):
            return any(
                receipt.user_id == request.user.id
                for receipt in obj._prefetched_read_receipts
            )

        # Fallback to database query
        return obj.read_receipts.filter(user=request.user).exists()


class MessageCreateSerializer(serializers.ModelSerializer):

    class Meta:
        model = Message
        fields = (
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
        )

    def validate(self, attrs):
        """Validate message content based on type"""
        mtype = attrs.get("message_type", Message.MessageType.TEXT)

        if mtype == Message.MessageType.TEXT:
            if not attrs.get("text", "").strip():
                raise serializers.ValidationError(
                    {"text": "Text message cannot be empty"}
                )

        elif mtype == Message.MessageType.IMAGE:
            if not attrs.get("image"):
                raise serializers.ValidationError({"image": "Image file is required"})
            validate_image_file(attrs.get("image"))

        elif mtype in (
            Message.MessageType.FILE,
            Message.MessageType.AUDIO,
            Message.MessageType.VIDEO,
        ):
            if not attrs.get("file"):
                raise serializers.ValidationError({"file": "File is required"})
            validate_document_file(attrs.get("file"))

        elif mtype == Message.MessageType.LOCATION:
            if attrs.get("latitude") is None or attrs.get("longitude") is None:
                raise serializers.ValidationError(
                    {
                        "location": "Latitude and longitude are required for location messages"
                    }
                )

        return attrs

    def create(self, validated_data):
        message = super().create(validated_data)

        if message.reply_to:
            message.reply_to.increment_replies_count(save=True)

        message.room.update_last_message(message, save=True)

        current_user = self.context.get("request").user
        for participant in message.room.participants.exclude(id=current_user.id):
            message.room.increment_unread_count(participant, save=False)

        message.room.save(update_fields=["unread_counts"])

        return message


class MessageUpdateSerializer(serializers.ModelSerializer):

    class Meta:
        model = Message
        fields = ("text",)  # Only text can be edited

    def update(self, instance, validated_data):
        """Update message and mark as edited"""
        instance.text = validated_data.get("text", instance.text)
        instance.is_edited = True
        instance.edited_at = timezone.now()
        instance.save(update_fields=["text", "is_edited", "edited_at"])
        return instance


class MessageReadSerializer(serializers.ModelSerializer):
    user = UserShortSerializer(read_only=True)

    class Meta:
        model = MessageRead
        fields = ("id", "message", "user", "read_at")
        read_only_fields = ("user", "read_at")


class TypingStatusSerializer(serializers.ModelSerializer):
    user = UserShortSerializer(read_only=True)

    class Meta:
        model = UserTypingStatus
        fields = ("room", "user", "is_typing", "last_typed_at")
        read_only_fields = ("user", "last_typed_at")

    def update(self, instance, validated_data):
        """Update typing status and cleanup old ones"""
        instance.is_typing = validated_data.get("is_typing", instance.is_typing)
        instance.last_typed_at = timezone.now()
        instance.save(update_fields=["is_typing", "last_typed_at"])

        return instance


class BulkMarkAsReadSerializer(serializers.Serializer):
    """
    Serializer for bulk marking messages as read
    """

    message_ids = serializers.ListField(
        child=serializers.UUIDField(), help_text="List of message IDs to mark as read"
    )

    def create(self, validated_data):
        """Bulk create read receipts"""
        message_ids = validated_data["message_ids"]
        user = self.context["request"].user
        room_id = self.context["room_id"]

        # Get existing read receipts to avoid duplicates
        existing_receipts = set(
            MessageRead.objects.filter(
                user=user, message_id__in=message_ids
            ).values_list("message_id", flat=True)
        )

        # Create bulk read receipts for new ones
        new_receipts = []
        for message_id in message_ids:
            if message_id not in existing_receipts:
                new_receipts.append(
                    MessageRead(
                        user=user, message_id=message_id, read_at=timezone.now()
                    )
                )

        if new_receipts:
            MessageRead.objects.bulk_create(new_receipts)

            # Update message read counts
            Message.objects.filter(
                id__in=[receipt.message_id for receipt in new_receipts]
            ).update(read_count=models.F("read_count") + 1)

            # Mark room as read for user
            try:
                room = ChatRoom.objects.get(id=room_id)
                room.mark_as_read(user, save=True)
            except ChatRoom.DoesNotExist:
                pass

        return {"marked_count": len(new_receipts)}


class ChatStatisticsSerializer(serializers.Serializer):

    total_rooms = serializers.IntegerField(read_only=True)
    unread_rooms_count = serializers.IntegerField(read_only=True)
    total_unread_messages = serializers.IntegerField(read_only=True)
    active_rooms_count = serializers.IntegerField(read_only=True)


class MessageFileUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = (
            "id",
            "file",
            "file_name",
            "file_size",
            "message_type",
            "created_at",
        )
        read_only_fields = ("id", "created_at", "message_type")

    def validate_file(self, file):
        """Fayl hajmi tekshirish"""
        max_size = 10 * 1024 * 1024  # 10 MB
        if file.size > max_size:
            raise serializers.ValidationError("Fayl hajmi 10 MB dan oshmasligi kerak.")
        return file

    def create(self, validated_data):
        """Fayl nomi va hajmini avtomatik to‘ldirish"""
        file = validated_data.get("file")
        if file:
            validated_data["file_name"] = file.name
            validated_data["file_size"] = file.size
            validated_data["message_type"] = Message.MessageType.FILE
        return super().create(validated_data)
