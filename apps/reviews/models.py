# apps/reviews/models.py

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.contrib.auth import get_user_model
from apps.common.models import TimeStampedModel

User = get_user_model()


class Review(TimeStampedModel):
    """
    Reviews and ratings for completed tours
    """

    # Parties
    reviewer = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="reviews_given"
    )
    guide = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="reviews_received"
    )

    # Related booking
    booking = models.OneToOneField(
        "bookings.Booking", on_delete=models.CASCADE, related_name="review"
    )

    # Review content
    rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    title = models.CharField(max_length=200, blank=True)
    comment = models.TextField()

    # Detailed ratings
    communication_rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)], null=True, blank=True
    )
    professionalism_rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)], null=True, blank=True
    )
    knowledge_rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)], null=True, blank=True
    )
    value_rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)], null=True, blank=True
    )

    # Review status
    is_verified = models.BooleanField(default=False)
    is_featured = models.BooleanField(default=False)

    # Response from guide
    guide_response = models.TextField(blank=True)
    guide_responded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "reviews"
        verbose_name = "Review"
        verbose_name_plural = "Reviews"
        indexes = [
            models.Index(fields=["guide", "rating"]),
            models.Index(fields=["reviewer"]),
            models.Index(fields=["is_verified"]),
            models.Index(fields=["is_featured"]),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"Review by {self.reviewer.full_name} for {self.guide.full_name} - {self.rating}★"

    def save(self, *args, **kwargs):
        """Update guide's average rating when review is saved"""
        super().save(*args, **kwargs)
        # Update guide's profile rating
        if hasattr(self.guide, "guide_profile"):
            self.guide.guide_profile.update_rating()


class ReviewHelpful(TimeStampedModel):
    """
    Track helpful votes for reviews
    """

    review = models.ForeignKey(
        Review, on_delete=models.CASCADE, related_name="helpful_votes"
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    is_helpful = models.BooleanField()  # True for helpful, False for not helpful

    class Meta:
        db_table = "review_helpful"
        verbose_name = "Review Helpful Vote"
        verbose_name_plural = "Review Helpful Votes"
        unique_together = ["review", "user"]

    def __str__(self):
        vote = "helpful" if self.is_helpful else "not helpful"
        return f"{self.user.full_name} found review {vote}"


class ReviewReport(TimeStampedModel):
    """
    Reports for inappropriate reviews
    """

    REASON_CHOICES = [
        ("spam", "Spam"),
        ("fake", "Fake Review"),
        ("inappropriate", "Inappropriate Content"),
        ("harassment", "Harassment"),
        ("off_topic", "Off Topic"),
        ("other", "Other"),
    ]

    review = models.ForeignKey(Review, on_delete=models.CASCADE, related_name="reports")
    reporter = models.ForeignKey(User, on_delete=models.CASCADE)
    reason = models.CharField(max_length=20, choices=REASON_CHOICES)
    details = models.TextField(blank=True)

    # Report status
    is_resolved = models.BooleanField(default=False)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="resolved_reports",
    )

    class Meta:
        db_table = "review_reports"
        verbose_name = "Review Report"
        verbose_name_plural = "Review Reports"
        unique_together = ["review", "reporter"]

    def __str__(self):
        return f"Report by {self.reporter.full_name} for review #{self.review.id}"
