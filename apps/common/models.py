# apps/common/models.py

from django.db import models
from django.utils import timezone
import uuid


class TimeStampedModel(models.Model):
    """
    Abstract base model that provides self-updating
    'created_at' and 'updated_at' fields
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Country(TimeStampedModel):
    """
    Country model for location data
    """

    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=3, unique=True)  # ISO 3166-1 alpha-3
    phone_code = models.CharField(max_length=10, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "countries"
        verbose_name = "Country"
        verbose_name_plural = "Countries"
        ordering = ["name"]

    def __str__(self):
        return self.name


class City(TimeStampedModel):
    """
    City model for location data
    """

    name = models.CharField(max_length=100)
    country = models.ForeignKey(
        Country, on_delete=models.CASCADE, related_name="cities"
    )
    latitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True
    )
    longitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True
    )
    is_popular = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "cities"
        verbose_name = "City"
        verbose_name_plural = "Cities"
        ordering = ["name"]
        unique_together = ["name", "country"]

    def __str__(self):
        return f"{self.name}, {self.country.name}"


class Service(TimeStampedModel):
    """
    Service types that guides can offer
    """

    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, blank=True)  # Icon class name
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "services"
        verbose_name = "Service"
        verbose_name_plural = "Services"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Language(TimeStampedModel):
    """
    Languages that guides can speak
    """

    name = models.CharField(max_length=50, unique=True)
    code = models.CharField(max_length=5, unique=True)  # ISO 639-1
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "languages"
        verbose_name = "Language"
        verbose_name_plural = "Languages"
        ordering = ["name"]

    def __str__(self):
        return self.name
