from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
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
    search_fields = ("user__first_name", "user__email")
    list_filter = ("preferred_contact",)
    autocomplete_fields = ["user", "languages"]
    ordering = ("user__first_name",)


@admin.register(CustomerProfile)
class CustomerProfileAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "city",
        "is_available",
        "verification_status",
        "average_rating",
    )
    search_fields = ("user__first_name", "user__email", "city__name")
    list_filter = ("city", "is_available", "verification_status")
    autocomplete_fields = ["user", "languages", "service_types", "city"]
    ordering = ("-average_rating",)


@admin.register(Portfolio)
class PortfolioAdmin(admin.ModelAdmin):
    list_display = ("linked_customer", "title", "order")
    search_fields = ("title", "customer__user__first_name")
    list_filter = ("customer",)
    autocomplete_fields = ["customer"]
    ordering = ("order",)

    def linked_customer(self, obj):
        url = reverse("admin:profiles_customerprofile_change", args=[obj.customer.id])
        return format_html('<a href="{}">{}</a>', url, obj.customer.user.email)

    linked_customer.short_description = "Customer"


@admin.register(VerificationDocument)
class VerificationDocumentAdmin(admin.ModelAdmin):
    list_display = (
        "linked_customer",
        "document_type",
        "is_verified",
        "linked_verified_by",
        "verified_at",
    )
    search_fields = ("customer__user__first_name", "document_type")
    list_filter = ("document_type", "is_verified")
    autocomplete_fields = ["customer", "verified_by"]
    ordering = ("-verified_at",)

    def linked_customer(self, obj):
        url = reverse("admin:profiles_customerprofile_change", args=[obj.customer.id])
        return format_html('<a href="{}">{}</a>', url, obj.customer.user.email)

    linked_customer.short_description = "Customer"

    def linked_verified_by(self, obj):
        if obj.verified_by:
            url = reverse("admin:users_user_change", args=[obj.verified_by.id])
            return format_html('<a href="{}">{}</a>', url, obj.verified_by.email)
        return "-"

    linked_verified_by.short_description = "Verified By"


@admin.register(Availability)
class AvailabilityAdmin(admin.ModelAdmin):
    list_display = ("customer", "date", "is_available", "start_time", "end_time")
    search_fields = ("customer__user__first_name",)
    list_filter = ("is_available", "date")
    autocomplete_fields = ["customer"]
    ordering = ("-date",)
