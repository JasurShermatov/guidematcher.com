from django.contrib import admin
from .models import Review, ReviewHelpful, ReviewReport


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    """
    Admin configuration for the Review model
    """

    list_display = (
        "id",
        "reviewer",
        "guide",
        "booking",
        "rating",
        "is_verified",
        "is_featured",
        "created_at",
    )
    list_filter = ("rating", "is_verified", "is_featured", "created_at")
    search_fields = (
        "reviewer__email",
        "reviewer__first_name",
        "reviewer__last_name",
        "guide__email",
        "guide__first_name",
        "guide__last_name",
        "title",
        "comment",
        "guide_response",
    )
    ordering = ("-created_at",)
    readonly_fields = ("created_at", "updated_at", "guide_responded_at")
    list_per_page = 20
    fieldsets = (
        (
            None,
            {"fields": ("booking", "reviewer", "guide", "rating", "title", "comment")},
        ),
        (
            "Detailed Ratings",
            {
                "fields": (
                    "communication_rating",
                    "professionalism_rating",
                    "knowledge_rating",
                    "value_rating",
                )
            },
        ),
        ("Status", {"fields": ("is_verified", "is_featured")}),
        ("Guide Response", {"fields": ("guide_response", "guide_responded_at")}),
        ("Timestamps", {"fields": ("created_at", "updated_at")}),
    )

    def get_queryset(self, request):
        return (
            super().get_queryset(request).select_related("reviewer", "guide", "booking")
        )


@admin.register(ReviewHelpful)
class ReviewHelpfulAdmin(admin.ModelAdmin):
    """
    Admin configuration for the ReviewHelpful model
    """

    list_display = ("review", "user", "is_helpful", "created_at")
    list_filter = ("is_helpful", "created_at")
    search_fields = ("review__title", "review__comment", "user__email")
    ordering = ("-created_at",)
    readonly_fields = ("created_at", "updated_at")
    list_per_page = 20
    fieldsets = (
        (None, {"fields": ("review", "user", "is_helpful")}),
        ("Timestamps", {"fields": ("created_at", "updated_at")}),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("review", "user")


@admin.register(ReviewReport)
class ReviewReportAdmin(admin.ModelAdmin):
    """
    Admin configuration for the ReviewReport model
    """

    list_display = (
        "review",
        "reporter",
        "reason",
        "is_resolved",
        "resolved_at",
        "created_at",
    )
    list_filter = ("reason", "is_resolved", "created_at")
    search_fields = ("review__title", "review__comment", "reporter__email", "details")
    ordering = ("-created_at",)
    readonly_fields = ("created_at", "updated_at", "resolved_at")
    list_per_page = 20
    fieldsets = (
        (None, {"fields": ("review", "reporter", "reason", "details")}),
        ("Resolution", {"fields": ("is_resolved", "resolved_by", "resolved_at")}),
        ("Timestamps", {"fields": ("created_at", "updated_at")}),
    )

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .select_related("review", "reporter", "resolved_by")
        )
