# apps/reviews/admin.py
from django.contrib import admin
from django.utils.translation import gettext_lazy as _

from apps.reviews.models import Review, ReviewResponse, ReviewReaction


class ReviewResponseInline(admin.StackedInline):
    """
    Inline for provider's official response to a review
    """

    model = ReviewResponse
    extra = 0
    min_num = 0
    max_num = 1
    can_delete = True
    show_change_link = True


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    """
    Admin panel for managing reviews left by clients.
    """

    list_display = (
        "id",
        "booking",
        "client",
        "customer",
        "overall_rating",
        "is_published",
        "is_featured",
        "like_count",
        "dislike_count",
        "created_at",
    )
    list_filter = (
        "is_published",
        "is_featured",
        "overall_rating",
        "created_at",
    )
    search_fields = (
        "title",
        "comment",
        "client__full_name",
        "customer__user__full_name",
    )
    readonly_fields = (
        "like_count",
        "dislike_count",
        "created_at",
        "updated_at",
    )
    list_select_related = ("client", "customer", "booking")
    raw_id_fields = ("booking", "client", "customer", "moderated_by")
    ordering = ("-created_at",)
    inlines = [ReviewResponseInline]

    fieldsets = (
        (
            _("Review Info"),
            {"fields": ("booking", "client", "customer", "title", "comment")},
        ),
        (
            _("Ratings"),
            {
                "fields": (
                    "overall_rating",
                    "communication_rating",
                    "service_rating",
                    "punctuality_rating",
                    "value_rating",
                )
            },
        ),
        (
            _("Moderation"),
            {
                "classes": ("collapse",),
                "fields": (
                    "is_published",
                    "is_featured",
                    "moderated_by",
                    "moderated_at",
                    "moderation_note",
                ),
            },
        ),
        (
            _("Counters"),
            {"classes": ("collapse",), "fields": ("like_count", "dislike_count")},
        ),
        (
            _("Timestamps"),
            {"classes": ("collapse",), "fields": ("created_at", "updated_at")},
        ),
    )


@admin.register(ReviewResponse)
class ReviewResponseAdmin(admin.ModelAdmin):
    """
    Admin panel for provider's responses to reviews.
    """

    list_display = ("id", "review", "is_published", "created_at")
    list_filter = ("is_published", "created_at")
    search_fields = ("response_text", "review__comment")
    raw_id_fields = ("review",)
    readonly_fields = ("created_at", "updated_at")
    list_select_related = ("review",)


@admin.register(ReviewReaction)
class ReviewReactionAdmin(admin.ModelAdmin):
    """
    Admin panel for reactions (like/dislike) to reviews.
    """

    list_display = ("id", "review", "user", "reaction_type", "created_at")
    list_filter = ("reaction_type", "created_at")
    search_fields = ("review__comment", "user__full_name")
    raw_id_fields = ("review", "user")
    readonly_fields = ("created_at", "updated_at")
    list_select_related = ("review", "user")
    ordering = ("-created_at",)
