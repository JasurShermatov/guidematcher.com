# apps/chat/models.py

from django.db import models
from django.contrib.auth import get_user_model
from apps.common.models import TimeStampedModel

User = get_user_model()


class ChatRoom(TimeStampedModel):
    """
    Chat room between client and guide
    """

    client = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="chat_rooms_as_client"
    )
    guide = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="chat_rooms_as_guide"
    )

    # Room status
    is_active = models.BooleanField(default=True)

    # Last activity tracking
    last_message_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "chat_rooms"
        verbose_name = "Chat Room"
        verbose_name_plural = "Chat Rooms"
        unique_together = ["client", "guide"]
        indexes = [
            models.Index(fields=["client"]),
            models.Index(fields=["guide"]),
            models.Index(fields=["last_message_at"]),
        ]

    def __str__(self):
        return f"Chat: {self.client.full_name} & {self.guide.full_name}"

    def get_other_participant(self, user):
        """Get the other participant in the chat"""
        if user == self.client:
            return self.guide
        return self.client


class Message(TimeStampedModel):
    """
    Individual chat messages
    """

    MESSAGE_TYPES = [
        ("text", "Text"),
        ("image", "Image"),
        ("file", "File"),
        ("booking_request", "Booking Request"),
        ("system", "System"),
    ]

    room = models.ForeignKey(
        ChatRoom, on_delete=models.CASCADE, related_name="messages"
    )
    sender = models.ForeignKey(User, on_delete=models.CASCADE)

    # Message content
    message_type = models.CharField(
        max_length=20, choices=MESSAGE_TYPES, default="text"
    )
    content = models.TextField()

    # File attachments (if applicable)
    file_url = models.URLField(blank=True, null=True)
    file_name = models.CharField(max_length=255, blank=True)
    file_size = models.PositiveIntegerField(null=True, blank=True)  # in bytes

    # Message status
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)

    # Related objects (for special message types)
    booking_request = models.ForeignKey(
        "bookings.BookingRequest", on_delete=models.SET_NULL, null=True, blank=True
    )

    class Meta:
        db_table = "messages"
        verbose_name = "Message"
        verbose_name_plural = "Messages"
        indexes = [
            models.Index(fields=["room", "created_at"]),
            models.Index(fields=["sender"]),
            models.Index(fields=["is_read"]),
        ]
        ordering = ["created_at"]

    def __str__(self):
        return f"Message from {self.sender.full_name} in {self.room}"

    def mark_as_read(self):
        """Mark message as read"""
        if not self.is_read:
            from django.utils import timezone

            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=["is_read", "read_at"])


class MessageAttachment(TimeStampedModel):
    """
    File attachments for messages
    """

    message = models.ForeignKey(
        Message, on_delete=models.CASCADE, related_name="attachments"
    )
    file_url = models.URLField()
    file_name = models.CharField(max_length=255)
    file_size = models.PositiveIntegerField()  # in bytes
    content_type = models.CharField(max_length=100)

    class Meta:
        db_table = "message_attachments"
        verbose_name = "Message Attachment"
        verbose_name_plural = "Message Attachments"

    def __str__(self):
        return f"Attachment: {self.file_name}"
