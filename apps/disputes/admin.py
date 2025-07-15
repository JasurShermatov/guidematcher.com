from django.contrib import admin
from .models import Dispute, DisputeEvidence, DisputeMessage, DisputeAction


@admin.register(Dispute)
class DisputeAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "status",
        "priority",
        "reporter",
        "respondent",
        "assigned_to",
        "created_at",
    )
    list_filter = ("status", "priority", "dispute_type", "assigned_to")
    search_fields = (
        "title",
        "description",
        "reporter__username",
        "respondent__username",
    )
    readonly_fields = ("created_at", "updated_at")
    ordering = ("-created_at",)
    autocomplete_fields = ["reporter", "respondent", "assigned_to", "booking"]


@admin.register(DisputeEvidence)
class DisputeEvidenceAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "evidence_type",
        "dispute",
        "submitted_by",
        "is_verified",
        "verified_by",
        "created_at",
    )
    list_filter = ("evidence_type", "is_verified", "verified_by")
    search_fields = ("title", "description", "submitted_by__username")
    readonly_fields = ("created_at", "updated_at", "file_size")
    autocomplete_fields = ["dispute", "submitted_by", "verified_by"]


@admin.register(DisputeMessage)
class DisputeMessageAdmin(admin.ModelAdmin):
    list_display = ("dispute", "sender", "is_internal", "created_at")
    list_filter = ("is_internal", "sender")
    search_fields = ("message", "sender__username")
    readonly_fields = ("created_at", "updated_at")
    autocomplete_fields = ["dispute", "sender", "attachments"]


@admin.register(DisputeAction)
class DisputeActionAdmin(admin.ModelAdmin):
    list_display = (
        "dispute",
        "action_type",
        "performed_by",
        "old_value",
        "new_value",
        "created_at",
    )
    list_filter = ("action_type", "performed_by")
    search_fields = ("description", "performed_by__username")
    readonly_fields = ("created_at", "updated_at")
    autocomplete_fields = ["dispute", "performed_by"]
