# apps/chat/models.py

from django.db import models
from django.utils.translation import gettext_lazy as _
from apps.common.models import BaseModel
from apps.users.models import User


class ChatRoom(BaseModel):
    """Chat rooms between users"""

    class RoomType(models.TextChoices):
        DIRECT = "direct", _("Direct message")
        BOOKING = "booking", _("Booking related")
        SUPPORT = "support", _("Support chat")

    room_type = models.CharField(
        max_length=20,
        choices=RoomType.choices,
        default=RoomType.DIRECT,
        verbose_name=_("Room type"),
    )
    participants = models.ManyToManyField(
        User, related_name="chat_rooms", verbose_name=_("Participants")
    )
    is_active = models.BooleanField(default=True, verbose_name=_("Is active"))

    # For booking-related chats
    booking = models.ForeignKey(
        "bookings.Booking",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="chat_room",
        verbose_name=_("Related booking"),
    )

    class Meta:
        verbose_name = _("Chat room")
        verbose_name_plural = _("Chat rooms")
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["room_type", "is_active"]),
        ]

    def __str__(self):
        if self.room_type == self.RoomType.DIRECT:
            users = list(self.participants.all()[:2])
            if len(users) == 2:
                return f"Chat: {users[0].get_full_name()} - {users[1].get_full_name()}"
        return f"Chat Room {self.id}"

    def get_other_participant(self, user):
        """Get the other participant in a direct chat"""
        if self.room_type == self.RoomType.DIRECT:
            return self.participants.exclude(id=user.id).first()
        return None


class Message(BaseModel):
    """Chat messages"""

    class MessageType(models.TextChoices):
        TEXT = "text", _("Text message")
        IMAGE = "image", _("Image")
        FILE = "file", _("File")
        LOCATION = "location", _("Location")
        SYSTEM = "system", _("System message")

    room = models.ForeignKey(
        ChatRoom,
        on_delete=models.CASCADE,
        related_name="messages",
        verbose_name=_("Chat room"),
    )
    sender = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="sent_messages",
        verbose_name=_("Sender"),
    )
    message_type = models.CharField(
        max_length=20,
        choices=MessageType.choices,
        default=MessageType.TEXT,
        verbose_name=_("Message type"),
    )

    # Content
    text = models.TextField(blank=True, verbose_name=_("Text content"))
    image = models.ImageField(
        upload_to="chat/images/%Y/%m/",
        blank=True,
        null=True,
        verbose_name=_("Image"),
        help_text=_("JPEG, PNG, max 10MB"),
    )
    file = models.FileField(
        upload_to="chat/files/%Y/%m/",
        blank=True,
        null=True,
        verbose_name=_("File"),
        help_text=_("PDF, DOC, DOCX, max 25MB"),
    )
    file_name = models.CharField(
        max_length=255, blank=True, verbose_name=_("Original file name")
    )
    file_size = models.PositiveIntegerField(
        null=True, blank=True, verbose_name=_("File size (bytes)")
    )

    # Location
    latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        verbose_name=_("Latitude"),
    )
    longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        verbose_name=_("Longitude"),
    )
    location_name = models.CharField(
        max_length=255, blank=True, verbose_name=_("Location name")
    )

    # Status
    is_edited = models.BooleanField(default=False, verbose_name=_("Is edited"))
    edited_at = models.DateTimeField(null=True, blank=True, verbose_name=_("Edited at"))
    is_deleted = models.BooleanField(default=False, verbose_name=_("Is deleted"))
    deleted_at = models.DateTimeField(
        null=True, blank=True, verbose_name=_("Deleted at")
    )

    # Reply
    reply_to = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="replies",
        verbose_name=_("Reply to message"),
    )

    class Meta:
        verbose_name = _("Message")
        verbose_name_plural = _("Messages")
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["room", "created_at"]),
            models.Index(fields=["sender", "created_at"]),
        ]

    def __str__(self):
        return f"{self.get_message_type_display()} from {self.sender}"


class MessageRead(BaseModel):
    """Track message read status"""

    message = models.ForeignKey(
        Message,
        on_delete=models.CASCADE,
        related_name="read_receipts",
        verbose_name=_("Message"),
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="read_messages",
        verbose_name=_("User"),
    )
    read_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Read at"))

    class Meta:
        verbose_name = _("Message read receipt")
        verbose_name_plural = _("Message read receipts")
        unique_together = [["message", "user"]]
        indexes = [
            models.Index(fields=["user", "read_at"]),
        ]

    def __str__(self):
        return f"{self.user} read message at {self.read_at}"


class UserTypingStatus(models.Model):
    """Track user typing status in real-time"""

    room = models.ForeignKey(
        ChatRoom,
        on_delete=models.CASCADE,
        related_name="typing_statuses",
        verbose_name=_("Chat room"),
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="typing_statuses",
        verbose_name=_("User"),
    )
    is_typing = models.BooleanField(default=False, verbose_name=_("Is typing"))
    last_typed_at = models.DateTimeField(auto_now=True, verbose_name=_("Last typed at"))

    class Meta:
        verbose_name = _("User typing status")
        verbose_name_plural = _("User typing statuses")
        unique_together = [["room", "user"]]

    def __str__(self):
        status = "typing" if self.is_typing else "not typing"
        return f"{self.user} is {status} in {self.room}"
