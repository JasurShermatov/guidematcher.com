# apps/common/models.py
import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _


class BaseModel(models.Model):
    """Base abstract model with UUID PK + timestamps."""

    id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False, verbose_name=_("ID")
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Created at"))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_("Updated at"))

    class Meta:
        abstract = True
        ordering = ["-created_at"]


class Country(BaseModel):
    """Countries for user origin and service locations."""

    code = models.CharField(
        max_length=2,
        unique=True,
        verbose_name=_("Country code"),
        help_text=_("ISO 3166-1 alpha-2 code (e.g., UZ, US)"),
    )
    name = models.CharField(max_length=100, verbose_name=_("Country name"))
    flag = models.CharField(max_length=10, blank=True, verbose_name=_("Flag emoji"))
    is_active = models.BooleanField(default=True, verbose_name=_("Is active"))

    class Meta:
        verbose_name = _("Country")
        verbose_name_plural = _("Countries")
        ordering = ["name"]
        indexes = [
            models.Index(fields=["code"]),
            models.Index(fields=["is_active"]),
        ]

    def __str__(self):
        return f"{self.flag} {self.name}" if self.flag else self.name

    def save(self, *args, **kwargs):
        # always store uppercase country code
        if self.code:
            self.code = self.code.upper()
        super().save(*args, **kwargs)


class City(BaseModel):
    """Cities/regions for more specific location."""

    country = models.ForeignKey(
        Country,
        on_delete=models.CASCADE,
        related_name="cities",
        verbose_name=_("Country"),
    )
    name = models.CharField(max_length=100, verbose_name=_("City name"))
    is_active = models.BooleanField(default=True, verbose_name=_("Is active"))

    class Meta:
        verbose_name = _("City")
        verbose_name_plural = _("Cities")
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["country", "name"], name="uniq_city_name_per_country"
            )
        ]
        indexes = [
            models.Index(fields=["country", "name"]),
            models.Index(fields=["is_active"]),
        ]

    def __str__(self):
        return f"{self.name}, {self.country.name}"


class Language(BaseModel):
    """Languages for communication."""

    code = models.CharField(
        max_length=5,
        unique=True,
        verbose_name=_("Language code"),
        help_text=_("ISO 639-1 code (e.g., en, ru)"),
    )
    name = models.CharField(max_length=50, verbose_name=_("Language name"))
    native_name = models.CharField(
        max_length=50, blank=True, verbose_name=_("Native name")
    )
    is_active = models.BooleanField(default=True, verbose_name=_("Is active"))

    class Meta:
        verbose_name = _("Language")
        verbose_name_plural = _("Languages")
        ordering = ["name"]
        indexes = [
            models.Index(fields=["code"]),
            models.Index(fields=["is_active"]),
        ]

    def __str__(self):
        return self.native_name or self.name

    def save(self, *args, **kwargs):
        if self.code:
            self.code = self.code.lower()
        super().save(*args, **kwargs)


class ServiceType(BaseModel):
    """Types of services offered (Guide, Translator, etc.)."""

    name = models.CharField(max_length=100, unique=True, verbose_name=_("Service type"))
    description = models.TextField(blank=True, verbose_name=_("Description"))
    icon = models.CharField(
        max_length=50, blank=True, verbose_name=_("Icon class/name")
    )
    is_active = models.BooleanField(default=True, verbose_name=_("Is active"))
    order = models.PositiveIntegerField(default=0, verbose_name=_("Display order"))

    class Meta:
        verbose_name = _("Service type")
        verbose_name_plural = _("Service types")
        ordering = ["order", "name"]
        indexes = [
            models.Index(fields=["is_active"]),
            models.Index(fields=["order"]),
        ]

    def __str__(self):
        return self.name
