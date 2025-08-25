# apps/reviews/admin.py
from django.contrib import admin
from django.utils.translation import gettext_lazy as _

from apps.reviews.models import Review


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):

    list_display = (
        "id",
        "booking",
        "client",
        "customer",
        "rating_display",
        "short_comment",
        "is_published",
        "edited_at",
        "created_at",
    )
    list_filter = (
        "is_published",
        "rating",
        ("created_at", admin.DateFieldListFilter),
        ("edited_at", admin.DateFieldListFilter),
    )
    search_fields = (
        "comment",
        "client__full_name",
        "client__email",
        "customer__user__full_name",
        "customer__user__email",
        "booking__id",
    )
    list_select_related = ("booking", "client", "customer")
    ordering = ("-created_at",)
    list_per_page = 25

    readonly_fields = ("created_at", "updated_at", "edited_at")
    raw_id_fields = ("booking", "client", "customer")

    fieldsets = (
        (
            _("Review Info"),
            {"fields": ("booking", "client", "customer")},
        ),
        (
            _("Content"),
            {"fields": ("rating", "comment")},
        ),
        (
            _("Publication"),
            {"fields": ("is_published",)},
        ),
        (
            _("Timestamps"),
            {
                "classes": ("collapse",),
                "fields": ("created_at", "updated_at", "edited_at"),
            },
        ),
    )

    def rating_display(self, obj):
        return f"{'⭐' * obj.rating} ({obj.rating})" if obj.rating else "-"

    rating_display.short_description = _("Rating")

    def short_comment(self, obj):
        return (
            (obj.comment[:50] + "...")
            if obj.comment and len(obj.comment) > 50
            else obj.comment
        )

    short_comment.short_description = _("Comment")
