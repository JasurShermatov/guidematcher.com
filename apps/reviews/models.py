# apps/reviews/models.py

from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db.models import Q, F, Avg
from django.db.models import Avg, Count
from django.utils import timezone

from apps.common.models import BaseModel
from apps.users.models import User
from apps.profiles.models import CustomerProfile
from django.core.exceptions import ValidationError
from apps.bookings.models import Booking


class Review(BaseModel):
    """
    Review left by a client for a customer (service provider).
    """

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
        verbose_name=_("Client (author of review)"),
    )
    customer = models.ForeignKey(
        CustomerProfile,
        on_delete=models.CASCADE,
        related_name="received_reviews",
        verbose_name=_("Service provider"),
    )

    # Ratings
    overall_rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        verbose_name=_("Overall rating"),
    )
    communication_rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True,
        blank=True,
        verbose_name=_("Communication rating"),
    )
    service_rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True,
        blank=True,
        verbose_name=_("Service quality rating"),
    )
    punctuality_rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True,
        blank=True,
        verbose_name=_("Punctuality rating"),
    )
    value_rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True,
        blank=True,
        verbose_name=_("Value for money rating"),
    )

    # Review content
    title = models.CharField(max_length=200, blank=True, verbose_name=_("Review title"))
    comment = models.TextField(verbose_name=_("Review comment"))

    # Moderation
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

    # Denormalized counters
    like_count = models.PositiveIntegerField(default=0, verbose_name=_("Like count"))
    dislike_count = models.PositiveIntegerField(
        default=0, verbose_name=_("Dislike count")
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
            ),
        ]

    def __str__(self):
        return f"Review {self.overall_rating}★ by {self.client} for {self.customer}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self._update_customer_rating()

    def _update_customer_rating(self):
        """
        Update customer's average rating and total_reviews.
        """
        agg = self.customer.received_reviews.filter(is_published=True).aggregate(
            avg=Avg("overall_rating"), total=models.Count("id")
        )
        self.customer.average_rating = round(agg["avg"] or 0, 2)
        self.customer.total_reviews = agg["total"] or 0
        self.customer.save(update_fields=["average_rating", "total_reviews"])


class ReviewResponse(BaseModel):
    """
    Provider's official response to a review.
    """

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


class ReviewReaction(BaseModel):
    """
    Reaction (like/dislike) given to a review.
    Users can also leave an optional comment explaining their choice.
    """

    class ReactionType(models.TextChoices):
        LIKE = "like", _("Like")
        DISLIKE = "dislike", _("Dislike")

    review = models.ForeignKey(
        Review,
        on_delete=models.CASCADE,
        related_name="reactions",
        verbose_name=_("Review"),
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="review_reactions",
        verbose_name=_("User"),
    )
    reaction_type = models.CharField(
        max_length=10,
        choices=ReactionType.choices,
        verbose_name=_("Reaction type"),
    )
    comment = models.TextField(
        blank=True,
        verbose_name=_("Optional comment (reason or feedback)"),
    )

    class Meta:
        verbose_name = _("Review reaction")
        verbose_name_plural = _("Review reactions")
        unique_together = [["review", "user"]]
        indexes = [
            models.Index(fields=["review", "reaction_type"]),
            models.Index(fields=["user", "reaction_type"]),
        ]

    def __str__(self):
        return f"{self.user} reacted {self.reaction_type} to {self.review}"

    def clean(self):
        if not self.rating and not self.comment:
            raise ValidationError(_("Please provide either a rating or comment"))

    def save(self, *args, **kwargs):
        """
        Update denormalized like/dislike counters on review.
        """
        is_new = self.pk is None
        old_type = None

        if not is_new:
            old_type = ReviewReaction.objects.get(pk=self.pk).reaction_type

        super().save(*args, **kwargs)

        if is_new or old_type != self.reaction_type:
            self._update_review_counters()

    def delete(self, *args, **kwargs):
        super().delete(*args, **kwargs)
        self._update_review_counters()

    def _update_review_counters(self):
        counts = self.review.reactions.values("reaction_type").annotate(
            total=models.Count("id")
        )
        like_count = next(
            (
                c["total"]
                for c in counts
                if c["reaction_type"] == self.ReactionType.LIKE
            ),
            0,
        )
        dislike_count = next(
            (
                c["total"]
                for c in counts
                if c["reaction_type"] == self.ReactionType.DISLIKE
            ),
            0,
        )

        self.review.like_count = like_count
        self.review.dislike_count = dislike_count
        self.review.save(update_fields=["like_count", "dislike_count"])
