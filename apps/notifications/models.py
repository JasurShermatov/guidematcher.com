# apps/notifications/models.py

from django.db import models
from django.contrib.auth import get_user_model
from apps.common.models import TimeStampedModel

User = get_user_model()


class Notification(TimeStampedModel):
    """
    System notifications for users
    """

    NOTIFICATION_TYPES = [
        ("booking_request", "New Booking Request"),
        ("booking_confirmed", "Booking Confirmed"),
        ("booking_cancelled", "Booking Cancelled"),
        ("booking_completed", "Booking Completed"),
        ("new_message", "New Message"),
        ("new_review", "New Review"),
        ("payment_received", "Payment Received"),
        ("profile_viewed", "Profile Viewed"),
        ("system_update", "System Update"),
        ("promotion", "Promotion"),
    ]

    PRIORITY_CHOICES = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
        ("urgent", "Urgent"),
    ]

    # Recipient
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="notifications"
    )

    # Notification content
    type = models.CharField(max_length=30, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=200)
    message = models.TextField()

    # Priority and status
    priority = models.CharField(
        max_length=10, choices=PRIORITY_CHOICES, default="medium"
    )
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)

    # Action URL (optional)
    action_url = models.URLField(blank=True, null=True)
    action_text = models.CharField(max_length=50, blank=True)

    # Related objects (generic foreign key would be better, but keeping simple)
    booking_id = models.UUIDField(null=True, blank=True)
    message_id = models.UUIDField(null=True, blank=True)
    review_id = models.UUIDField(null=True, blank=True)

    # Delivery tracking
    email_sent = models.BooleanField(default=False)
    email_sent_at = models.DateTimeField(null=True, blank=True)
    push_sent = models.BooleanField(default=False)
    push_sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "notifications"
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"
        indexes = [
            models.Index(fields=["user", "is_read"]),
            models.Index(fields=["type"]),
            models.Index(fields=["priority"]),
            models.Index(fields=["created_at"]),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"Notification for {self.user.email}: {self.title}"

    def mark_as_read(self):
        """Mark notification as read"""
        if not self.is_read:
            from django.utils import timezone

            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=["is_read", "read_at"])

    @classmethod
    def create_notification(cls, user, notification_type, title, message, **kwargs):
        """Create a new notification"""
        return cls.objects.create(
            user=user, type=notification_type, title=title, message=message, **kwargs
        )


class NotificationPreference(TimeStampedModel):
    """
    User preferences for notifications
    """

    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="notification_preferences"
    )

    # Email preferences
    email_booking_requests = models.BooleanField(default=True)
    email_booking_updates = models.BooleanField(default=True)
    email_messages = models.BooleanField(default=True)
    email_reviews = models.BooleanField(default=True)
    email_promotions = models.BooleanField(default=False)
    email_system_updates = models.BooleanField(default=True)

    # Push notification preferences
    push_booking_requests = models.BooleanField(default=True)
    push_booking_updates = models.BooleanField(default=True)
    push_messages = models.BooleanField(default=True)
    push_reviews = models.BooleanField(default=True)
    push_promotions = models.BooleanField(default=False)

    # Frequency settings
    digest_frequency = models.CharField(
        max_length=20,
        choices=[
            ("none", "None"),
            ("daily", "Daily"),
            ("weekly", "Weekly"),
            ("monthly", "Monthly"),
        ],
        default="weekly",
    )

    class Meta:
        db_table = "notification_preferences"
        verbose_name = "Notification Preference"
        verbose_name_plural = "Notification Preferences"

    def __str__(self):
        return f"Notification preferences for {self.user.email}"


class EmailLog(TimeStampedModel):
    """
    Log of sent emails for tracking and debugging
    """

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("sent", "Sent"),
        ("failed", "Failed"),
        ("bounced", "Bounced"),
        ("delivered", "Delivered"),
    ]

    # Recipient info
    recipient_email = models.EmailField()
    recipient_user = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True
    )

    # Email content
    subject = models.CharField(max_length=200)
    template_name = models.CharField(max_length=100, blank=True)

    # Status and tracking
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    sent_at = models.DateTimeField(null=True, blank=True)

    # Error tracking
    error_message = models.TextField(blank=True)
    retry_count = models.PositiveIntegerField(default=0)

    # Related notification
    notification = models.ForeignKey(
        Notification, on_delete=models.SET_NULL, null=True, blank=True
    )

    class Meta:
        db_table = "email_logs"
        verbose_name = "Email Log"
        verbose_name_plural = "Email Logs"
        indexes = [
            models.Index(fields=["recipient_email", "status"]),
            models.Index(fields=["status", "created_at"]),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"Email to {self.recipient_email}: {self.subject} ({self.status})"
