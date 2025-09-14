# apps/bookings/models.py
from datetime import timedelta

from django.core.validators import MinValueValidator
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.chat.models import Conversation
from apps.common.models import BaseModel, ServiceType
from apps.profiles.models import CustomerProfile, ClientProfile


class Booking(BaseModel):

    class BookingStatus(models.TextChoices):
        PENDING = "pending", _("Pending")  # client offer qildi
        ACCEPTED = "accepted", _("Accepted")  # confirmed / booked
        CANCELLED = "cancelled", _("Cancelled")
        COMPLETED = "completed", _("Completed")
        EXPIRED = "expired", _("Expired")  # vaqt o‘tgan bo‘lsa

    client_profile = models.ForeignKey(
        ClientProfile,
        on_delete=models.CASCADE,
        related_name="bookings",
        verbose_name=_("Client"),
        null=True,
        blank=True,
    )
    customer_profile = models.ForeignKey(
        CustomerProfile,
        on_delete=models.CASCADE,
        related_name="bookings",
        verbose_name=_("Customer"),
    )

    service_type = models.ForeignKey(
        ServiceType,
        on_delete=models.PROTECT,
        verbose_name=_("Service type"),
        null=True,
        blank=True,
    )

    title = models.CharField(
        max_length=255, blank=True, verbose_name=_("Booking title")
    )
    description = models.TextField(blank=True, verbose_name=_("Description"))

    country = models.CharField(max_length=100, verbose_name=_("Country"), db_index=True)
    city = models.CharField(
        max_length=100, blank=True, verbose_name=_("City"), db_index=True
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
        max_digits=9, decimal_places=6, null=True, blank=True
    )
    longitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True
    )

    proposed_rate = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        null=True,
        blank=True,
    )
    rate_type = models.CharField(
        max_length=10,
        choices=[
            ("hourly", _("Hourly")),
            ("daily", _("Daily")),
            ("fixed", _("Fixed price")),
        ],
        null=True,
        blank=True,
    )
    currency = models.CharField(max_length=3, default="USD", verbose_name=_("Currency"))

    status = models.CharField(
        max_length=20,
        choices=BookingStatus.choices,
        default=BookingStatus.PENDING,
        verbose_name=_("Status"),
    )
    cancellation_reason = models.TextField(
        blank=True, null=True, verbose_name=_("Cancellation reason")
    )

    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="booking",
        verbose_name=_("Conversation"),
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
            models.Index(fields=["customer_profile", "status"]),
            models.Index(fields=["start_date", "end_date"]),
            models.Index(fields=["status", "created_at"]),
        ]

    def __str__(self):
        client_name = (
            self.client_profile.user.full_name
            if self.client_profile
            else "Self-booking"
        )
        return f"{client_name} → {self.customer_profile.user.full_name} ({self.start_date} → {self.end_date}) - {self.get_status_display()}"

    @property
    def booked_days(self):
        days = []
        if not self.start_date or not self.end_date:
            return days
        current = self.start_date
        while current <= self.end_date:
            days.append(current)
            current += timedelta(days=1)
        return days

    @property
    def is_active(self):
        return self.status in [self.BookingStatus.PENDING, self.BookingStatus.ACCEPTED]

    @property
    def can_cancel(self):
        return self.status in [self.BookingStatus.ACCEPTED, self.BookingStatus.PENDING]

    @property
    def can_review(self):
        return self.status == self.BookingStatus.COMPLETED
