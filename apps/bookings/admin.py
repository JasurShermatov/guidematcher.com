from django.contrib import admin
from apps.bookings.models import Booking
from django.utils.html import format_html


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "client_name",
        "customer_name",
        "title",
        "service_type",
        "start_date",
        "end_date",
        "status_badge",
        "number_of_people",
        "created_at",
    )
    list_filter = ("status", "service_type", "start_date", "end_date")
    search_fields = (
        "title",
        "client_profile__user__first_name",
        "client_profile__user__last_name",
        "customer_profile__user__first_name",
        "customer_profile__user__last_name",
    )
    readonly_fields = ("conversation", "booked_days_display")
    ordering = ("-created_at",)

    fieldsets = (
        (
            "Basic info",
            {
                "fields": (
                    "title",
                    "description",
                    "service_type",
                    "status",
                    "special_requirements",
                )
            },
        ),
        (
            "Client / Customer",
            {"fields": ("client_profile", "customer_profile", "conversation")},
        ),
        (
            "Schedule",
            {
                "fields": (
                    "start_date",
                    "end_date",
                    "start_time",
                    "duration_hours",
                    "number_of_people",
                    "booked_days_display",
                )
            },
        ),
        (
            "Location",
            {"fields": ("location", "location_details", "latitude", "longitude")},
        ),
        ("Payment", {"fields": ("proposed_rate", "rate_type", "currency")}),
    )

    def client_name(self, obj):
        return (
            obj.client_profile.user.full_name if obj.client_profile else "Self-booking"
        )

    client_name.short_description = "Client"

    def customer_name(self, obj):
        return obj.customer_profile.user.full_name

    customer_name.short_description = "Customer"

    def status_badge(self, obj):
        colors = {
            "pending": "orange",
            "accepted": "green",
            "cancelled": "red",
            "completed": "blue",
            "expired": "gray",
        }
        color = colors.get(obj.status, "black")
        return format_html(
            '<span style="color: {};"><strong>{}</strong></span>',
            color,
            obj.get_status_display(),
        )

    status_badge.short_description = "Status"

    def booked_days_display(self, obj):
        return ", ".join([str(day) for day in obj.booked_days])

    booked_days_display.short_description = "Booked Days"
