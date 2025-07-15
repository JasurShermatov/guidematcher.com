# apps/profiles/models.py

from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator, MaxValueValidator
from apps.common.models import BaseModel, Language, ServiceType, City
from apps.users.models import User


class ClientProfile(BaseModel):
    """Profile for clients (tourists)"""

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="client_profile",
        verbose_name=_("User"),
    )
    date_of_birth = models.DateField(
        null=True, blank=True, verbose_name=_("Date of birth")
    )
    languages = models.ManyToManyField(
        Language,
        blank=True,
        related_name="client_profiles",
        verbose_name=_("Languages spoken"),
    )
    preferred_contact = models.CharField(
        max_length=20,
        choices=[
            ("email", _("Email")),
            ("phone", _("Phone")),
            ("chat", _("In-app chat")),
        ],
        default="chat",
        verbose_name=_("Preferred contact method"),
    )

    class Meta:
        verbose_name = _("Client profile")
        verbose_name_plural = _("Client profiles")

    def __str__(self):
        return f"Client: {self.user.get_full_name()}"


class CustomerProfile(BaseModel):
    """Profile for service providers"""

    class VerificationStatus(models.TextChoices):
        PENDING = "pending", _("Pending")
        VERIFIED = "verified", _("Verified")
        REJECTED = "rejected", _("Rejected")

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="customer_profile",
        verbose_name=_("User"),
    )

    # Professional info
    professional_bio = models.TextField(
        verbose_name=_("Professional biography"),
        help_text=_("Describe your experience and services"),
    )
    years_of_experience = models.PositiveIntegerField(
        default=0, verbose_name=_("Years of experience")
    )
    languages = models.ManyToManyField(
        Language, related_name="customer_profiles", verbose_name=_("Languages spoken")
    )
    service_types = models.ManyToManyField(
        ServiceType,
        related_name="customer_profiles",
        verbose_name=_("Service types offered"),
    )

    # Location
    city = models.ForeignKey(
        City,
        on_delete=models.PROTECT,
        related_name="service_providers",
        verbose_name=_("Service city"),
    )
    service_areas = models.TextField(
        blank=True,
        verbose_name=_("Service areas"),
        help_text=_("Specific areas where you provide services"),
    )

    # Pricing
    hourly_rate = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        verbose_name=_("Hourly rate (USD)"),
    )
    daily_rate = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        verbose_name=_("Daily rate (USD)"),
    )
    currency = models.CharField(max_length=3, default="USD", verbose_name=_("Currency"))

    # Verification
    verification_status = models.CharField(
        max_length=20,
        choices=VerificationStatus.choices,
        default=VerificationStatus.PENDING,
        verbose_name=_("Verification status"),
    )
    verification_date = models.DateTimeField(
        null=True, blank=True, verbose_name=_("Verification date")
    )
    verification_notes = models.TextField(
        blank=True, verbose_name=_("Verification notes")
    )

    # Stats
    total_bookings = models.PositiveIntegerField(
        default=0, verbose_name=_("Total bookings")
    )
    total_reviews = models.PositiveIntegerField(
        default=0, verbose_name=_("Total reviews")
    )
    average_rating = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(5)],
        verbose_name=_("Average rating"),
    )

    # Availability
    is_available = models.BooleanField(
        default=True, verbose_name=_("Currently available")
    )

    class Meta:
        verbose_name = _("Customer profile")
        verbose_name_plural = _("Customer profiles")
        indexes = [
            models.Index(fields=["city", "is_available"]),
            models.Index(fields=["average_rating"]),
        ]

    def __str__(self):
        return f"Provider: {self.user.get_full_name()}"

    @property
    def is_verified(self):
        return self.verification_status == self.VerificationStatus.VERIFIED


class Portfolio(BaseModel):
    """Portfolio images for service providers"""

    customer = models.ForeignKey(
        CustomerProfile,
        on_delete=models.CASCADE,
        related_name="portfolio_items",
        verbose_name=_("Customer"),
    )
    image = models.ImageField(upload_to="portfolio/%Y/%m/", verbose_name=_("Image"))
    title = models.CharField(max_length=200, blank=True, verbose_name=_("Title"))
    description = models.TextField(blank=True, verbose_name=_("Description"))
    order = models.PositiveIntegerField(default=0, verbose_name=_("Display order"))

    class Meta:
        verbose_name = _("Portfolio item")
        verbose_name_plural = _("Portfolio items")
        ordering = ["order", "-created_at"]

    def __str__(self):
        return self.title or f"Portfolio {self.id}"


class VerificationDocument(BaseModel):
    """Verification documents for service providers"""

    class DocumentType(models.TextChoices):
        ID_CARD = "id_card", _("ID Card")
        PASSPORT = "passport", _("Passport")
        LICENSE = "license", _("Professional License")
        CERTIFICATE = "certificate", _("Certificate")
        OTHER = "other", _("Other")

    customer = models.ForeignKey(
        CustomerProfile,
        on_delete=models.CASCADE,
        related_name="verification_documents",
        verbose_name=_("Customer"),
    )
    document_type = models.CharField(
        max_length=20, choices=DocumentType.choices, verbose_name=_("Document type")
    )
    file = models.FileField(
        upload_to="verification/%Y/%m/", verbose_name=_("Document file")
    )
    description = models.CharField(
        max_length=255, blank=True, verbose_name=_("Description")
    )
    is_verified = models.BooleanField(default=False, verbose_name=_("Is verified"))
    verified_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="verified_documents",
        verbose_name=_("Verified by"),
    )
    verified_at = models.DateTimeField(
        null=True, blank=True, verbose_name=_("Verified at")
    )

    class Meta:
        verbose_name = _("Verification document")
        verbose_name_plural = _("Verification documents")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.get_document_type_display()} - {self.customer}"


class Availability(BaseModel):
    """Availability calendar for service providers"""

    customer = models.ForeignKey(
        CustomerProfile,
        on_delete=models.CASCADE,
        related_name="availabilities",
        verbose_name=_("Customer"),
    )
    date = models.DateField(verbose_name=_("Date"))
    is_available = models.BooleanField(default=True, verbose_name=_("Is available"))
    start_time = models.TimeField(null=True, blank=True, verbose_name=_("Start time"))
    end_time = models.TimeField(null=True, blank=True, verbose_name=_("End time"))
    note = models.CharField(max_length=255, blank=True, verbose_name=_("Note"))

    class Meta:
        verbose_name = _("Availability")
        verbose_name_plural = _("Availabilities")
        unique_together = [["customer", "date"]]
        ordering = ["date"]
        indexes = [
            models.Index(fields=["customer", "date", "is_available"]),
        ]

    def __str__(self):
        status = "Available" if self.is_available else "Unavailable"
        return f"{self.customer} - {self.date} - {status}"
