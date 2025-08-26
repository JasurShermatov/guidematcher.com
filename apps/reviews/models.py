# ============================================
# 1. apps/reviews/models.py - SIMPLIFIED & PROFESSIONAL
# ============================================

from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models
from django.db.models import Avg, Count
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from apps.bookings.models import Booking
from apps.common.models import BaseModel
from apps.profiles.models import CustomerProfile
from apps.users.models import User


class ReviewManager(models.Manager):

    def for_customer(self, customer_profile):
        return self.filter(customer=customer_profile, is_published=True).select_related(
            "client", "booking"
        )

    def by_client(self, user):
        return self.filter(client=user).select_related("customer__user", "booking")


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
        db_index=True,
    )

    customer = models.ForeignKey(
        CustomerProfile,
        on_delete=models.CASCADE,
        related_name="received_reviews",
        verbose_name=_("Customer"),
        db_index=True,
    )

    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True,
        blank=True,
        verbose_name=_("Rating (1-5 stars)"),
    )

    comment = models.TextField(blank=True, verbose_name=_("Comment"))

    is_published = models.BooleanField(default=True, verbose_name=_("Is published"))

    edited_at = models.DateTimeField(
        null=True, blank=True, verbose_name=_("Last edited")
    )

    objects = ReviewManager()

    class Meta:
        verbose_name = _("Review")
        verbose_name_plural = _("Reviews")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["customer", "is_published", "-created_at"]),
            models.Index(fields=["client", "-created_at"]),
            models.Index(fields=["rating"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["booking"], name="unique_review_per_booking"
            ),
        ]

    def __str__(self):
        if self.rating:
            return f"{self.rating}★ by {self.client.full_name} for {self.customer.user.full_name}"
        return f"Review by {self.client.full_name} for {self.customer.user.full_name}"

    def clean(self):
        if not self.rating and not self.comment:
            raise models.ValidationError(_("Please provide either a rating or comment"))

    def save(self, *args, **kwargs):

        if self.pk:
            self.edited_at = timezone.now()

        super().save(*args, **kwargs)

        self._update_customer_rating()

    def _update_customer_rating(self):
        stats = self.customer.received_reviews.filter(
            is_published=True, rating__isnull=False
        ).aggregate(avg_rating=Avg("rating"), total_reviews=Count("id"))

        self.customer.average_rating = round(stats["avg_rating"] or 0, 1)
        self.customer.total_reviews = stats["total_reviews"] or 0
        self.customer.save(update_fields=["average_rating", "total_reviews"])
