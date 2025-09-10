# apps/profiles/admin.py
from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse

from .models import (
    ClientProfile,
    CustomerProfile,
    Portfolio,
    VerificationDocument,
    Unavailability,
)


@admin.register(ClientProfile)
class ClientProfileAdmin(admin.ModelAdmin):
    list_display = (
        "get_user_email",
        "get_user_full_name",
        "get_user_country",
        "date_of_birth",
        "preferred_contact",
        "get_user_role",
    )
    search_fields = (
        "user__first_name",
        "user__last_name",
        "user__email",
        "user__country__name",
    )
    list_filter = (
        "preferred_contact",
        "user__country",
        "user__is_verified",
        "user__is_active",
    )
    autocomplete_fields = ["user", "languages"]
    ordering = ("user__first_name",)

    fieldsets = (
        (
            "User Information",
            {
                "fields": ("user", "get_user_details"),
                "description": "Basic user information",
            },
        ),
        (
            "Profile Information",
            {"fields": ("date_of_birth", "preferred_contact", "languages", "avatar")},
        ),
    )
    readonly_fields = ("get_user_details",)
    filter_horizontal = ("languages",)

    def get_user_email(self, obj):
        return obj.user.email

    get_user_email.short_description = "Email"
    get_user_email.admin_order_field = "user__email"

    def get_user_full_name(self, obj):
        return obj.user.full_name

    get_user_full_name.short_description = "Full Name"
    get_user_full_name.admin_order_field = "user__first_name"

    def get_user_country(self, obj):
        return obj.user.country_name if obj.user.country_name else "-"

    get_user_country.short_description = "Country"
    get_user_country.admin_order_field = "user__country__name"

    def get_user_role(self, obj):
        return obj.user.get_role_display()

    get_user_role.short_description = "Role"
    get_user_role.admin_order_field = "user__role"

    def get_user_details(self, obj):
        if obj.user:
            return format_html(
                """
                <div style="background: #f8f9fa; padding: 10px; border-radius: 5px;">
                    <strong>Email:</strong> {}<br>
                    <strong>Name:</strong> {} {}<br>
                    <strong>Country:</strong> {}<br>
                    <strong>Role:</strong> {}<br>
                    <strong>Verified:</strong> {}<br>
                    <strong>Active:</strong> {}<br>
                    <strong>Joined:</strong> {}
                </div>
                """,
                obj.user.email,
                obj.user.first_name,
                obj.user.last_name,
                obj.user.country_name or "Not specified",
                obj.user.get_role_display(),
                "✅" if obj.user.is_verified else "❌",
                "✅" if obj.user.is_active else "❌",
                obj.user.date_joined.strftime("%Y-%m-%d %H:%M"),
            )
        return "No user assigned"

    get_user_details.short_description = "User Details"


@admin.register(CustomerProfile)
class CustomerProfileAdmin(admin.ModelAdmin):
    list_display = (
        "get_user_email",
        "get_user_full_name",
        "city",
        "is_available",
        "verification_status",
        "average_rating",
        "total_bookings",
    )
    search_fields = ("user__first_name", "user__last_name", "user__email", "city__name")
    list_filter = ("city", "is_available", "verification_status", "user__country")
    autocomplete_fields = ["user", "languages", "service_types", "city"]
    ordering = ("-average_rating",)

    fieldsets = (
        ("User Information", {"fields": ("user", "get_user_details")}),
        (
            "Professional Information",
            {
                "fields": (
                    "professional_bio",
                    "years_of_experience",
                    "service_types",
                    "languages",
                    "avatar",
                )
            },
        ),
        (
            "Location & Service",
            {
                "fields": (
                    "city",
                    "service_areas",
                    "hourly_rate",
                    "daily_rate",
                    "currency",
                    "is_available",
                )
            },
        ),
        (
            "Verification",
            {
                "fields": (
                    "verification_status",
                    "verification_date",
                    "verification_notes",
                )
            },
        ),
        (
            "Statistics",
            {"fields": ("total_bookings", "total_reviews", "average_rating")},
        ),
    )
    readonly_fields = ("get_user_details",)
    filter_horizontal = ("languages", "service_types")

    def get_user_email(self, obj):
        return obj.user.email

    get_user_email.short_description = "Email"

    def get_user_full_name(self, obj):
        return obj.user.full_name

    get_user_full_name.short_description = "Full Name"

    def get_user_details(self, obj):
        if obj.user:
            return format_html(
                """
                <div style="background: #f8f9fa; padding: 10px; border-radius: 5px;">
                    <strong>Email:</strong> {}<br>
                    <strong>Name:</strong> {} {}<br>
                    <strong>Country:</strong> {}<br>
                    <strong>Role:</strong> {}<br>
                    <strong>Verified:</strong> {}<br>
                    <strong>Active:</strong> {}<br>
                    <strong>Joined:</strong> {}
                </div>
                """,
                obj.user.email,
                obj.user.first_name,
                obj.user.last_name,
                obj.user.country_name or "Not specified",
                obj.user.get_role_display(),
                "✅" if obj.user.is_verified else "❌",
                "✅" if obj.user.is_active else "❌",
                obj.user.date_joined.strftime("%Y-%m-%d %H:%M"),
            )
        return "No user assigned"

    get_user_details.short_description = "User Details"


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


@admin.register(Unavailability)
class UnavailabilityAdmin(admin.ModelAdmin):
    list_display = ("customer", "start_date", "end_date", "reason")
    search_fields = ("customer__user__first_name", "customer__user__last_name")
    list_filter = ("start_date", "end_date")
    autocomplete_fields = ["customer"]
    ordering = ("-start_date",)
