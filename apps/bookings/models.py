# apps/bookings/models.py

from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator
from apps.common.models import BaseModel, ServiceType
from apps.users.models import User
from apps.profiles.models import CustomerProfile


class Booking(BaseModel):

    class BookingStatus(models.TextChoices):
        PENDING = "pending", _("Pending")
        ACCEPTED = "accepted", _("Accepted")
        REJECTED = "rejected", _("Rejected")
        CANCELLED = "cancelled", _("Cancelled")
        COMPLETED = "completed", _("Completed")
        EXPIRED = "expired", _("Expired")

    client = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="client_bookings",
        verbose_name=_("Client"),
    )
    customer = models.ForeignKey(
        CustomerProfile,
        on_delete=models.CASCADE,
        related_name="customer_bookings",
        verbose_name=_("Service provider"),
    )

    service_type = models.ForeignKey(
        ServiceType, on_delete=models.PROTECT, verbose_name=_("Service type")
    )
    title = models.CharField(max_length=255, verbose_name=_("Booking title"))
    description = models.TextField(
        verbose_name=_("Description"), help_text=_("Describe what you need")
    )

    start_date = models.DateField(verbose_name=_("Start date"))
    end_date = models.DateField(verbose_name=_("End date"))
    start_time = models.TimeField(null=True, blank=True, verbose_name=_("Start time"))
    duration_hours = models.PositiveIntegerField(
        null=True, blank=True, verbose_name=_("Duration (hours)")
    )

    location = models.CharField(
        max_length=255, blank=True, verbose_name=_("Meeting location")
    )
    location_details = models.TextField(blank=True, verbose_name=_("Location details"))
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

    proposed_rate = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name=_("Proposed rate"),
    )
    rate_type = models.CharField(
        max_length=10,
        choices=[
            ("hourly", _("Hourly")),
            ("daily", _("Daily")),
            ("fixed", _("Fixed price")),
        ],
        verbose_name=_("Rate type"),
    )
    currency = models.CharField(max_length=3, default="USD", verbose_name=_("Currency"))

    status = models.CharField(
        max_length=20,
        choices=BookingStatus.choices,
        default=BookingStatus.PENDING,
        verbose_name=_("Status"),
    )

    provider_response = models.TextField(
        blank=True, verbose_name=_("Provider response")
    )
    counter_offer_rate = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        verbose_name=_("Counter offer rate"),
    )

    responded_at = models.DateTimeField(
        null=True, blank=True, verbose_name=_("Responded at")
    )
    accepted_at = models.DateTimeField(
        null=True, blank=True, verbose_name=_("Accepted at")
    )
    completed_at = models.DateTimeField(
        null=True, blank=True, verbose_name=_("Completed at")
    )
    cancelled_at = models.DateTimeField(
        null=True, blank=True, verbose_name=_("Cancelled at")
    )
    cancelled_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cancelled_bookings",
        verbose_name=_("Cancelled by"),
    )
    cancellation_reason = models.TextField(
        blank=True, verbose_name=_("Cancellation reason")
    )

    special_requirements = models.TextField(
        blank=True, verbose_name=_("Special requirements")
    )
    number_of_people = models.PositiveIntegerField(
        default=1, verbose_name=_("Number of people")
    )

    class Meta:
        verbose_name = _("Booking")
        verbose_name_plural = _("Bookings")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["client", "status"]),
            models.Index(fields=["customer", "status"]),
            models.Index(fields=["start_date", "end_date"]),
            models.Index(fields=["status", "created_at"]),
        ]

    def __str__(self):
        return f"{self.title} - {self.get_status_display()}"

    @property
    def is_active(self):
        return self.status in [self.BookingStatus.PENDING, self.BookingStatus.ACCEPTED]

    @property
    def can_cancel(self):
        return self.status in [self.BookingStatus.PENDING, self.BookingStatus.ACCEPTED]

    @property
    def can_review(self):
        return self.status == self.BookingStatus.COMPLETED


class BookingMessage(BaseModel):

    booking = models.ForeignKey(
        Booking,
        on_delete=models.CASCADE,
        related_name="messages",
        verbose_name=_("Booking"),
    )
    sender = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="booking_messages",
        verbose_name=_("Sender"),
    )
    message = models.TextField(verbose_name=_("Message"))
    is_system_message = models.BooleanField(
        default=False, verbose_name=_("Is system message")
    )

    class Meta:
        verbose_name = _("Booking message")
        verbose_name_plural = _("Booking messages")
        ordering = ["created_at"]

    def __str__(self):
        return f"Message from {self.sender} - {self.created_at}"
