from django.contrib import admin
from .models import ChatRoom, Message, MessageAttachment


@admin.register(ChatRoom)
class ChatRoomAdmin(admin.ModelAdmin):
    """
    Admin configuration for the ChatRoom model
    """

    list_display = ("client", "guide", "is_active", "last_message_at", "created_at")
    list_filter = ("is_active", "created_at", "last_message_at")
    search_fields = (
        "client__email",
        "client__first_name",
        "client__last_name",
        "guide__email",
        "guide__first_name",
        "guide__last_name",
    )
    ordering = ("-last_message_at",)
    readonly_fields = ("created_at", "updated_at", "last_message_at")
    list_per_page = 20
    fieldsets = (
        (None, {"fields": ("client", "guide", "is_active")}),
        ("Timestamps", {"fields": ("created_at", "updated_at", "last_message_at")}),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("client", "guide")


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    """
    Admin configuration for the Message model
    """

    list_display = ("room", "sender", "message_type", "is_read", "created_at")
    list_filter = ("message_type", "is_read", "created_at")
    search_fields = (
        "room__client__email",
        "room__guide__email",
        "sender__email",
        "content",
    )
    ordering = ("-created_at",)
    readonly_fields = ("created_at", "updated_at", "read_at")
    list_per_page = 20
    fieldsets = (
        (
            None,
            {
                "fields": (
                    "room",
                    "sender",
                    "message_type",
                    "content",
                    "file_url",
                    "file_name",
                    "file_size",
                    "booking_request",
                )
            },
        ),
        ("Status", {"fields": ("is_read", "read_at")}),
        ("Timestamps", {"fields": ("created_at", "updated_at")}),
    )

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .select_related("room", "sender", "booking_request")
        )


@admin.register(MessageAttachment)
class MessageAttachmentAdmin(admin.ModelAdmin):
    """
    Admin configuration for the MessageAttachment model
    """

    list_display = ("message", "file_name", "file_size", "content_type", "created_at")
    list_filter = ("content_type", "created_at")
    search_fields = ("file_name", "message__content")
    ordering = ("-created_at",)
    readonly_fields = ("created_at", "updated_at")
    list_per_page = 20
    fieldsets = (
        (
            None,
            {
                "fields": (
                    "message",
                    "file_url",
                    "file_name",
                    "file_size",
                    "content_type",
                )
            },
        ),
        ("Timestamps", {"fields": ("created_at", "updated_at")}),
    )

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .select_related("message__room", "message__sender")
        )
