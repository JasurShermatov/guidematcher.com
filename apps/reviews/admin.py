from django.contrib import admin
from .models import Review, ReviewResponse, ReviewHelpful


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = (
        "booking",
        "client",
        "customer",
        "overall_rating",
        "is_published",
        "is_featured",
        "helpful_count",
        "moderated_by",
        "moderated_at",
    )
    search_fields = (
        "booking__id",
        "client__username",
        "client__email",
        "customer__user__username",
        "title",
        "comment",
    )
    list_filter = (
        "is_published",
        "is_featured",
        "overall_rating",
        "customer",
        "client",
    )
    autocomplete_fields = ["booking", "client", "customer", "moderated_by"]
    readonly_fields = ["helpful_count", "created_at", "updated_at"]


@admin.register(ReviewResponse)
class ReviewResponseAdmin(admin.ModelAdmin):
    list_display = ("review", "is_published")
    search_fields = ("review__id", "review__customer__user__username", "response_text")
    list_filter = ("is_published",)
    autocomplete_fields = ["review"]


@admin.register(ReviewHelpful)
class ReviewHelpfulAdmin(admin.ModelAdmin):
    list_display = ("review", "user")
    search_fields = ("review__id", "user__username", "user__email")
    autocomplete_fields = ["review", "user"]
