from rest_framework import serializers
from apps.notifications.models import (
    NotificationType,
    Notification,
    UserNotificationSettings,
    UserNotificationTypeSettings,
    EmailLog,
)
from apps.users.serializers import UserShortSerializer


# ─────────── Type ───────────
class NotificationTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationType
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


# ─────────── Notification ───────────
class NotificationSerializer(serializers.ModelSerializer):
    user = UserShortSerializer(read_only=True)
    notification_type = NotificationTypeSerializer(read_only=True)

    class Meta:
        model = Notification
        fields = "__all__"
        read_only_fields = [
            "id",
            "user",
            "notification_type",
            "created_at",
            "read_at",
            "is_read",
        ]


# ─────────── User global settings ───────────
class UserNotificationSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserNotificationSettings
        fields = [
            "id",
            "email_enabled",
            "push_enabled",
            "in_app_enabled",
            "quiet_hours_enabled",
            "quiet_hours_start",
            "quiet_hours_end",
            "chat_message_email",
            "chat_message_push",
        ]


# ─────────── Per-type settings ───────────
class UserNotificationTypeSettingsSerializer(serializers.ModelSerializer):
    notification_type = NotificationTypeSerializer(read_only=True)

    class Meta:
        model = UserNotificationTypeSettings
        fields = [
            "id",
            "notification_type",
            "email_enabled",
            "push_enabled",
            "in_app_enabled",
        ]
        read_only_fields = ["id", "notification_type"]


# ─────────── EmailLog (admin only) ───────────
class EmailLogSerializer(serializers.ModelSerializer):
    user = UserShortSerializer(read_only=True)

    class Meta:
        model = EmailLog
        fields = "__all__"
        read_only_fields = fields
