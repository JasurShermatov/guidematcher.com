# apps/chat/admin.py
from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import ChatRoom, Message, MessageRead, UserTypingStatus


# ══════════════════════════════════════════════════════════════════════
# OPTIMIZED CHAT ROOM ADMIN
# ══════════════════════════════════════════════════════════════════════


@admin.register(ChatRoom)
class ChatRoomAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "room_type",
        "participants_count",
        "booking_link",
        "is_active",
        "total_messages",
        "last_message_preview_short",
        "last_activity_at",
        "created_at",
    )
    list_filter = (
        "room_type",
        "is_active",
        "created_at",
        "last_activity_at",
        "booking__status",
    )
    search_fields = (
        "id",
        "booking__title",
        "participants__email",
        "participants__first_name",
        "participants__last_name",
        "last_message_preview",
    )
    autocomplete_fields = ["participants", "booking"]
    readonly_fields = (
        "created_at",
        "updated_at",
        "last_activity_at",
        "total_messages",
        "last_message_at",
        "last_message_preview",
        "last_message_type",
        "last_message_sender_id",
        "unread_counts_display",
        "room_statistics",
    )
    ordering = ("-last_activity_at",)
    filter_horizontal = ("participants",)

    fieldsets = (
        (
            "Basic Info",
            {"fields": ("room_type", "participants", "booking", "is_active")},
        ),
        (
            "Denormalized Stats",
            {
                "fields": (
                    "total_messages",
                    "last_message_at",
                    "last_message_preview",
                    "last_message_type",
                    "last_message_sender_id",
                    "last_activity_at",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            "Unread Counts",
            {"fields": ("unread_counts_display",), "classes": ("collapse",)},
        ),
        ("Statistics", {"fields": ("room_statistics",), "classes": ("collapse",)}),
        (
            "Timestamps",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def participants_count(self, obj):
        """Show participant count."""
        count = obj.participants.count()
        return format_html('<span style="color: blue;">{} users</span>', count)

    participants_count.short_description = "Participants"

    def booking_link(self, obj):
        """Link to related booking."""
        if obj.booking:
            url = reverse("admin:bookings_booking_change", args=[obj.booking.pk])
            return format_html(
                '<a href="{}" target="_blank">{}</a>', url, obj.booking.title[:30]
            )
        return "-"

    booking_link.short_description = "Booking"

    def last_message_preview_short(self, obj):
        """Short preview of last message."""
        if obj.last_message_preview:
            preview = obj.last_message_preview[:50]
            return format_html(
                '<span title="{}">{}</span>',
                obj.last_message_preview,
                preview + "..." if len(obj.last_message_preview) > 50 else preview,
            )
        return "-"

    last_message_preview_short.short_description = "Last Message"

    def unread_counts_display(self, obj):
        """Display unread counts in readable format."""
        if not obj.unread_counts:
            return "No unread messages"

        html_parts = []
        for user_id, count in obj.unread_counts.items():
            if count > 0:
                try:
                    from apps.users.models import User

                    user = User.objects.get(id=user_id)
                    html_parts.append(
                        f"<li><strong>{user.get_full_name()}</strong>: {count} unread</li>"
                    )
                except User.DoesNotExist:
                    html_parts.append(f"<li>User {user_id}: {count} unread</li>")

        if html_parts:
            return mark_safe("<ul>" + "".join(html_parts) + "</ul>")
        return "All messages read"

    unread_counts_display.short_description = "Unread Counts"

    def room_statistics(self, obj):
        """Room statistics."""
        if obj.pk:
            stats = {
                "Total Messages": obj.total_messages,
                "Read Receipts": MessageRead.objects.filter(message__room=obj).count(),
                "Images Sent": obj.messages.filter(
                    message_type=Message.MessageType.IMAGE
                ).count(),
                "Files Sent": obj.messages.filter(
                    message_type=Message.MessageType.FILE
                ).count(),
                "Active Typers": UserTypingStatus.objects.filter(
                    room=obj, is_typing=True
                ).count(),
            }

            html_parts = []
            for label, value in stats.items():
                html_parts.append(f"<li><strong>{label}:</strong> {value}</li>")

            return mark_safe("<ul>" + "".join(html_parts) + "</ul>")
        return "Save to see statistics"

    room_statistics.short_description = "Room Statistics"

    def get_queryset(self, request):
        """Optimize admin queryset."""
        qs = super().get_queryset(request)
        return qs.select_related("booking").prefetch_related("participants")

    actions = ["recalculate_room_stats", "cleanup_empty_rooms"]

    def recalculate_room_stats(self, request, queryset):
        """Recalculate denormalized statistics."""
        updated = 0
        for room in queryset:
            # Recalculate total messages
            actual_count = room.messages.filter(is_deleted=False).count()
            if room.total_messages != actual_count:
                room.total_messages = actual_count
                room.save(update_fields=["total_messages"])
                updated += 1

        self.message_user(request, f"Updated {updated} rooms")

    recalculate_room_stats.short_description = "Recalculate room statistics"

    def cleanup_empty_rooms(self, request, queryset):
        """Cleanup rooms with no messages."""
        empty_rooms = queryset.filter(total_messages=0)
        count = empty_rooms.count()
        empty_rooms.delete()
        self.message_user(request, f"Deleted {count} empty rooms")

    cleanup_empty_rooms.short_description = "Delete empty rooms"


# ══════════════════════════════════════════════════════════════════════
# OPTIMIZED MESSAGE ADMIN
# ══════════════════════════════════════════════════════════════════════


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "room_link",
        "sender_link",
        "message_type",
        "text_preview",
        "read_count",
        "replies_count",
        "is_edited",
        "is_deleted",
        "created_at",
    )
    list_filter = (
        "message_type",
        "is_edited",
        "is_deleted",
        "created_at",
        "room__room_type",
        "sender__role",
    )
    search_fields = (
        "text",
        "sender__email",
        "sender__first_name",
        "sender__last_name",
        "room__id",
        "file_name",
    )
    autocomplete_fields = ["room", "sender", "reply_to"]
    readonly_fields = (
        "created_at",
        "updated_at",
        "edited_at",
        "deleted_at",
        "read_count",
        "replies_count",
        "message_statistics",
    )
    ordering = ("-created_at",)
    date_hierarchy = "created_at"

    fieldsets = (
        ("Basic Info", {"fields": ("room", "sender", "message_type")}),
        ("Content", {"fields": ("text", "image", "file", "file_name", "file_size")}),
        (
            "Location",
            {
                "fields": ("latitude", "longitude", "location_name"),
                "classes": ("collapse",),
            },
        ),
        (
            "Threading",
            {"fields": ("reply_to", "replies_count"), "classes": ("collapse",)},
        ),
        (
            "Statistics",
            {"fields": ("read_count", "message_statistics"), "classes": ("collapse",)},
        ),
        (
            "Status",
            {
                "fields": ("is_edited", "edited_at", "is_deleted", "deleted_at"),
                "classes": ("collapse",),
            },
        ),
        (
            "Timestamps",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def room_link(self, obj):
        """Link to room admin."""
        if obj.room:
            url = reverse("admin:chat_chatroom_change", args=[obj.room.pk])
            return format_html(
                '<a href="{}" target="_blank">{}</a>',
                url,
                f"Room {str(obj.room.id)[:8]}...",
            )
        return "-"

    room_link.short_description = "Room"

    def sender_link(self, obj):
        """Link to sender admin."""
        if obj.sender:
            url = reverse("admin:users_user_change", args=[obj.sender.pk])
            return format_html(
                '<a href="{}" target="_blank">{}</a>', url, obj.sender.get_full_name()
            )
        return "System"

    sender_link.short_description = "Sender"

    def text_preview(self, obj):
        """Preview of message text."""
        if obj.message_type == Message.MessageType.TEXT and obj.text:
            preview = obj.text[:60]
            return format_html(
                '<span title="{}">{}</span>',
                obj.text,
                preview + "..." if len(obj.text) > 60 else preview,
            )
        elif obj.message_type == Message.MessageType.IMAGE:
            return "📷 Image"
        elif obj.message_type == Message.MessageType.FILE:
            return f"📎 {obj.file_name or 'File'}"
        elif obj.message_type == Message.MessageType.LOCATION:
            return f"📍 {obj.location_name or 'Location'}"
        elif obj.message_type == Message.MessageType.AUDIO:
            return "🎵 Audio"
        elif obj.message_type == Message.MessageType.VIDEO:
            return "🎥 Video"
        return obj.get_message_type_display()

    text_preview.short_description = "Content"

    def message_statistics(self, obj):
        """Message-specific statistics."""
        if obj.pk:
            stats = {
                "Read by": obj.read_receipts.count(),
                "Replies": obj.replies.count(),
                "File size": f"{obj.file_size} bytes" if obj.file_size else "N/A",
            }

            html_parts = []
            for label, value in stats.items():
                html_parts.append(f"<li><strong>{label}:</strong> {value}</li>")

            return mark_safe("<ul>" + "".join(html_parts) + "</ul>")
        return "Save to see statistics"

    message_statistics.short_description = "Message Statistics"

    def get_queryset(self, request):
        """Optimize admin queryset."""
        qs = super().get_queryset(request)
        return qs.select_related("sender", "room", "reply_to")

    actions = ["recalculate_message_stats", "bulk_delete_messages"]

    def recalculate_message_stats(self, request, queryset):
        """Recalculate message read counts."""
        updated = 0
        for message in queryset:
            actual_read_count = message.read_receipts.count()
            actual_replies_count = message.replies.count()

            if (
                message.read_count != actual_read_count
                or message.replies_count != actual_replies_count
            ):
                message.read_count = actual_read_count
                message.replies_count = actual_replies_count
                message.save(update_fields=["read_count", "replies_count"])
                updated += 1

        self.message_user(request, f"Updated {updated} messages")

    recalculate_message_stats.short_description = "Recalculate message statistics"

    def bulk_delete_messages(self, request, queryset):
        """Soft delete messages."""
        from django.utils import timezone

        count = queryset.filter(is_deleted=False).update(
            is_deleted=True, deleted_at=timezone.now()
        )
        self.message_user(request, f"Soft deleted {count} messages")

    bulk_delete_messages.short_description = "Soft delete selected messages"


# ══════════════════════════════════════════════════════════════════════
# MESSAGE READ ADMIN
# ══════════════════════════════════════════════════════════════════════


@admin.register(MessageRead)
class MessageReadAdmin(admin.ModelAdmin):
    list_display = ("id", "message_link", "user_link", "read_at")
    list_filter = (
        "read_at",
        "user__role",
        "message__message_type",
        "message__room__room_type",
    )
    search_fields = (
        "message__text",
        "user__email",
        "user__first_name",
        "user__last_name",
    )
    autocomplete_fields = ["message", "user"]
    readonly_fields = ("read_at", "created_at", "updated_at")
    ordering = ("-read_at",)
    date_hierarchy = "read_at"

    def message_link(self, obj):
        """Link to message."""
        url = reverse("admin:chat_message_change", args=[obj.message.pk])
        return format_html(
            '<a href="{}" target="_blank">Message {}</a>', url, str(obj.message.id)[:8]
        )

    message_link.short_description = "Message"

    def user_link(self, obj):
        """Link to user."""
        url = reverse("admin:users_user_change", args=[obj.user.pk])
        return format_html(
            '<a href="{}" target="_blank">{}</a>', url, obj.user.get_full_name()
        )

    user_link.short_description = "User"

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related("user", "message__sender")


# ══════════════════════════════════════════════════════════════════════
# TYPING STATUS ADMIN
# ══════════════════════════════════════════════════════════════════════


@admin.register(UserTypingStatus)
class UserTypingStatusAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "room_link",
        "user_link",
        "is_typing_display",
        "last_typed_at",
    )
    list_filter = ("is_typing", "last_typed_at", "room__room_type", "user__role")
    search_fields = ("room__id", "user__email", "user__first_name", "user__last_name")
    autocomplete_fields = ["room", "user"]
    readonly_fields = ("last_typed_at",)
    ordering = ("-last_typed_at",)
    date_hierarchy = "last_typed_at"

    def room_link(self, obj):
        """Link to room."""
        url = reverse("admin:chat_chatroom_change", args=[obj.room.pk])
        return format_html(
            '<a href="{}" target="_blank">Room {}</a>', url, str(obj.room.id)[:8]
        )

    room_link.short_description = "Room"

    def user_link(self, obj):
        """Link to user."""
        url = reverse("admin:users_user_change", args=[obj.user.pk])
        return format_html(
            '<a href="{}" target="_blank">{}</a>', url, obj.user.get_full_name()
        )

    user_link.short_description = "User"

    def is_typing_display(self, obj):
        """Colored typing status."""
        if obj.is_typing:
            return format_html(
                '<span style="color: green; font-weight: bold;">✍️ Typing</span>'
            )
        return format_html('<span style="color: gray;">💤 Idle</span>')

    is_typing_display.short_description = "Status"

    actions = ["cleanup_old_typing"]

    def cleanup_old_typing(self, request, queryset):
        """Clean up old typing statuses."""
        from django.utils import timezone

        cutoff_time = timezone.now() - timezone.timedelta(minutes=5)
        count = queryset.filter(is_typing=True, last_typed_at__lt=cutoff_time).update(
            is_typing=False
        )

        self.message_user(request, f"Cleaned up {count} old typing statuses")

    cleanup_old_typing.short_description = "Clean up old typing statuses"

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related("user", "room")
