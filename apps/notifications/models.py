# apps/notifications/models.py

from django.db import models
from django.utils.translation import gettext_lazy as _
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from apps.common.models import BaseModel
from apps.users.models import User


class NotificationType(BaseModel):
    """Notification types configuration"""

    class Category(models.TextChoices):
        BOOKING = "booking", _("Booking")
        CHAT = "chat", _("Chat")
        REVIEW = "review", _("Review")
        SYSTEM = "system", _("System")
        ACCOUNT = "account", _("Account")
        DISPUTE = "dispute", _("Dispute")

    code = models.CharField(max_length=50, unique=True, verbose_name=_("Type code"))
    name = models.CharField(max_length=100, verbose_name=_("Type name"))
    category = models.CharField(
        max_length=20, choices=Category.choices, verbose_name=_("Category")
    )
    description = models.TextField(blank=True, verbose_name=_("Description"))

    # Templates
    email_template = models.CharField(
        max_length=255, blank=True, verbose_name=_("Email template name")
    )
    push_template = models.TextField(
        blank=True, verbose_name=_("Push notification template")
    )

    # Default settings
    is_email_enabled = models.BooleanField(
        default=True, verbose_name=_("Email enabled by default")
    )
    is_push_enabled = models.BooleanField(
        default=True, verbose_name=_("Push enabled by default")
    )
    is_in_app_enabled = models.BooleanField(
        default=True, verbose_name=_("In-app enabled by default")
    )

    class Meta:
        verbose_name = _("Notification type")
        verbose_name_plural = _("Notification types")
        ordering = ["category", "name"]

    def __str__(self):
        return f"{self.get_category_display()} - {self.name}"


class Notification(BaseModel):
    """In-app notifications"""

    class Priority(models.TextChoices):
        LOW = "low", _("Low")
        MEDIUM = "medium", _("Medium")
        HIGH = "high", _("High")
        URGENT = "urgent", _("Urgent")

    # Recipient
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="notifications",
        verbose_name=_("User"),
    )

    # Type and content
    notification_type = models.ForeignKey(
        NotificationType, on_delete=models.PROTECT, verbose_name=_("Notification type")
    )
    title = models.CharField(max_length=255, verbose_name=_("Title"))
    message = models.TextField(verbose_name=_("Message"))
    priority = models.CharField(
        max_length=10,
        choices=Priority.choices,
        default=Priority.MEDIUM,
        verbose_name=_("Priority"),
    )

    # Related object (optional)
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name=_("Content type"),
    )
    object_id = models.UUIDField(null=True, blank=True, verbose_name=_("Object ID"))
    content_object = GenericForeignKey("content_type", "object_id")

    # Action URL
    action_url = models.CharField(
        max_length=255, blank=True, verbose_name=_("Action URL")
    )

    # Status
    is_read = models.BooleanField(default=False, verbose_name=_("Is read"))
    read_at = models.DateTimeField(null=True, blank=True, verbose_name=_("Read at"))

    # Additional data
    extra_data = models.JSONField(
        default=dict, blank=True, verbose_name=_("Extra data")
    )

    class Meta:
        verbose_name = _("Notification")
        verbose_name_plural = _("Notifications")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "is_read", "-created_at"]),
            models.Index(fields=["notification_type", "-created_at"]),
        ]

    def __str__(self):
        return f"{self.title} - {self.user}"

    def mark_as_read(self):
        """Mark notification as read"""
        if not self.is_read:
            from django.utils import timezone

            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=["is_read", "read_at"])


class UserNotificationSettings(BaseModel):
    """User-specific notification preferences"""

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="notification_settings",
        verbose_name=_("User"),
    )

    # Global settings
    email_enabled = models.BooleanField(
        default=True, verbose_name=_("Email notifications enabled")
    )
    push_enabled = models.BooleanField(
        default=True, verbose_name=_("Push notifications enabled")
    )
    in_app_enabled = models.BooleanField(
        default=True, verbose_name=_("In-app notifications enabled")
    )

    # Quiet hours
    quiet_hours_enabled = models.BooleanField(
        default=False, verbose_name=_("Quiet hours enabled")
    )
    quiet_hours_start = models.TimeField(
        null=True, blank=True, verbose_name=_("Quiet hours start")
    )
    quiet_hours_end = models.TimeField(
        null=True, blank=True, verbose_name=_("Quiet hours end")
    )

    # Chat settings
    chat_message_email = models.BooleanField(
        default=False, verbose_name=_("Email for chat messages")
    )
    chat_message_push = models.BooleanField(
        default=True, verbose_name=_("Push for chat messages")
    )

    class Meta:
        verbose_name = _("User notification settings")
        verbose_name_plural = _("User notification settings")

    def __str__(self):
        return f"Notification settings for {self.user}"


class UserNotificationTypeSettings(BaseModel):
    """User preferences for specific notification types"""

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="notification_type_settings",
        verbose_name=_("User"),
    )
    notification_type = models.ForeignKey(
        NotificationType, on_delete=models.CASCADE, verbose_name=_("Notification type")
    )

    # Channel preferences
    email_enabled = models.BooleanField(default=True, verbose_name=_("Email enabled"))
    push_enabled = models.BooleanField(default=True, verbose_name=_("Push enabled"))
    in_app_enabled = models.BooleanField(default=True, verbose_name=_("In-app enabled"))

    class Meta:
        verbose_name = _("User notification type setting")
        verbose_name_plural = _("User notification type settings")
        unique_together = [["user", "notification_type"]]

    def __str__(self):
        return f"{self.user} - {self.notification_type}"


class EmailLog(BaseModel):
    """Log of sent emails"""

    class Status(models.TextChoices):
        PENDING = "pending", _("Pending")
        SENT = "sent", _("Sent")
        FAILED = "failed", _("Failed")
        BOUNCED = "bounced", _("Bounced")

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="email_logs",
        verbose_name=_("User"),
    )
    notification_type = models.ForeignKey(
        NotificationType,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name=_("Notification type"),
    )

    # Email details
    to_email = models.EmailField(verbose_name=_("To email"))
    subject = models.CharField(max_length=255, verbose_name=_("Subject"))
    body_text = models.TextField(blank=True, verbose_name=_("Body text"))
    body_html = models.TextField(blank=True, verbose_name=_("Body HTML"))

    # Status
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        verbose_name=_("Status"),
    )
    sent_at = models.DateTimeField(null=True, blank=True, verbose_name=_("Sent at"))

    # Provider info
    provider = models.CharField(
        max_length=50, blank=True, verbose_name=_("Email provider")
    )
    provider_message_id = models.CharField(
        max_length=255, blank=True, verbose_name=_("Provider message ID")
    )
    error_message = models.TextField(blank=True, verbose_name=_("Error message"))

    class Meta:
        verbose_name = _("Email log")
        verbose_name_plural = _("Email logs")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "status", "-created_at"]),
            models.Index(fields=["status", "-created_at"]),
        ]

    def __str__(self):
        return f"{self.subject} - {self.to_email} - {self.get_status_display()}"
