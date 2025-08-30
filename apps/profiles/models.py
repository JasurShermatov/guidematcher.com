# apps/profiles/models.py
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator, MaxValueValidator
from apps.common.models import BaseModel
from apps.users.models import User


class AbstractProfile(BaseModel):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        verbose_name=_("User"),
    )
    languages = models.ManyToManyField(
        "common.Language",
        blank=True,
        verbose_name=_("Languages spoken"),
    )

    class Meta:
        abstract = True

    def __str__(self):
        return f"{self.__class__.__name__}: {self.user.full_name}"


class ClientProfile(AbstractProfile):
    date_of_birth = models.DateField(
        null=True, blank=True, verbose_name=_("Date of birth")
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


class CustomerProfile(AbstractProfile):
    class VerificationStatus(models.TextChoices):
        PENDING = "pending", _("Pending")
        VERIFIED = "verified", _("Verified")
        REJECTED = "rejected", _("Rejected")

    professional_bio = models.TextField(
        blank=True,  # 👈 Ixtiyoriy qildik
        default="",  # 👈 Default qiymat
        verbose_name=_("Professional biography"),
    )
    years_of_experience = models.PositiveIntegerField(
        default=0, verbose_name=_("Years of experience")
    )
    service_types = models.ManyToManyField(
        "common.ServiceType",
        blank=True,  # 👈 ManyToMany doim blank=True bo'lishi kerak
        verbose_name=_("Service types offered"),
    )
    country = models.CharField(max_length=100, verbose_name=_("Country"), db_index=True)
    city = models.ForeignKey(
        "common.City",
        on_delete=models.PROTECT,

        null=True,  # 👈 NULL qiymatga ruxsat
        blank=True,  # 👈 Formada bo'sh bo'lishi mumkin

        verbose_name=_("Service city"),
    )

    service_areas = models.TextField(
        blank=True, default="", verbose_name=_("Service areas")
    )

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

    @property
    def is_verified(self):
        return self.verification_status == self.VerificationStatus.VERIFIED


class AbstractCustomerRelatedModel(BaseModel):
    customer = models.ForeignKey(
        CustomerProfile,
        on_delete=models.CASCADE,
        verbose_name=_("Customer"),
    )

    class Meta:
        abstract = True


class Portfolio(AbstractCustomerRelatedModel):
    image = models.ImageField(upload_to="portfolio/%Y/%m/", verbose_name=_("Image"))
    title = models.CharField(max_length=200, blank=True, verbose_name=_("Title"))
    description = models.TextField(blank=True, verbose_name=_("Description"))
    order = models.PositiveIntegerField(default=0, verbose_name=_("Display order"))

    class Meta:
        verbose_name = _("Portfolio item")
        verbose_name_plural = _("Portfolio items")
        ordering = ["order", "-created_at"]


class VerificationDocument(AbstractCustomerRelatedModel):
    class DocumentType(models.TextChoices):
        ID_CARD = "id_card", _("ID Card")
        PASSPORT = "passport", _("Passport")
        LICENSE = "license", _("Professional License")
        CERTIFICATE = "certificate", _("Certificate")
        OTHER = "other", _("Other")

    document_type = models.CharField(max_length=20, choices=DocumentType.choices)
    file = models.FileField(upload_to="verification/%Y/%m/")
    description = models.CharField(max_length=255, blank=True)
    is_verified = models.BooleanField(default=False)
    verified_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="verified_documents",
    )
    verified_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = _("Verification document")
        verbose_name_plural = _("Verification documents")
        ordering = ["-created_at"]


class Availability(AbstractCustomerRelatedModel):
    date = models.DateField(verbose_name=_("Date"))
    is_available = models.BooleanField(default=True)
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    note = models.CharField(max_length=255, blank=True)

    class Meta:
        verbose_name = _("Availability")
        verbose_name_plural = _("Availabilities")
        unique_together = [["customer", "date"]]
        ordering = ["date"]
        indexes = [models.Index(fields=["customer", "date", "is_available"])]
