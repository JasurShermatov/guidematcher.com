# apps/chat/models.py
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from apps.common.models import BaseModel
from apps.users.models import User


class ChatRoom(BaseModel):

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

    booking = models.ForeignKey(
        "bookings.Booking",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="chat_room",
        verbose_name=_("Related booking"),
    )

    last_message_at = models.DateTimeField(
        null=True, blank=True, verbose_name=_("Last message time")
    )
    last_message_preview = models.CharField(
        max_length=150, blank=True, verbose_name=_("Last message preview")
    )
    last_message_sender_id = models.UUIDField(
        null=True, blank=True, verbose_name=_("Last message sender ID")
    )
    last_message_type = models.CharField(
        max_length=20, blank=True, verbose_name=_("Last message type")
    )

    total_messages = models.PositiveIntegerField(
        default=0, verbose_name=_("Total messages count")
    )

    unread_counts = models.JSONField(
        default=dict, blank=True, verbose_name=_("Unread counts per user")
    )

    last_activity_at = models.DateTimeField(
        auto_now=True, verbose_name=_("Last activity")
    )

    class Meta:
        verbose_name = _("Chat room")
        verbose_name_plural = _("Chat rooms")
        ordering = ["-last_activity_at", "-updated_at"]  # Optimized ordering
        indexes = [
            models.Index(fields=["room_type", "is_active"]),
            models.Index(fields=["last_activity_at"]),  # For chat list sorting
            models.Index(fields=["is_active", "last_message_at"]),  # Composite index
        ]

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

    def get_unread_count(self, user):
        return self.unread_counts.get(str(user.id), 0)

    def increment_unread_count(self, user, save=True):
        user_id = str(user.id)
        self.unread_counts[user_id] = self.unread_counts.get(user_id, 0) + 1
        if save:
            self.save(update_fields=["unread_counts"])

    def mark_as_read(self, user, save=True):
        user_id = str(user.id)
        if user_id in self.unread_counts:
            self.unread_counts[user_id] = 0
            if save:
                self.save(update_fields=["unread_counts"])

    def update_last_message(self, message, save=True):
        self.last_message_at = message.created_at
        self.last_message_sender_id = message.sender_id
        self.last_message_type = message.message_type

        if message.message_type == Message.MessageType.TEXT:
            self.last_message_preview = (
                message.text[:147] + "..." if len(message.text) > 150 else message.text
            )
        elif message.message_type == Message.MessageType.IMAGE:
            self.last_message_preview = "📷 Image"
        elif message.message_type == Message.MessageType.FILE:
            self.last_message_preview = f"📎 {message.file_name or 'File'}"
        elif message.message_type == Message.MessageType.AUDIO:
            self.last_message_preview = "🎵 Audio"
        elif message.message_type == Message.MessageType.VIDEO:
            self.last_message_preview = "🎥 Video"
        elif message.message_type == Message.MessageType.LOCATION:
            self.last_message_preview = f"📍 {message.location_name or 'Location'}"
        elif message.message_type == Message.MessageType.SYSTEM:
            self.last_message_preview = "🔔 System message"
        else:
            self.last_message_preview = "Message"

        self.total_messages += 1

        if save:
            self.save(
                update_fields=[
                    "last_message_at",
                    "last_message_preview",
                    "last_message_sender_id",
                    "last_message_type",
                    "total_messages",
                ]
            )


class Message(BaseModel):

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

    text = models.TextField(blank=True, verbose_name=_("Text"))
    image = models.ImageField(
        upload_to="chat/images/%Y/%m/", blank=True, null=True, verbose_name=_("Image")
    )
    file = models.FileField(
        upload_to="chat/files/%Y/%m/",
        blank=True,
        null=True,
        verbose_name=_("File / media"),
    )
    file_name = models.CharField(max_length=255, blank=True)
    file_size = models.PositiveIntegerField(null=True, blank=True)

    latitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True
    )
    longitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True
    )
    location_name = models.CharField(max_length=255, blank=True)

    is_edited = models.BooleanField(default=False)
    edited_at = models.DateTimeField(null=True, blank=True)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)

    reply_to = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="replies",
        verbose_name=_("Reply to"),
    )

    read_count = models.PositiveIntegerField(default=0, verbose_name=_("Read count"))

    replies_count = models.PositiveIntegerField(
        default=0, verbose_name=_("Replies count")
    )

    class Meta:
        verbose_name = _("Message")
        verbose_name_plural = _("Messages")
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["room", "created_at"]),
            models.Index(fields=["sender", "created_at"]),
            models.Index(fields=["room", "is_deleted", "created_at"]),  # For filtering
            models.Index(fields=["reply_to", "created_at"]),  # For threaded messages
        ]

    def __str__(self):
        return f"{self.get_message_type_display()} ({self.pk})"

    def increment_read_count(self, save=True):

        self.read_count += 1
        if save:
            self.save(update_fields=["read_count"])

    def increment_replies_count(self, save=True):

        if self.reply_to:
            self.reply_to.replies_count += 1
            if save:
                self.reply_to.save(update_fields=["replies_count"])


class MessageRead(BaseModel):

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
        indexes = [
            models.Index(fields=["user", "read_at"]),
            models.Index(fields=["message", "read_at"]),
            models.Index(fields=["user", "message"]),  # For quick lookups
        ]
        verbose_name = _("Read receipt")
        verbose_name_plural = _("Read receipts")

    def __str__(self):
        return f"{self.user} read message {self.message.pk}"


class UserTypingStatus(models.Model):

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
        indexes = [
            models.Index(fields=["room", "is_typing"]),  # For active typing users
            models.Index(fields=["user", "last_typed_at"]),  # For cleanup
        ]

    def __str__(self):
        return f"{self.user} – {'typing' if self.is_typing else 'idle'}"

    @classmethod
    def cleanup_old_typing_statuses(cls, minutes=5):
        cutoff_time = timezone.now() - timezone.timedelta(minutes=minutes)
        cls.objects.filter(is_typing=True, last_typed_at__lt=cutoff_time).update(
            is_typing=False
        )


class ChatRoomManager(models.Manager):

    def with_last_message(self):
        return self.select_related().filter(is_active=True)

    def for_user(self, user):
        return self.filter(participants=user, is_active=True).prefetch_related(
            "participants"
        )

    def unread_for_user(self, user):
        user_id = str(user.id)
        return self.filter(participants=user, is_active=True).extra(
            where=["unread_counts->>%s::text::int > 0"], params=[user_id]
        )


# Add custom manager to ChatRoom
ChatRoom.add_to_class("objects", ChatRoomManager())
