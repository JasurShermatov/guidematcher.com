# apps/bookings/models.py - YANGILANGAN

from datetime import timedelta
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator
from apps.common.models import BaseModel, ServiceType
from apps.users.models import User
from apps.profiles.models import CustomerProfile, ClientProfile
from apps.chat.models import Conversation


class BookingManager(models.Manager):
    """Custom manager for booking queries"""

    def get_customer_busy_dates(self, customer_profile):
        """Customer ning barcha band kunlarini olish"""
        bookings = self.filter(
            customer_profile=customer_profile,
            status__in=[Booking.BookingStatus.ACCEPTED, Booking.BookingStatus.PENDING],
        )

        busy_dates = []
        for booking in bookings:
            current = booking.start_date
            while current <= booking.end_date:
                busy_dates.append(current)
                current += timedelta(days=1)

        return list(set(busy_dates))  # unique dates

    def is_customer_available(self, customer_profile, start_date, end_date):
        """Customer berilgan vaqtda bo'shmi tekshirish"""
        busy_dates = self.get_customer_busy_dates(customer_profile)

        current = start_date
        while current <= end_date:
            if current in busy_dates:
                return False
            current += timedelta(days=1)

        return True


class Booking(BaseModel):
    """
    Booking modeli: client va customer o'rtasidagi kelishuv va band kunlarni boshqaradi.
    Chat bilan to'liq integratsiyalangan.
    """

    class BookingStatus(models.TextChoices):
        PENDING = "pending", _("Pending")  # client offer qildi
        ACCEPTED = "accepted", _("Accepted")  # confirmed / booked
        CANCELLED = "cancelled", _("Cancelled")
        COMPLETED = "completed", _("Completed")
        EXPIRED = "expired", _("Expired")
        UPDATED = "updated", _("Updated")  # vaqt o'zgartirilgan

    # Client va Customer
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

    # Service turi
    service_type = models.ForeignKey(
        ServiceType,
        on_delete=models.PROTECT,
        verbose_name=_("Service type"),
        null=True,
        blank=True,
    )

    # Booking haqida
    title = models.CharField(
        max_length=255, blank=True, verbose_name=_("Booking title")
    )
    description = models.TextField(blank=True, verbose_name=_("Description"))

    # Search uchun muhim fieldlar
    country = models.CharField(
        max_length=100, verbose_name=_("Country"), db_index=True  # search tezligi uchun
    )
    city = models.CharField(
        max_length=100, blank=True, verbose_name=_("City"), db_index=True
    )

    # Vaqt
    start_date = models.DateField(verbose_name=_("Start date"))
    end_date = models.DateField(verbose_name=_("End date"))
    start_time = models.TimeField(null=True, blank=True, verbose_name=_("Start time"))
    duration_hours = models.PositiveIntegerField(
        null=True, blank=True, verbose_name=_("Duration (hours)")
    )

    # Vaqt o'zgartirilganda eski vaqtlarni saqlash
    previous_start_date = models.DateField(null=True, blank=True)
    previous_end_date = models.DateField(null=True, blank=True)
    updated_count = models.PositiveIntegerField(default=0)  # necha marta yangilangan

    # Location
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

    # Rate
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

    # Status
    status = models.CharField(
        max_length=20,
        choices=BookingStatus.choices,
        default=BookingStatus.PENDING,
        verbose_name=_("Status"),
    )

    # Chat bilan bog'lanish
    conversation = models.OneToOneField(
        Conversation,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="booking",
        verbose_name=_("Conversation"),
    )

    # Qo'shimcha maydonlar
    special_requirements = models.TextField(
        blank=True, verbose_name=_("Special requirements")
    )
    number_of_people = models.PositiveIntegerField(
        default=1, verbose_name=_("Number of people")
    )

    # Chat orqali yaratilganmi
    created_via_chat = models.BooleanField(default=False)

    # Booking yaratilgan/yangilangan vaqt
    accepted_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)

    objects = BookingManager()

    class Meta:
        verbose_name = _("Booking")
        verbose_name_plural = _("Bookings")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["customer_profile", "status"]),
            models.Index(fields=["start_date", "end_date"]),
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["country", "city"]),  # search uchun
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
        """Customer band kunlari ro'yxati"""
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
    def can_update(self):
        """Vaqtni o'zgartirish mumkinmi"""
        return self.status == self.BookingStatus.ACCEPTED

    @property
    def can_review(self):
        return self.status == self.BookingStatus.COMPLETED

    def update_dates(self, new_start_date, new_end_date):
        """Booking vaqtini yangilash"""
        # Eski vaqtlarni saqlash
        self.previous_start_date = self.start_date
        self.previous_end_date = self.end_date

        # Yangi vaqtlarni o'rnatish
        self.start_date = new_start_date
        self.end_date = new_end_date
        self.updated_count += 1
        self.status = self.BookingStatus.UPDATED
        self.save()
