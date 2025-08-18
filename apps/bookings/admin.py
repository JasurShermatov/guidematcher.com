from django.contrib import admin, messages
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from rangefilter.filters import DateRangeFilter

from .models import Booking, BookingMessage


class BookingMessageInline(admin.TabularInline):
    model = BookingMessage
    extra = 0
    fields = ("created_at", "sender", "message", "is_system_message")
    readonly_fields = fields
    ordering = ("created_at",)
    verbose_name_plural = _("Booking messages (read only)")
    can_delete = False
    show_change_link = False


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "title",
        "client",
        "get_customer_name",
        "service_type",
        "start_date",
        "end_date",
        "rate_type",
        "currency",
        "status",
        "proposed_rate",
        "created_at",
    )
    list_filter = (
        "status",
        "rate_type",
        "service_type",
        "currency",
        ("start_date", DateRangeFilter),
        ("created_at", DateRangeFilter),
    )
    search_fields = (
        "title",
        "description",
        "client__first_name",
        "client__last_name",
        "client__email",
        "customer__user__first_name",
        "customer__user__last_name",
        "customer__user__email",
        "location",
        "location_details",
    )
    autocomplete_fields = ["client", "customer", "service_type", "cancelled_by"]
    readonly_fields = (
        "created_at",
        "updated_at",
        "responded_at",
        "accepted_at",
        "completed_at",
        "cancelled_at",
    )
    inlines = [BookingMessageInline]
    ordering = ("-created_at",)

    fieldsets = (
        (
            _("Basic Info"),
            {"fields": ("title", "description", "service_type", "client", "customer")},
        ),
        (
            _("Schedule"),
            {
                "fields": (
                    ("start_date", "end_date"),
                    ("start_time", "duration_hours"),
                    "number_of_people",
                    "special_requirements",
                )
            },
        ),
        (
            _("Location"),
            {
                "classes": ("collapse",),
                "fields": (("location", "location_details"), ("latitude", "longitude")),
            },
        ),
        (
            _("Pricing"),
            {
                "fields": (
                    ("proposed_rate", "counter_offer_rate"),
                    ("rate_type", "currency"),
                )
            },
        ),
        (
            _("Status & Response"),
            {
                "fields": (
                    "status",
                    "provider_response",
                    "responded_at",
                    "accepted_at",
                    "completed_at",
                )
            },
        ),
        (
            _("Cancellation"),
            {"fields": ("cancelled_at", "cancelled_by", "cancellation_reason")},
        ),
        (
            _("System Meta"),
            {"classes": ("collapse",), "fields": ("created_at", "updated_at")},
        ),
    )

    actions = [
        "mark_as_accepted",
        "mark_as_rejected",
        "mark_as_completed",
        "mark_as_cancelled",
    ]

    @admin.display(description=_("Customer"))
    def get_customer_name(self, obj):
        if obj.customer and obj.customer.user:
            return f"{obj.customer.user.first_name} {obj.customer.user.last_name}"
        return "-"

    # --- Actions ---
    @admin.action(description=_("Mark selected bookings as Accepted"))
    def mark_as_accepted(self, request, queryset):
        updated = queryset.filter(status=Booking.BookingStatus.PENDING).update(
            status=Booking.BookingStatus.ACCEPTED, accepted_at=timezone.now()
        )
        self.message_user(
            request, _("%d booking(s) marked as accepted.") % updated, messages.SUCCESS
        )

    @admin.action(description=_("Mark selected bookings as Rejected"))
    def mark_as_rejected(self, request, queryset):
        updated = queryset.filter(status=Booking.BookingStatus.PENDING).update(
            status=Booking.BookingStatus.REJECTED, responded_at=timezone.now()
        )
        self.message_user(
            request, _("%d booking(s) marked as rejected.") % updated, messages.WARNING
        )

    @admin.action(description=_("Mark selected bookings as Completed"))
    def mark_as_completed(self, request, queryset):
        updated = queryset.filter(status=Booking.BookingStatus.ACCEPTED).update(
            status=Booking.BookingStatus.COMPLETED, completed_at=timezone.now()
        )
        self.message_user(
            request, _("%d booking(s) marked as completed.") % updated, messages.SUCCESS
        )

    @admin.action(description=_("Mark selected bookings as Cancelled"))
    def mark_as_cancelled(self, request, queryset):
        updated = queryset.filter(
            status__in=[Booking.BookingStatus.PENDING, Booking.BookingStatus.ACCEPTED]
        ).update(status=Booking.BookingStatus.CANCELLED, cancelled_at=timezone.now())
        self.message_user(
            request, _("%d booking(s) marked as cancelled.") % updated, messages.ERROR
        )


@admin.register(BookingMessage)
class BookingMessageAdmin(admin.ModelAdmin):
    list_display = ("id", "booking", "sender", "created_at", "is_system_message")
    list_filter = (
        "is_system_message",
        ("created_at", DateRangeFilter),
        "sender",
        "booking",
    )
    search_fields = (
        "message",
        "sender__first_name",
        "sender__last_name",
        "sender__email",
        "booking__title",
    )
    readonly_fields = ("created_at", "updated_at")
    autocomplete_fields = ["booking", "sender"]
    ordering = ("-created_at",)
