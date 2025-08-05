from rest_framework import serializers
from .models import Notification, NotificationPreference, EmailLog
from apps.users.serializers import UserSerializer


class NotificationSerializer(serializers.ModelSerializer):
    """
    Serializer for Notification model
    """

    user = UserSerializer(read_only=True)

    class Meta:
        model = Notification
        fields = [
            "id",
            "user",
            "type",
            "title",
            "message",
            "priority",
            "is_read",
            "read_at",
            "action_url",
            "action_text",
            "booking_id",
            "message_id",
            "review_id",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "user",
            "is_read",
            "read_at",
            "created_at",
            "updated_at",
        ]

    def validate(self, data):
        """
        Validate notification data
        """
        if not data.get("title") or len(data.get("title").strip()) == 0:
            raise serializers.ValidationError("Sarlavha bo'sh bo'lishi mumkin emas.")
        if not data.get("message") or len(data.get("message").strip()) == 0:
            raise serializers.ValidationError("Xabar bo'sh bo'lishi mumkin emas.")
        return data


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    """
    Serializer for NotificationPreference model
    """

    user = UserSerializer(read_only=True)

    class Meta:
        model = NotificationPreference
        fields = [
            "id",
            "user",
            "email_booking_requests",
            "email_booking_updates",
            "email_messages",
            "email_reviews",
            "email_promotions",
            "email_system_updates",
            "push_booking_requests",
            "push_booking_updates",
            "push_messages",
            "push_reviews",
            "push_promotions",
            "digest_frequency",
            "created_at",
        ]
        read_only_fields = ["id", "user", "created_at", "updated_at"]


class EmailLogSerializer(serializers.ModelSerializer):
    """
    Serializer for EmailLog model
    """

    recipient_user = UserSerializer(read_only=True)
    notification = NotificationSerializer(read_only=True)

    class Meta:
        model = EmailLog
        fields = [
            "id",
            "recipient_email",
            "recipient_user",
            "subject",
            "template_name",
            "status",
            "sent_at",
            "error_message",
            "retry_count",
            "notification",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "recipient_user",
            "notification",
            "sent_at",
            "created_at",
            "updated_at",
        ]
