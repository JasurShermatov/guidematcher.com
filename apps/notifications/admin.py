from django.contrib import admin
from .models import (
    NotificationType,
    Notification,
    UserNotificationSettings,
    UserNotificationTypeSettings,
    EmailLog,
)


@admin.register(NotificationType)
class NotificationTypeAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "code",
        "category",
        "is_email_enabled",
        "is_push_enabled",
        "is_in_app_enabled",
    )
    search_fields = ("name", "code", "category")
    list_filter = (
        "category",
        "is_email_enabled",
        "is_push_enabled",
        "is_in_app_enabled",
    )
    ordering = ("category", "name")


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "user",
        "notification_type",
        "priority",
        "is_read",
        "created_at",
    )
    search_fields = ("title", "message", "user__username")
    list_filter = ("priority", "is_read", "notification_type")
    ordering = ("-created_at",)


@admin.register(UserNotificationSettings)
class UserNotificationSettingsAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "email_enabled",
        "push_enabled",
        "in_app_enabled",
        "quiet_hours_enabled",
    )
    search_fields = ("user__username",)
    list_filter = (
        "email_enabled",
        "push_enabled",
        "in_app_enabled",
        "quiet_hours_enabled",
    )


@admin.register(UserNotificationTypeSettings)
class UserNotificationTypeSettingsAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "notification_type",
        "email_enabled",
        "push_enabled",
        "in_app_enabled",
    )
    search_fields = ("user__username", "notification_type__name")
    list_filter = (
        "email_enabled",
        "push_enabled",
        "in_app_enabled",
        "notification_type",
    )


@admin.register(EmailLog)
class EmailLogAdmin(admin.ModelAdmin):
    list_display = ("subject", "to_email", "user", "status", "sent_at", "provider")
    search_fields = ("subject", "to_email", "user__username", "provider_message_id")
    list_filter = ("status", "provider")
    ordering = ("-created_at",)
