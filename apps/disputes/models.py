from django.db import models
from django.contrib.auth import get_user_model
from apps.common.models import TimeStampedModel
from apps.bookings.models import Booking
from apps.chat.models import ChatRoom

User = get_user_model()


class Dispute(TimeStampedModel):
    """
    Model for handling disputes related to bookings
    """

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("in_progress", "In Progress"),
        ("resolved", "Resolved"),
        ("closed", "Closed"),
    ]

    INITIATOR_CHOICES = [
        ("client", "Client"),
        ("guide", "Guide"),
    ]

    booking = models.ForeignKey(
        Booking, on_delete=models.CASCADE, related_name="disputes"
    )
    client = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="disputes_as_client"
    )
    guide = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="disputes_as_guide"
    )
    initiator = models.CharField(
        max_length=10, choices=INITIATOR_CHOICES, help_text="Who initiated the dispute"
    )
    reason = models.TextField(help_text="Reason for the dispute")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    resolver = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="resolved_disputes",
        help_text="Admin who resolved the dispute",
    )
    resolution_details = models.TextField(
        blank=True, help_text="Details of the resolution"
    )
    resolved_at = models.DateTimeField(
        null=True, blank=True, help_text="When the dispute was resolved"
    )
    chat_room = models.OneToOneField(
        ChatRoom,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="dispute",
        help_text="Chat room for dispute communication",
    )

    class Meta:
        db_table = "disputes"
        verbose_name = "Dispute"
        verbose_name_plural = "Disputes"
        indexes = [
            models.Index(fields=["booking"]),
            models.Index(fields=["client"]),
            models.Index(fields=["guide"]),
            models.Index(fields=["status"]),
            models.Index(fields=["resolved_at"]),
        ]

    def __str__(self):
        return f"Dispute {self.id} for Booking {self.booking.id} ({self.status})"
