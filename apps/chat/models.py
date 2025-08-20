from django.db import models
from django.core.validators import FileExtensionValidator
from django.utils.translation import gettext_lazy as _
from django.conf import settings

from apps.common.models import BaseModel
from apps.bookings.models import Booking

def chat_upload_path(instance, filename):
    # media/chat/<chat_id>/<filename>
    return f"chat/{instance.chat_id}/{filename}"

class Chat(BaseModel):
    booking = models.OneToOneField(
        Booking, on_delete=models.CASCADE, related_name="chat", verbose_name=_("Booking")
    )
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="client_chats"
    )
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="customer_chats"
    )
    is_deleted_by_client = models.BooleanField(default=False)
    is_deleted_by_customer = models.BooleanField(default=False)
    last_message_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["booking"], name="uniq_chat_per_booking"),
        ]
        ordering = ["-last_message_at", "-created_at"]

    def __str__(self):
        return f"Chat[{self.id}] {self.client_id} ↔ {self.customer_id}"

class Message(BaseModel):
    chat = models.ForeignKey(Chat, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    text = models.TextField(blank=True)
    file = models.FileField(
        upload_to=chat_upload_path,
        null=True,
        blank=True,
        validators=[FileExtensionValidator(allowed_extensions=["pdf", "jpg", "jpeg", "png", "docx"])],
    )
    is_read = models.BooleanField(default=False)
    edited_at = models.DateTimeField(null=True, blank=True)
    is_deleted = models.BooleanField(default=False)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["chat", "created_at"]),
            models.Index(fields=["chat", "is_read"]),
        ]

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # update chat last_message_at (even on edit we can refresh)
        Chat.objects.filter(pk=self.chat_id).update(last_message_at=self.created_at or self.updated_at)