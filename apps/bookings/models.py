# apps/bookings/models.py - OPTIMIZED & FIXED VERSION

from datetime import timedelta, date
from typing import Optional, Set

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q
from django.utils.translation import gettext_lazy as _

from apps.common.models import BaseModel, ServiceType
from apps.profiles.models import CustomerProfile, ClientProfile


class BookingManager(models.Manager):
    """Optimized manager for booking queries"""

    def get_customer_busy_dates(
        self, customer_profile, exclude_booking=None
    ) -> Set[date]:
        """Get all busy dates for customer (optimized)"""
        # Faqat ACCEPTED va UPDATED holatlar band qiladi
        query = self.filter(
            customer_profile=customer_profile,
            status__in=["accepted", "updated"],  # String ishlatish
        )

        if exclude_booking:
            query = query.exclude(id=exclude_booking.id)

        # Prefetch faqat kerakli fieldlar
        bookings = query.only("start_date", "end_date")

        busy_dates = set()
        for booking in bookings:
            if booking.start_date and booking.end_date:
                # Optimized date range generation
                delta = (booking.end_date - booking.start_date).days + 1
                busy_dates.update(
                    booking.start_date + timedelta(days=i) for i in range(delta)
                )

        return busy_dates

    def check_availability(
        self, customer_profile, start_date, end_date, exclude_booking=None
    ) -> bool:
        """Check if customer is available (optimized query)"""
        query = self.filter(
            customer_profile=customer_profile,
            status__in=["accepted", "updated"],
            start_date__lte=end_date,
            end_date__gte=start_date,
        )

        if exclude_booking:
            query = query.exclude(id=exclude_booking.id)

        return not query.exists()  # Tezroq

    def get_active_bookings(self, user):
        """Get all active bookings for user"""
        from django.contrib.auth import get_user_model

        User = get_user_model()

        q = Q()
        if hasattr(user, "customerprofile"):
            q |= Q(customer_profile=user.customerprofile)
        if hasattr(user, "clientprofile"):
            q |= Q(client_profile=user.clientprofile)

        return self.filter(
            q, status__in=["pending", "accepted", "updated"]
        ).select_related("customer_profile__user", "client_profile__user")


class Booking(BaseModel):
    """
    Optimized Booking model with proper validation and performance
    """

    class BookingStatus(models.TextChoices):
        PENDING = "pending", _("Pending")
        ACCEPTED = "accepted", _("Accepted")
        UPDATED = "updated", _("Updated")
        CANCELLED = "cancelled", _("Cancelled")
        COMPLETED = "completed", _("Completed")
        EXPIRED = "expired", _("Expired")

    # Relations
    client_profile = models.ForeignKey(
        ClientProfile,
        on_delete=models.CASCADE,
        related_name="bookings",
        verbose_name=_("Client"),
        null=True,
        blank=True,
        db_index=True,  # Index for faster queries
    )

    customer_profile = models.ForeignKey(
        CustomerProfile,
        on_delete=models.CASCADE,
        related_name="bookings",
        verbose_name=_("Customer"),
        db_index=True,  # Index qo'shildi
    )

    service_type = models.ForeignKey(
        ServiceType,
        on_delete=models.PROTECT,
        verbose_name=_("Service type"),
        null=True,
        blank=True,
    )

    # Core fields
    title = models.CharField(max_length=255, blank=True, verbose_name=_("Title"))
    description = models.TextField(blank=True, verbose_name=_("Description"))

<<<<<<< HEAD
    # Search uchun muhim fieldlar
=======
    # Location - optimized
