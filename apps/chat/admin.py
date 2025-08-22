from django.contrib import admin
from .models import Conversation, Message, BlockedUser


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ("id", "user1", "user2", "created_at", "updated_at")
    search_fields = ("user1__full_name", "user2__full_name")
    list_filter = ("created_at", "updated_at")
    ordering = ("-updated_at",)


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "conversation",
        "sender",
        "content_preview",
        "is_read",
        "deleted_for",
        "created_at",
    )
    search_fields = ("content", "sender__full_name")
    list_filter = ("is_read", "deleted_for", "created_at")
    ordering = ("-created_at",)

    def content_preview(self, obj):
        return obj.content[:40] + ("..." if len(obj.content) > 40 else "")

    content_preview.short_description = "Message"


@admin.register(BlockedUser)
class BlockedUserAdmin(admin.ModelAdmin):
    list_display = ("id", "blocker", "blocked", "created_at")
    search_fields = ("blocker__full_name", "blocked__full_name")
    list_filter = ("created_at",)
    ordering = ("-created_at",)
