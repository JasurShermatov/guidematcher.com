# apps/bookings/admin.py

from django.contrib import admin
from .models import Booking, BookingRequest, BookingUpdate


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "client",
        "guide",
        "service",
        "title",
        "start_date",
        "end_date",
        "status",
        "total_amount",
        "is_paid",
        "created_at",
    )
    list_filter = ("status", "is_paid", "duration_type", "created_at")
    search_fields = ("title", "client__email", "guide__email")
    date_hierarchy = "start_date"
    ordering = ("-created_at",)
    readonly_fields = (
        "created_at",
        "updated_at",
        "confirmed_at",
        "started_at",
        "completed_at",
        "cancelled_at",
    )
    list_per_page = 20

    def get_queryset(self, request):
        return (
            super().get_queryset(request).select_related("client", "guide", "service")
        )

    class Media:
        css = {"all": ("css/admin/bookings.css",)}  # Optional custom CSS


@admin.register(BookingRequest)
class BookingRequestAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "client",
        "guide",
        "requested_service",
        "requested_date",
        "status",
        "expires_at",
        "created_at",
    )
    list_filter = ("status", "created_at")
    search_fields = ("client__email", "guide__email", "requested_service__name")
    date_hierarchy = "requested_date"
    ordering = ("-created_at",)
    readonly_fields = ("created_at", "updated_at", "responded_at", "expires_at")
    list_per_page = 20

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .select_related("client", "guide", "requested_service")
        )


@admin.register(BookingUpdate)
class BookingUpdateAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "booking",
        "updated_by",
        "old_status",
        "new_status",
        "created_at",
    )
    list_filter = ("new_status", "created_at")
    search_fields = ("booking__title", "updated_by__email")
    date_hierarchy = "created_at"
    ordering = ("-created_at",)
    readonly_fields = ("created_at", "updated_at")
    list_per_page = 20

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("booking", "updated_by")
