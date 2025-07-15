# apps/disputes/models.py

from django.db import models
from django.utils.translation import gettext_lazy as _
from apps.common.models import BaseModel
from apps.users.models import User
from apps.bookings.models import Booking


class Dispute(BaseModel):
    """Disputes between clients and service providers"""

    class DisputeType(models.TextChoices):
        SERVICE_QUALITY = "service_quality", _("Service Quality")
        NO_SHOW = "no_show", _("No Show")
        PAYMENT_ISSUE = "payment_issue", _("Payment Issue")
        CANCELLATION = "cancellation", _("Cancellation Issue")
        COMMUNICATION = "communication", _("Communication Problem")
        SAFETY = "safety", _("Safety Concern")
        FRAUD = "fraud", _("Suspected Fraud")
        OTHER = "other", _("Other")

    class DisputeStatus(models.TextChoices):
        OPEN = "open", _("Open")
        UNDER_REVIEW = "under_review", _("Under Review")
        AWAITING_RESPONSE = "awaiting_response", _("Awaiting Response")
        RESOLVED = "resolved", _("Resolved")
        CLOSED = "closed", _("Closed")
        ESCALATED = "escalated", _("Escalated")

    class Resolution(models.TextChoices):
        IN_FAVOR_OF_CLIENT = "client", _("In favor of client")
        IN_FAVOR_OF_PROVIDER = "provider", _("In favor of provider")
        MUTUAL_AGREEMENT = "mutual", _("Mutual agreement")
        NO_ACTION = "no_action", _("No action required")
        REFUND_ISSUED = "refund", _("Refund issued")
        WARNING_ISSUED = "warning", _("Warning issued")
        ACCOUNT_SUSPENDED = "suspended", _("Account suspended")

    # Parties involved
    reporter = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="reported_disputes",
        verbose_name=_("Reporter"),
    )
    respondent = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="received_disputes",
        verbose_name=_("Respondent"),
    )

    # Related booking
    booking = models.ForeignKey(
        Booking,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="disputes",
        verbose_name=_("Related booking"),
    )

    # Dispute details
    dispute_type = models.CharField(
        max_length=30, choices=DisputeType.choices, verbose_name=_("Dispute type")
    )
    title = models.CharField(max_length=255, verbose_name=_("Title"))
    description = models.TextField(verbose_name=_("Description"))

    # Status
    status = models.CharField(
        max_length=20,
        choices=DisputeStatus.choices,
        default=DisputeStatus.OPEN,
        verbose_name=_("Status"),
    )
    priority = models.CharField(
        max_length=10,
        choices=[
            ("low", _("Low")),
            ("medium", _("Medium")),
            ("high", _("High")),
            ("urgent", _("Urgent")),
        ],
        default="medium",
        verbose_name=_("Priority"),
    )

    # Admin handling
    assigned_to = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_disputes",
        limit_choices_to={"role__in": ["admin", "superadmin"]},
        verbose_name=_("Assigned to"),
    )
    assigned_at = models.DateTimeField(
        null=True, blank=True, verbose_name=_("Assigned at")
    )

    # Resolution
    resolution = models.CharField(
        max_length=20,
        choices=Resolution.choices,
        blank=True,
        verbose_name=_("Resolution"),
    )
    resolution_notes = models.TextField(blank=True, verbose_name=_("Resolution notes"))
    resolved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="resolved_disputes",
        verbose_name=_("Resolved by"),
    )
    resolved_at = models.DateTimeField(
        null=True, blank=True, verbose_name=_("Resolved at")
    )

    # Deadlines
    response_deadline = models.DateTimeField(
        null=True, blank=True, verbose_name=_("Response deadline")
    )
    resolution_deadline = models.DateTimeField(
        null=True, blank=True, verbose_name=_("Resolution deadline")
    )

    class Meta:
        verbose_name = _("Dispute")
        verbose_name_plural = _("Disputes")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "priority", "-created_at"]),
            models.Index(fields=["reporter", "status"]),
            models.Index(fields=["respondent", "status"]),
            models.Index(fields=["assigned_to", "status"]),
        ]

    def __str__(self):
        return f"{self.title} - {self.get_status_display()}"

    @property
    def is_active(self):
        return self.status not in [
            self.DisputeStatus.RESOLVED,
            self.DisputeStatus.CLOSED,
        ]


