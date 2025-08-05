# apps/bookings/models.py

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.contrib.auth import get_user_model
from apps.common.models import TimeStampedModel, Service
from decimal import Decimal

User = get_user_model()


class Booking(TimeStampedModel):
    """
    Main booking model for tour reservations
    """

    STATUS_CHOICES = [
        ("Pending", "Pending"),
        ("Confirmed", "Confirmed"),
        ("In Progress", "In Progress"),
        ("Completed", "Completed"),
        ("Cancelled", "Cancelled"),
        ("Disputed", "Disputed"),
    ]

    DURATION_CHOICES = [
        ("hourly", "Hourly"),
        ("daily", "Daily"),
        ("weekly", "Weekly"),
    ]

    duration_type = models.CharField(
        max_length=10,
        choices=[("DAY", "Day"), ("HOUR", "Hour")],
        default="DAY",  # Default qiymat
    )

    # Parties
    client = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="bookings_as_client"
    )
    guide = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="bookings_as_guide"
    )

    # Booking details
    service = models.ForeignKey(Service, on_delete=models.SET_NULL, null=True)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    # Timing
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    duration_type = models.CharField(max_length=20, choices=DURATION_CHOICES)

    # Participants
    adults_count = models.PositiveIntegerField(default=1)
    children_count = models.PositiveIntegerField(default=0)

    # Pricing
    hourly_rate = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
        null=True,
        blank=True,
    )
    daily_rate = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
        null=True,
        blank=True,
    )
    total_amount = models.DecimalField(
        max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))]
    )

    # Status and tracking
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="Pending")
    notes = models.TextField(blank=True)

    # Payment
    is_paid = models.BooleanField(default=False)
    payment_date = models.DateTimeField(null=True, blank=True)

    # Timestamps for status changes
    confirmed_at = models.DateTimeField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "bookings"
        verbose_name = "Booking"
        verbose_name_plural = "Bookings"
        indexes = [
            models.Index(fields=["client", "status"]),
            models.Index(fields=["guide", "status"]),
            models.Index(fields=["start_date"]),
            models.Index(fields=["status"]),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"Booking #{self.id.hex[:8]} - {self.client.full_name} with {self.guide.full_name}"

    @property
    def duration_hours(self):
        """Calculate duration in hours"""
        return (self.end_date - self.start_date).total_seconds() / 3600

    @property
    def duration_days(self):
        """Calculate duration in days"""
        return (self.end_date.date() - self.start_date.date()).days + 1

    def can_cancel(self):
        """Check if booking can be cancelled"""
        return self.status in ["Pending", "Confirmed"]

    def can_complete(self):
        """Check if booking can be completed"""
        return self.status == "In Progress"


class BookingRequest(TimeStampedModel):
    """
    Initial booking request before confirmation
    """

    STATUS_CHOICES = [
        ("Pending", "Pending"),
        ("Accepted", "Accepted"),
        ("Rejected", "Rejected"),
        ("Counter Offered", "Counter Offered"),
        ("Expired", "Expired"),
    ]

    client = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="booking_requests_sent"
    )
    guide = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="booking_requests_received"
    )

    # Original request details
    requested_service = models.ForeignKey(Service, on_delete=models.SET_NULL, null=True)
    requested_date = models.DateTimeField()
    requested_end_date = models.DateTimeField()
    requested_adults = models.PositiveIntegerField(default=1)
    requested_children = models.PositiveIntegerField(default=0)
    requested_notes = models.TextField(blank=True)

    # Counter offer details (if applicable)
    counter_date = models.DateTimeField(null=True, blank=True)
    counter_end_date = models.DateTimeField(null=True, blank=True)
    counter_price = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True
    )
    counter_notes = models.TextField(blank=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="Pending")

    # If accepted, link to actual booking
    booking = models.OneToOneField(
        Booking,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="original_request",
    )

    # Response tracking
    responded_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField()

    class Meta:
        db_table = "booking_requests"
        verbose_name = "Booking Request"
        verbose_name_plural = "Booking Requests"
        indexes = [
            models.Index(fields=["guide", "status"]),
            models.Index(fields=["client", "status"]),
            models.Index(fields=["requested_date"]),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"Request #{self.id.hex[:8]} - {self.client.full_name} to {self.guide.full_name}"

    def is_expired(self):
        """Check if request has expired"""
        from django.utils import timezone

        return timezone.now() > self.expires_at


class BookingUpdate(TimeStampedModel):
    """
    Track status changes and updates to bookings
    """

    booking = models.ForeignKey(
        Booking, on_delete=models.CASCADE, related_name="updates"
    )
    updated_by = models.ForeignKey(User, on_delete=models.CASCADE)
    old_status = models.CharField(max_length=20, blank=True)
    new_status = models.CharField(max_length=20)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = "booking_updates"
        verbose_name = "Booking Update"
        verbose_name_plural = "Booking Updates"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Update for Booking #{self.booking.id.hex[:8]} by {self.updated_by.full_name}"
