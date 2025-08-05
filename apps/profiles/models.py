# apps/profiles/models.py

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.contrib.auth import get_user_model
from apps.common.models import TimeStampedModel, Country, City, Service, Language

User = get_user_model()


class ClientProfile(TimeStampedModel):
    """
    Extended profile for client users
    """

    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="client_profile"
    )
    birth_date = models.DateField(null=True, blank=True)
    gender = models.CharField(
        max_length=10,
        choices=[("Male", "Male"), ("Female", "Female"), ("Other", "Other")],
        blank=True,
    )
    emergency_contact = models.CharField(max_length=100, blank=True)
    emergency_phone = models.CharField(max_length=20, blank=True)
    travel_preferences = models.TextField(blank=True)
    dietary_restrictions = models.TextField(blank=True)

    class Meta:
        db_table = "client_profiles"
        verbose_name = "Client Profile"
        verbose_name_plural = "Client Profiles"

    def __str__(self):
        return f"Client Profile: {self.user.full_name}"


class GuideProfile(TimeStampedModel):
    """
    Extended profile for guide users
    """

    EXPERIENCE_CHOICES = [
        ("0-1", "0-1 years"),
        ("1-3", "1-3 years"),
        ("3-5", "3-5 years"),
        ("5+", "5+ years"),
    ]

    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="guide_profile"
    )

    # Professional details
    experience_years = models.CharField(
        max_length=10, choices=EXPERIENCE_CHOICES, blank=True
    )
    hourly_rate = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        null=True,
        blank=True,
    )
    daily_rate = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        null=True,
        blank=True,
    )

    # Location and availability
    operating_cities = models.ManyToManyField(City, blank=True)
    work_schedule = models.TextField(blank=True, help_text="Working hours and days")

    # Services and languages
    services = models.ManyToManyField(Service, blank=True)
    languages = models.ManyToManyField("GuideLanguage", blank=True)

    # Profile completion and verification
    is_verified = models.BooleanField(default=False)
    verification_date = models.DateTimeField(null=True, blank=True)
    profile_completion = models.IntegerField(
        default=0, validators=[MinValueValidator(0), MaxValueValidator(100)]
    )

    # Response and activity
    response_time_hours = models.IntegerField(default=24)
    is_available = models.BooleanField(default=True)
    last_active = models.DateTimeField(auto_now=True)

    # Statistics
    total_tours = models.IntegerField(default=0)
    average_rating = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=0.0,
        validators=[MinValueValidator(0), MaxValueValidator(5)],
    )

    class Meta:
        db_table = "guide_profiles"
        verbose_name = "Guide Profile"
        verbose_name_plural = "Guide Profiles"
        indexes = [
            models.Index(fields=["is_verified"]),
            models.Index(fields=["is_available"]),
            models.Index(fields=["average_rating"]),
        ]

    def __str__(self):
        return f"Guide Profile: {self.user.full_name}"

    def update_rating(self):
        """Update average rating based on reviews"""
        from apps.reviews.models import Review

        reviews = Review.objects.filter(guide=self.user)
        if reviews.exists():
            self.average_rating = (
                reviews.aggregate(avg_rating=models.Avg("rating"))["avg_rating"] or 0.0
            )
            self.save(update_fields=["average_rating"])


class GuideLanguage(TimeStampedModel):
    """
    Languages that a guide speaks with proficiency level
    """

    PROFICIENCY_CHOICES = [
        ("Basic", "Basic"),
        ("Intermediate", "Intermediate"),
        ("Advanced", "Advanced"),
        ("Native", "Native"),
    ]

    guide = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="guide_languages"
    )
    language = models.ForeignKey(Language, on_delete=models.CASCADE)
    proficiency = models.CharField(max_length=20, choices=PROFICIENCY_CHOICES)

    class Meta:
        db_table = "guide_languages"
        verbose_name = "Guide Language"
        verbose_name_plural = "Guide Languages"
        unique_together = ["guide", "language"]

    def __str__(self):
        return f"{self.guide.full_name} - {self.language.name} ({self.proficiency})"


class Portfolio(TimeStampedModel):
    """
    Portfolio images for guides
    """

    guide = models.ForeignKey(User, on_delete=models.CASCADE, related_name="portfolio")
    title = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    image_url = models.URLField()
    order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "portfolios"
        verbose_name = "Portfolio"
        verbose_name_plural = "Portfolios"
        ordering = ["order", "created_at"]

    def __str__(self):
        return f"{self.guide.full_name} - {self.title}"


class Favorite(TimeStampedModel):
    """
    User favorites (guides or destinations)
    """

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="favorites")
    guide = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="favorited_by",
        null=True,
        blank=True,
    )
    city = models.ForeignKey(City, on_delete=models.CASCADE, null=True, blank=True)

    class Meta:
        db_table = "favorites"
        verbose_name = "Favorite"
        verbose_name_plural = "Favorites"
        unique_together = [["user", "guide"], ["user", "city"]]

    def __str__(self):
        if self.guide:
            return f"{self.user.full_name} likes {self.guide.full_name}"
        return f"{self.user.full_name} likes {self.city.name}"
