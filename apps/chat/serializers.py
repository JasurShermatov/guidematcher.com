# ============================================
# apps/chat/serializers.py - FIXED VERSION
# ============================================

from typing import Any, Dict, Optional
from rest_framework import serializers
from django.db.models import Q
from django.utils import timezone
import json

from apps.users.models import User
from apps.bookings.models import Booking
from .models import Conversation, Message, BlockedUser


class UserSerializer(serializers.ModelSerializer):
    """User serializer with avatar URL"""

    avatar_url = serializers.SerializerMethodField()
    is_customer = serializers.SerializerMethodField()
    is_client = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "avatar",
            "avatar_url",
            "bio",
            "is_active",
            "is_customer",
            "is_client",
        ]
        read_only_fields = ["full_name", "is_customer", "is_client"]

    def get_avatar_url(self, obj: User) -> Optional[str]:
        if obj.avatar:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        return None

    def get_is_customer(self, obj: User) -> bool:
        return hasattr(obj, "customerprofile")

    def get_is_client(self, obj: User) -> bool:
        return hasattr(obj, "clientprofile")


class BookingShortSerializer(serializers.ModelSerializer):
    """Minimal booking info for chat context"""

    status_display = serializers.CharField(source="get_status_display", read_only=True)
    can_accept = serializers.SerializerMethodField()
    can_update = serializers.SerializerMethodField()
    can_cancel = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            "id",
            "title",
            "status",
            "status_display",
            "start_date",
            "end_date",
            "country",
            "city",
            "can_accept",
            "can_update",
            "can_cancel",
        ]

    def get_can_accept(self, obj: Booking) -> bool:
        request = self.context.get("request")
        if not request:
            return False
        return (
            obj.status == "pending"
            and hasattr(request.user, "customerprofile")
            and obj.customer_profile == request.user.customerprofile
        )

    def get_can_update(self, obj: Booking) -> bool:
        return obj.status == "accepted"

    def get_can_cancel(self, obj: Booking) -> bool:
        return obj.status in ["pending", "accepted"]


class MessageSerializer(serializers.ModelSerializer):
    """FIXED: Message serializer with proper datetime handling"""

    sender = UserSerializer(read_only=True)
    delete_status = serializers.SerializerMethodField()
    can_recover = serializers.SerializerMethodField()
    is_mine = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            "id",
            "conversation",
            "sender",
            "content",
            "message_type",
            "created_at",
            "deleted_for",
            "deleted_at",
            "is_read",
            "read_at",
            "delete_status",
            "can_recover",
            "is_mine",
            "metadata",
        ]
        read_only_fields = [
            "id",
            "sender",
            "created_at",
            "deleted_at",
            "is_read",
            "read_at",
            "message_type",
        ]

    def get_delete_status(self, obj: Message) -> Optional[Dict]:
        """FIXED: Safe delete status with datetime conversion"""
        try:
            request = self.context.get("request")
            if request and request.user.is_authenticated:
                status = obj.get_delete_status_for_user(request.user)

                # MUHIM: datetime'ni string'ga convert qilish
                if isinstance(status, dict) and status.get("deleted_at"):
                    if hasattr(status["deleted_at"], "isoformat"):
                        status["deleted_at"] = status["deleted_at"].isoformat()
                    elif status["deleted_at"] is not None:
                        status["deleted_at"] = str(status["deleted_at"])

                return status
        except Exception:
            pass
        return None

    def get_can_recover(self, obj: Message) -> bool:
        try:
            request = self.context.get("request")
            if request and request.user.is_authenticated:
                return obj.can_be_recovered(request.user)
        except Exception:
            pass
        return False

    def get_is_mine(self, obj: Message) -> bool:
        try:
            request = self.context.get("request")
            if request and request.user.is_authenticated:
                return obj.sender == request.user
        except Exception:
            pass
        return False


class MessageCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new messages"""

    class Meta:
        model = Message
        fields = ["conversation", "content"]

    def validate_conversation(self, value: Conversation) -> Conversation:
        user = self.context["request"].user

        if not value.has_user(user):
            raise serializers.ValidationError(
                "You are not a participant in this conversation."
            )

        if not value.can_send_message(user):
            raise serializers.ValidationError(
                "Cannot send message to this user (blocked)."
            )

        return value

    def validate_content(self, value: str) -> str:
        if not value.strip():
            raise serializers.ValidationError("Message cannot be empty.")
        if len(value) > 5000:
            raise serializers.ValidationError("Message too long (max 5000).")
        return value.strip()

    def create(self, validated_data: Dict) -> Message:
        validated_data["sender"] = self.context["request"].user
        message = super().create(validated_data)

        # Update conversation timestamp
        try:
            message.conversation.updated_at = timezone.now()
            message.conversation.save(update_fields=["updated_at"])
        except Exception:
            pass

        return message


class ConversationSerializer(serializers.ModelSerializer):
    """FIXED: Conversation serializer with safe last_message"""

    other_user = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    active_booking = serializers.SerializerMethodField()
    can_send_message = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            "id",
            "created_at",
            "updated_at",
            "is_active",
            "other_user",
            "last_message",
            "unread_count",
            "active_booking",
            "can_send_message",
        ]

    def get_other_user(self, obj: Conversation) -> Optional[Dict]:
        try:
            request = self.context.get("request")
            if request and request.user.is_authenticated:
                other_user = obj.get_other_user(request.user)
                return UserSerializer(other_user, context=self.context).data
        except Exception:
            pass
        return None

    def get_last_message(self, obj: Conversation) -> Optional[Dict]:
        """FIXED: Safe last message without nested serializer issues"""
        try:
            request = self.context.get("request")
            if request and request.user.is_authenticated:
                last_message = (
                    Message.objects.visible_for_user(request.user)
                    .filter(conversation=obj)
                    .select_related("sender")
                    .first()
                )
                if last_message:
                    # MUHIM: MessageSerializer'dan foydalanmaslik - to'g'ridan-to'g'ri dict
                    return {
                        "id": last_message.id,
                        "content": last_message.content[:100]
                        + ("..." if len(last_message.content) > 100 else ""),
                        "message_type": last_message.message_type,
                        "created_at": (
                            last_message.created_at.isoformat()
                            if last_message.created_at
                            else None
                        ),
                        "sender_id": last_message.sender_id,
                        "is_read": last_message.is_read,
                        "deleted_for": last_message.deleted_for,
                    }
        except Exception:
            pass
        return None

    def get_unread_count(self, obj: Conversation) -> int:
        try:
            request = self.context.get("request")
            if request and request.user.is_authenticated:
                return Message.objects.unread_for_user_in_conversation(
                    request.user, obj
                ).count()
        except Exception:
            pass
        return 0

    def get_active_booking(self, obj: Conversation) -> Optional[Dict]:
        """Get active booking if exists"""
        try:
            booking = (
                Booking.objects.filter(
                    conversation=obj, status__in=["pending", "accepted", "updated"]
                )
                .order_by("-created_at")
                .first()
            )

            if booking:
                return BookingShortSerializer(booking, context=self.context).data
            return None
        except Exception:
            return None

    def get_can_send_message(self, obj: Conversation) -> bool:
        try:
            request = self.context.get("request")
            if request and request.user.is_authenticated:
                return obj.can_send_message(request.user)
        except Exception:
            pass
        return True


class StartConversationSerializer(serializers.Serializer):
    """Serializer for starting new conversation"""

    user_email = serializers.EmailField()
    message = serializers.CharField(max_length=5000, required=False, allow_blank=True)

    def validate_user_email(self, value: str) -> str:
        try:
            user = User.objects.get(email=value, is_active=True)
        except User.DoesNotExist:
            raise serializers.ValidationError("User not found or inactive.")

        request_user = self.context["request"].user

        if user == request_user:
            raise serializers.ValidationError("Cannot chat with yourself.")

        # Check if blocked
        try:
            if BlockedUser.objects.filter(
                Q(blocker=request_user, blocked=user)
                | Q(blocker=user, blocked=request_user)
            ).exists():
                raise serializers.ValidationError(
                    "Cannot start conversation with this user."
                )
        except Exception:
            pass

        return value

    def validate_message(self, value: str) -> str:
        if value and len(value.strip()) > 5000:
            raise serializers.ValidationError("Message too long (max 5000).")
        return value.strip() if value else ""


# Booking integration serializers
class BookingAcceptSerializer(serializers.Serializer):
    """Accept booking with dates"""

    start_date = serializers.DateField(required=True)
    end_date = serializers.DateField(required=True)

    def validate(self, data: Dict) -> Dict:
        if data["start_date"] > data["end_date"]:
            raise serializers.ValidationError("Invalid date range")

        from datetime import date

        if data["start_date"] < date.today():
            raise serializers.ValidationError("Start date cannot be in past")

        return data


class BookingUpdateSerializer(serializers.Serializer):
    """Update booking dates"""

    start_date = serializers.DateField(required=True)
    end_date = serializers.DateField(required=True)

    def validate(self, data: Dict) -> Dict:
        if data["start_date"] > data["end_date"]:
            raise serializers.ValidationError("Invalid date range")
        return data


class BookingCancelSerializer(serializers.Serializer):
    """Cancel booking with confirmation"""

    confirm = serializers.BooleanField(required=True)
    reason = serializers.CharField(required=False, allow_blank=True)


class BlockUserSerializer(serializers.Serializer):
    user_email = serializers.EmailField()
    reason = serializers.CharField(required=False, allow_blank=True)

    def validate_user_email(self, value: str) -> str:
        try:
            user = User.objects.get(email=value, is_active=True)
        except User.DoesNotExist:
            raise serializers.ValidationError("User not found.")

        request_user = self.context["request"].user

        if user == request_user:
            raise serializers.ValidationError("Cannot block yourself.")

        if BlockedUser.objects.filter(blocker=request_user, blocked=user).exists():
            raise serializers.ValidationError("User already blocked.")

        return value


class BlockedUserSerializer(serializers.ModelSerializer):
    blocked_user = UserSerializer(source="blocked", read_only=True)

    class Meta:
        model = BlockedUser
        fields = ["id", "blocked_user", "created_at", "reason"]
        read_only_fields = ["id", "created_at"]