class DisputeEvidence(BaseModel):
    """Evidence submitted for disputes"""

    class EvidenceType(models.TextChoices):
        SCREENSHOT = "screenshot", _("Screenshot")
        PHOTO = "photo", _("Photo")
        VIDEO = "video", _("Video")
        DOCUMENT = "document", _("Document")
        CHAT_LOG = "chat_log", _("Chat Log")
        OTHER = "other", _("Other")

    dispute = models.ForeignKey(
        Dispute,
        on_delete=models.CASCADE,
        related_name="evidence",
        verbose_name=_("Dispute"),
    )
    submitted_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="submitted_evidence",
        verbose_name=_("Submitted by"),
    )

    evidence_type = models.CharField(
        max_length=20, choices=EvidenceType.choices, verbose_name=_("Evidence type")
    )
    title = models.CharField(max_length=255, verbose_name=_("Title"))
    description = models.TextField(blank=True, verbose_name=_("Description"))
    file = models.FileField(
        upload_to="disputes/evidence/%Y/%m/", verbose_name=_("File")
    )
    file_size = models.PositiveIntegerField(verbose_name=_("File size (bytes)"))

    # Verification
    is_verified = models.BooleanField(default=False, verbose_name=_("Is verified"))
    verified_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="verified_evidence",
        verbose_name=_("Verified by"),
    )
    verified_at = models.DateTimeField(
        null=True, blank=True, verbose_name=_("Verified at")
    )

    class Meta:
        verbose_name = _("Dispute evidence")
        verbose_name_plural = _("Dispute evidence")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} - {self.dispute}"


class DisputeMessage(BaseModel):
    """Messages within a dispute"""

    dispute = models.ForeignKey(
        Dispute,
        on_delete=models.CASCADE,
        related_name="messages",
        verbose_name=_("Dispute"),
    )
    sender = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="dispute_messages",
        verbose_name=_("Sender"),
    )
    message = models.TextField(verbose_name=_("Message"))
    is_internal = models.BooleanField(
        default=False,
        verbose_name=_("Internal note"),
        help_text=_("Only visible to admins"),
    )

    # Attachments
    attachments = models.ManyToManyField(
        DisputeEvidence,
        blank=True,
        related_name="messages",
        verbose_name=_("Attachments"),
    )

    class Meta:
        verbose_name = _("Dispute message")
        verbose_name_plural = _("Dispute messages")
        ordering = ["created_at"]

    def __str__(self):
        return f"Message from {self.sender} - {self.created_at}"


class DisputeAction(BaseModel):
    """Log of actions taken on disputes"""

    class ActionType(models.TextChoices):
        STATUS_CHANGED = "status_changed", _("Status Changed")
        ASSIGNED = "assigned", _("Assigned")
        EVIDENCE_ADDED = "evidence_added", _("Evidence Added")
        MESSAGE_SENT = "message_sent", _("Message Sent")
        ESCALATED = "escalated", _("Escalated")
        RESOLVED = "resolved", _("Resolved")
        REOPENED = "reopened", _("Reopened")
        WARNING_ISSUED = "warning_issued", _("Warning Issued")
        ACCOUNT_ACTION = "account_action", _("Account Action Taken")

    dispute = models.ForeignKey(
        Dispute,
        on_delete=models.CASCADE,
        related_name="actions",
        verbose_name=_("Dispute"),
    )
    action_type = models.CharField(
        max_length=30, choices=ActionType.choices, verbose_name=_("Action type")
    )
    performed_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="dispute_actions",
        verbose_name=_("Performed by"),
    )
    description = models.TextField(verbose_name=_("Description"))

    # Additional data
    old_value = models.CharField(
        max_length=100, blank=True, verbose_name=_("Old value")
    )
    new_value = models.CharField(
        max_length=100, blank=True, verbose_name=_("New value")
    )

    class Meta:
        verbose_name = _("Dispute action")
        verbose_name_plural = _("Dispute actions")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.get_action_type_display()} - {self.dispute}"
