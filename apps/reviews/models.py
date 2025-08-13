# apps/reviews/models.py
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator, MaxValueValidator
from apps.common.models import BaseModel
from apps.users.models import User
from apps.profiles.models import CustomerProfile
from apps.bookings.models import Booking


class Review(BaseModel):

    booking = models.OneToOneField(
        Booking,
        on_delete=models.CASCADE,
        related_name="review",
        verbose_name=_("Booking"),
    )
    client = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="given_reviews",
        verbose_name=_("Client"),
    )
    customer = models.ForeignKey(
        CustomerProfile,
        on_delete=models.CASCADE,
        related_name="received_reviews",
        verbose_name=_("Service provider"),
    )

    overall_rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        verbose_name=_("Overall rating"),
    )
    communication_rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True,
        blank=True,
        verbose_name=_("Communication rating"),
    )
    service_rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True,
        blank=True,
        verbose_name=_("Service quality rating"),
    )
    punctuality_rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True,
        blank=True,
        verbose_name=_("Punctuality rating"),
    )
    value_rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True,
        blank=True,
        verbose_name=_("Value for money rating"),
    )

    title = models.CharField(max_length=200, blank=True, verbose_name=_("Review title"))
    comment = models.TextField(verbose_name=_("Review comment"))

    is_published = models.BooleanField(default=True, verbose_name=_("Is published"))
    is_featured = models.BooleanField(default=False, verbose_name=_("Is featured"))
    moderated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="moderated_reviews",
        verbose_name=_("Moderated by"),
    )
    moderated_at = models.DateTimeField(
        null=True, blank=True, verbose_name=_("Moderated at")
    )
    moderation_note = models.TextField(blank=True, verbose_name=_("Moderation note"))

    helpful_count = models.PositiveIntegerField(
        default=0, verbose_name=_("Helpful count")
    )

    class Meta:
        verbose_name = _("Review")
        verbose_name_plural = _("Reviews")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["customer", "is_published", "-created_at"]),
            models.Index(fields=["client", "-created_at"]),
            models.Index(fields=["overall_rating"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["booking"], name="unique_review_per_booking"
            )
        ]

    def __str__(self):
        return f"Review by {self.client} - {self.overall_rating} stars"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.is_published:
            self._update_customer_rating()

    def _update_customer_rating(self):
        from django.db.models import Avg

        avg_rating = (
            self.customer.received_reviews.filter(is_published=True).aggregate(
                avg=Avg("overall_rating")
            )["avg"]
            or 0
        )

        self.customer.average_rating = round(avg_rating, 2)
        self.customer.total_reviews = self.customer.received_reviews.filter(
            is_published=True
        ).count()
        self.customer.save(update_fields=["average_rating", "total_reviews"])


class ReviewResponse(BaseModel):

    review = models.OneToOneField(
        Review,
        on_delete=models.CASCADE,
        related_name="response",
        verbose_name=_("Review"),
    )
    response_text = models.TextField(verbose_name=_("Response text"))
    is_published = models.BooleanField(default=True, verbose_name=_("Is published"))

    class Meta:
        verbose_name = _("Review response")
        verbose_name_plural = _("Review responses")

    def __str__(self):
        return f"Response to {self.review}"


class ReviewHelpful(BaseModel):

    review = models.ForeignKey(
        Review,
        on_delete=models.CASCADE,
        related_name="helpful_votes",
        verbose_name=_("Review"),
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="helpful_reviews",
        verbose_name=_("User"),
    )

    class Meta:
        verbose_name = _("Review helpful vote")
        verbose_name_plural = _("Review helpful votes")
        unique_together = [["review", "user"]]

    def __str__(self):
        return f"{self.user} found {self.review} helpful"

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        if is_new:
            self.review.helpful_count = self.review.helpful_votes.count()
            self.review.save(update_fields=["helpful_count"])
