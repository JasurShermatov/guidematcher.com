from django.contrib import admin
from .models import ClientProfile, GuideProfile, GuideLanguage, Portfolio, Favorite
from django.contrib.auth import get_user_model

User = get_user_model()


@admin.register(ClientProfile)
class ClientProfileAdmin(admin.ModelAdmin):
    """
    Admin configuration for the ClientProfile model
    """

    list_display = ("user", "birth_date", "gender", "created_at")
    list_filter = ("gender", "created_at")
    search_fields = ("user__email", "user__first_name", "user__last_name")
    ordering = ("-created_at",)
    readonly_fields = ("created_at", "updated_at")
    list_per_page = 20
    fieldsets = (
        (None, {"fields": ("user",)}),
        (
            "Personal Info",
            {
                "fields": (
                    "birth_date",
                    "gender",
                    "emergency_contact",
                    "emergency_phone",
                )
            },
        ),
        ("Preferences", {"fields": ("travel_preferences", "dietary_restrictions")}),
        ("Timestamps", {"fields": ("created_at", "updated_at")}),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("user")

    class Media:
        css = {"all": ("css/admin/profiles.css",)}  # Optional custom CSS


@admin.register(GuideProfile)
class GuideProfileAdmin(admin.ModelAdmin):
    """
    Admin configuration for the GuideProfile model
    """

    list_display = (
        "user",
        "experience_years",
        "is_verified",
        "is_available",
        "average_rating",
        "total_tours",
        "created_at",
    )
    list_filter = ("is_verified", "is_available", "experience_years", "created_at")
    search_fields = ("user__email", "user__first_name", "user__last_name")
    ordering = ("-created_at",)
    readonly_fields = (
        "created_at",
        "updated_at",
        "verification_date",
        "profile_completion",
        "last_active",
        "total_tours",
        "average_rating",
    )
    fieldsets = (
        (None, {"fields": ("user", "is_verified", "verification_date")}),
        (
            "Professional Details",
            {
                "fields": (
                    "experience_years",
                    "hourly_rate",
                    "daily_rate",
                    "work_schedule",
                )
            },
        ),
        ("Locations and Services", {"fields": ("operating_cities", "services")}),
        ("Languages", {"fields": ("languages",)}),
        (
            "Statistics",
            {
                "fields": (
                    "profile_completion",
                    "response_time_hours",
                    "is_available",
                    "last_active",
                    "total_tours",
                    "average_rating",
                )
            },
        ),
        ("Timestamps", {"fields": ("created_at", "updated_at")}),
    )
    filter_horizontal = ("operating_cities", "services", "languages")

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .select_related("user")
            .prefetch_related("operating_cities", "services", "languages")
        )


@admin.register(GuideLanguage)
class GuideLanguageAdmin(admin.ModelAdmin):
    """
    Admin configuration for the GuideLanguage model
    """

    list_display = ("guide", "language", "proficiency", "created_at")
    list_filter = ("proficiency", "created_at")
    search_fields = (
        "guide__email",
        "guide__first_name",
        "guide__last_name",
        "language__name",
    )
    ordering = ("-created_at",)
    readonly_fields = ("created_at", "updated_at")
    list_per_page = 20

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("guide", "language")


@admin.register(Portfolio)
class PortfolioAdmin(admin.ModelAdmin):
    """
    Admin configuration for the Portfolio model
    """

    list_display = ("guide", "title", "order", "created_at")
    list_filter = ("created_at",)
    search_fields = ("guide__email", "guide__first_name", "guide__last_name", "title")
    ordering = ("order", "created_at")
    readonly_fields = ("created_at", "updated_at")
    list_per_page = 20

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("guide")


@admin.register(Favorite)
class FavoriteAdmin(admin.ModelAdmin):
    """
    Admin configuration for the Favorite model
    """

    list_display = ("user", "guide", "city", "created_at")
    list_filter = ("created_at",)
    search_fields = (
        "user__email",
        "user__first_name",
        "user__last_name",
        "guide__email",
        "guide__first_name",
        "guide__last_name",
        "city__name",
    )
    ordering = ("-created_at",)
    readonly_fields = ("created_at", "updated_at")
    list_per_page = 20

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("user", "guide", "city")