>>>>>>> origin/jasur
    country = models.CharField(max_length=100, verbose_name=_("Country"), db_index=True)
    city = models.CharField(
        max_length=100, blank=True, verbose_name=_("City"), db_index=True
    )
    location = models.CharField(max_length=255, blank=True, verbose_name=_("Location"))
    location_details = models.TextField(blank=True, verbose_name=_("Location details"))

    # Dates - required fields
    start_date = models.DateField(verbose_name=_("Start date"), db_index=True)
    end_date = models.DateField(verbose_name=_("End date"), db_index=True)

    # Time tracking
    start_time = models.TimeField(null=True, blank=True, verbose_name=_("Start time"))
    duration_hours = models.PositiveIntegerField(null=True, blank=True)

    # History tracking
    previous_start_date = models.DateField(null=True, blank=True)
    previous_end_date = models.DateField(null=True, blank=True)
    updated_count = models.PositiveIntegerField(default=0)

    # Pricing
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
            ("fixed", _("Fixed")),
        ],
        default="daily",
        null=True,
        blank=True,
    )
    currency = models.CharField(max_length=3, default="USD")

    # Status
    status = models.CharField(
        max_length=20,
        choices=BookingStatus.choices,
        default=BookingStatus.PENDING,
        verbose_name=_("Status"),
        db_index=True,
    )

    # Conversation link - lazy import uchun
    conversation_id = models.BigIntegerField(
        null=True, blank=True, db_index=True, verbose_name=_("Conversation ID")
    )

    # Metadata
    special_requirements = models.TextField(blank=True)
    number_of_people = models.PositiveIntegerField(
        default=1, validators=[MinValueValidator(1)]
    )
    created_via_chat = models.BooleanField(default=False)

    # Timestamps
    accepted_at = models.DateTimeField(null=True, blank=True, db_index=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancelled_by_id = models.BigIntegerField(null=True, blank=True)

    objects = BookingManager()

    class Meta:
        verbose_name = _("Booking")
        verbose_name_plural = _("Bookings")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["customer_profile", "status", "-created_at"]),
            models.Index(fields=["start_date", "end_date", "status"]),
            models.Index(fields=["country", "city", "status"]),
            models.Index(fields=["conversation_id", "status"]),
        ]
        constraints = [
            models.CheckConstraint(
                check=Q(end_date__gte=models.F("start_date")),
                name="booking_end_date_after_start",
            ),
            models.CheckConstraint(
                check=Q(number_of_people__gt=0), name="booking_positive_people_count"
            ),
        ]

    def __str__(self):
        client = self.client_profile.user.full_name if self.client_profile else "Direct"
        return f"{client} → {self.customer_profile.user.full_name} ({self.start_date}-{self.end_date}) [{self.get_status_display()}]"

    def clean(self):
        """Validation before save"""
        super().clean()

        if self.start_date and self.end_date:
            if self.end_date < self.start_date:
                raise ValidationError({"end_date": "End date must be after start date"})

            if (self.end_date - self.start_date).days > 365:
                raise ValidationError("Booking cannot exceed 365 days")

        if self.proposed_rate and self.proposed_rate < 0:
            raise ValidationError({"proposed_rate": "Rate cannot be negative"})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    @property
    def duration_days(self) -> int:
        """Get booking duration in days"""
        if self.start_date and self.end_date:
            return (self.end_date - self.start_date).days + 1
        return 0

    @property
    def total_amount(self) -> Optional[float]:
        """Calculate total amount"""
        if not self.proposed_rate:
            return None

        if self.rate_type == "hourly" and self.duration_hours:
            return float(self.proposed_rate * self.duration_hours)
        elif self.rate_type == "daily":
            return float(self.proposed_rate * self.duration_days)
        elif self.rate_type == "fixed":
            return float(self.proposed_rate)

        return None

    @property
    def is_active(self) -> bool:
        """Check if booking is active"""
        return self.status in [
            self.BookingStatus.PENDING,
            self.BookingStatus.ACCEPTED,
            self.BookingStatus.UPDATED,
        ]

    @property
    def can_accept(self) -> bool:
        """Check if can be accepted"""
        return self.status == self.BookingStatus.PENDING

    @property
    def can_update(self) -> bool:
        """Check if dates can be updated"""
        return self.status in [self.BookingStatus.ACCEPTED, self.BookingStatus.UPDATED]

    @property
    def can_cancel(self) -> bool:
        """Check if can be cancelled"""
        return self.status in [
            self.BookingStatus.PENDING,
            self.BookingStatus.ACCEPTED,
            self.BookingStatus.UPDATED,
        ]

    @property
    def can_complete(self) -> bool:
        """Check if can be marked complete"""
        from django.utils import timezone

        today = timezone.now().date()
        return (
            self.status in [self.BookingStatus.ACCEPTED, self.BookingStatus.UPDATED]
            and self.end_date
            and self.end_date < today
        )

    def update_dates(self, new_start_date: date, new_end_date: date) -> None:
        """Update booking dates with validation"""
        if not self.can_update:
            raise ValidationError(
                f"Cannot update booking with status: {self.get_status_display()}"
            )

        # Save previous dates
        self.previous_start_date = self.start_date
        self.previous_end_date = self.end_date

        # Update dates
        self.start_date = new_start_date
        self.end_date = new_end_date
        self.updated_count += 1
        self.status = self.BookingStatus.UPDATED
        self.save()

    def get_conversation(self):
        """Get related conversation (lazy loading)"""
        if self.conversation_id:
            from apps.chat.models import Conversation

            return Conversation.objects.filter(id=self.conversation_id).first()
        return None

    def set_conversation(self, conversation):
        """Set conversation (avoid circular import)"""
        self.conversation_id = conversation.id if conversation else None
