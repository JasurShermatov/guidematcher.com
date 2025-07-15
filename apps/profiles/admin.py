from django.contrib import admin
from .models import (
    ClientProfile,
    CustomerProfile,
    Portfolio,
    VerificationDocument,
    Availability,
)


@admin.register(ClientProfile)
class ClientProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "date_of_birth", "preferred_contact")
    search_fields = ("user__username", "user__email")
    list_filter = ("preferred_contact",)
    autocomplete_fields = ["user", "languages"]


@admin.register(CustomerProfile)
class CustomerProfileAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "city",
        "is_available",
        "verification_status",
        "average_rating",
    )
    search_fields = ("user__username", "user__email", "city__name")
    list_filter = ("city", "is_available", "verification_status")
    autocomplete_fields = ["user", "languages", "service_types", "city"]


@admin.register(Portfolio)
class PortfolioAdmin(admin.ModelAdmin):
    list_display = ("customer", "title", "order")
    search_fields = ("title", "customer__user__username")
    list_filter = ("customer",)
    autocomplete_fields = ["customer"]


@admin.register(VerificationDocument)
class VerificationDocumentAdmin(admin.ModelAdmin):
    list_display = (
        "customer",
        "document_type",
        "is_verified",
        "verified_by",
        "verified_at",
    )
    search_fields = ("customer__user__username", "document_type")
    list_filter = ("document_type", "is_verified")
    autocomplete_fields = ["customer", "verified_by"]


@admin.register(Availability)
class AvailabilityAdmin(admin.ModelAdmin):
    list_display = ("customer", "date", "is_available", "start_time", "end_time")
    search_fields = ("customer__user__username",)
    list_filter = ("is_available", "date")
    autocomplete_fields = ["customer"]
