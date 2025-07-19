from django.db import models
from django.utils.translation import gettext_lazy as _
from apps.common.models import BaseModel
from apps.users.models import User


class ChatRoom(BaseModel):
    """Chat rooms between users / system"""

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

    # for booking chats
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
        indexes = [models.Index(fields=["room_type", "is_active"])]

    # ─────────────────────── helpers
    def __str__(self):
        if self.room_type == self.RoomType.DIRECT:
            users = list(self.participants.all()[:2])
            if len(users) == 2:
                return f"{users[0].get_full_name()} ↔ {users[1].get_full_name()}"
        return f"ChatRoom {self.pk}"

    def other_participant(self, user):
        if self.room_type == self.RoomType.DIRECT:
            return self.participants.exclude(id=user.id).first()
        return None


# ──────────────────────────────────────────────────────────────────────
class Message(BaseModel):
    """Chat messages (text / media / system)"""

    class MessageType(models.TextChoices):
        TEXT = "text", _("Text")
        IMAGE = "image", _("Image")
        FILE = "file", _("File (doc/zip)")
        AUDIO = "audio", _("Audio / voice")
        VIDEO = "video", _("Video")
        LOCATION = "location", _("Location")
        SYSTEM = "system", _("System")

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
        verbose_name=_("Type"),
    )

    # ───── raw content ─────
    text = models.TextField(blank=True, verbose_name=_("Text"))
    image = models.ImageField(
        upload_to="chat/images/%Y/%m/", blank=True, null=True, verbose_name=_("Image")
    )  # max 10 MB
    file = models.FileField(
        upload_to="chat/files/%Y/%m/",
        blank=True,
        null=True,
        verbose_name=_("File / media"),
    )  # max 25 MB
    file_name = models.CharField(max_length=255, blank=True)
    file_size = models.PositiveIntegerField(null=True, blank=True)

    # location
    latitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True
    )
    longitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True
    )
    location_name = models.CharField(max_length=255, blank=True)

    # flags
    is_edited = models.BooleanField(default=False)
    edited_at = models.DateTimeField(null=True, blank=True)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)

    # reply-thread
    reply_to = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="replies",
        verbose_name=_("Reply to"),
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
        return f"{self.get_message_type_display()} ({self.pk})"


# ──────────────────────────────────────────────────────────────────────
class MessageRead(BaseModel):
    """Read-receipt"""

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
    read_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [["message", "user"]]
        indexes = [models.Index(fields=["user", "read_at"])]
        verbose_name = _("Read receipt")
        verbose_name_plural = _("Read receipts")


class UserTypingStatus(models.Model):
    """Realtime typing indicator (per-room)"""

    room = models.ForeignKey(
        ChatRoom, on_delete=models.CASCADE, related_name="typing_statuses"
    )
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="typing_statuses"
    )
    is_typing = models.BooleanField(default=False)
    last_typed_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [["room", "user"]]

    def __str__(self):
        return f"{self.user} – {'typing' if self.is_typing else 'idle'}"
