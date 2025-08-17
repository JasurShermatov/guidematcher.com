# apps/reviews/admin.py
from django.contrib import admin
from .models import Review, ReviewResponse, ReviewHelpful


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "booking",
        "client",
        "customer",
        "overall_rating",
        "communication_rating",
        "service_rating",
        "punctuality_rating",
        "value_rating",
        "title",
        "comment",
        "is_published",
        "is_featured",
        "moderated_by",
        "moderated_at",
        "moderation_note",
        "helpful_count",
        "created_at",
        "updated_at",
    )
    search_fields = (
        "id",
        "booking__id",
        "client__username",
        "client__email",
        "customer__user__username",
        "customer__user__email",
        "title",
        "comment",
        "moderation_note",
    )
    list_filter = (
        "is_published",
        "is_featured",
        "overall_rating",
        "communication_rating",
        "service_rating",
        "punctuality_rating",
        "value_rating",
        "customer",
        "client",
        "moderated_by",
        "moderated_at",
    )
    autocomplete_fields = [
        "booking",
        "client",
        "customer",
        "moderated_by",
    ]
    readonly_fields = [
        "helpful_count",
        "created_at",
        "updated_at",
    ]


@admin.register(ReviewResponse)
class ReviewResponseAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "review",
        "response_text",
        "is_published",
        "created_at",
        "updated_at",
    )
    search_fields = (
        "id",
        "review__id",
        "review__customer__user__username",
        "review__customer__user__email",
        "response_text",
    )
    list_filter = (
        "is_published",
        "created_at",
        "updated_at",
    )
    autocomplete_fields = ["review"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(ReviewHelpful)
class ReviewHelpfulAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "review",
        "user",
        "created_at",
        "updated_at",
    )
    search_fields = (
        "id",
        "review__id",
        "review__customer__user__username",
        "review__customer__user__email",
        "user__username",
        "user__email",
    )
    autocomplete_fields = ["review", "user"]
    readonly_fields = ["created_at", "updated_at"]
