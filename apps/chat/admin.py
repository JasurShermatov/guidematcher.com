from django.contrib import admin
from .models import ChatRoom, Message, MessageRead, UserTypingStatus


@admin.register(ChatRoom)
class ChatRoomAdmin(admin.ModelAdmin):
    list_display = ("id", "room_type", "is_active", "booking", "updated_at")
    list_filter = ("room_type", "is_active", "booking")
    search_fields = (
        "id",
        "booking__title",
        "participants__email",
        "participants__first_name",
        "participants__last_name",
    )
    autocomplete_fields = ["participants", "booking"]
    readonly_fields = ("created_at", "updated_at")
    ordering = ("-updated_at",)
    filter_horizontal = ("participants",)


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "room",
        "sender",
        "message_type",
        "is_edited",
        "is_deleted",
        "created_at",
    )
    list_filter = ("message_type", "is_edited", "is_deleted", "created_at", "room")
    search_fields = (
        "text",
        "sender__email",
        "sender__first_name",
        "sender__last_name",
        "room__id",
    )
    autocomplete_fields = ["room", "sender", "reply_to"]
    readonly_fields = ("created_at", "updated_at", "edited_at", "deleted_at")
    ordering = ("-created_at",)


@admin.register(MessageRead)
class MessageReadAdmin(admin.ModelAdmin):
    list_display = ("id", "message", "user", "read_at")
    list_filter = ("user", "read_at")
    search_fields = (
        "message__text",
        "user__email",
        "user__first_name",
        "user__last_name",
    )
    autocomplete_fields = ["message", "user"]
    readonly_fields = ("read_at", "created_at", "updated_at")
    ordering = ("-read_at",)


@admin.register(UserTypingStatus)
class UserTypingStatusAdmin(admin.ModelAdmin):
    list_display = ("id", "room", "user", "is_typing", "last_typed_at")
    list_filter = ("is_typing", "last_typed_at", "room", "user")
    search_fields = ("room__id", "user__email", "user__first_name", "user__last_name")
    autocomplete_fields = ["room", "user"]
    readonly_fields = ("last_typed_at",)
    ordering = ("-last_typed_at",)
