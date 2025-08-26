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
    # Agar Booking modelida conversation yo'q bo'lsa, uni callable qilib qo'yamiz
    readonly_fields = ("get_conversation", "booked_days_display")
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
            {"fields": ("client_profile", "customer_profile", "get_conversation")},
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

    # ------------------------
    # Custom methods
    # ------------------------
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

    def get_conversation(self, obj):
        # Agar Booking modelida conversation field mavjud bo'lmasa, uni shunday ko'rsatamiz
        return getattr(obj, "conversation", "—")

    get_conversation.short_description = "Conversation"
