from django.contrib import admin
from .models import Dispute


@admin.register(Dispute)
class DisputeAdmin(admin.ModelAdmin):
    """
    Admin configuration for the Dispute model
    """

    list_display = (
        "id",
        "booking",
        "client",
        "guide",
        "status",
        "created_at",
        "resolved_at",
    )
    list_filter = ("status", "created_at", "resolved_at")
    search_fields = (
        "booking__id",
        "client__email",
        "client__first_name",
        "client__last_name",
        "guide__email",
        "guide__first_name",
        "guide__last_name",
        "resolver__email",
        "reason",
    )
    ordering = ("-created_at",)
    readonly_fields = ("created_at", "updated_at", "resolved_at")
    list_per_page = 20
    fieldsets = (
        (
            None,
            {"fields": ("booking", "client", "guide", "initiator", "reason", "status")},
        ),
        ("Resolution", {"fields": ("resolver", "resolution_details", "resolved_at")}),
        ("Timestamps", {"fields": ("created_at", "updated_at")}),
    )

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .select_related("booking", "client", "guide", "resolver", "chat_room")
        )
