# apps/chat/utils.py
"""
Chat application utility functions.
"""
import re
import hashlib
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models import Q, Count, Max, F
import logging

logger = logging.getLogger(__name__)


class ChatUtils:
    """
    Chat utility functions.
    """

    @staticmethod
    def sanitize_message_text(text: str) -> str:
        """
        Sanitize message text for XSS prevention.
        """
        import html

        # HTML escape
        text = html.escape(text.strip())

        # Convert URLs to links (optional)
        url_pattern = r"(https?://[^\s]+)"
        text = re.sub(url_pattern, r'<a href="\1" target="_blank">\1</a>', text)

        # Convert newlines to <br> (optional)
        text = text.replace("\n", "<br>")

        return text

    @staticmethod
    def format_message_preview(text: str, max_length: int = 150) -> str:
        """
        Format message text for preview.
        """
        if not text:
            return ""

        # Remove extra whitespace
        text = " ".join(text.split())

        if len(text) <= max_length:
            return text

        # Cut at word boundary
        truncated = text[:max_length]
        last_space = truncated.rfind(" ")

        if last_space > max_length * 0.8:  # If space is reasonably close
            truncated = truncated[:last_space]

        return truncated + "..."

    @staticmethod
    def calculate_read_time(text: str) -> int:
        """
        Calculate estimated read time in seconds.
        """
        # Average reading speed: 200 words per minute
        words = len(text.split())
        seconds = max(1, int(words / 200 * 60))
        return seconds

    @staticmethod
    def generate_room_hash(participant_ids: List[str]) -> str:
        """
        Generate unique hash for room participants.
        Used for finding existing direct chats.
        """
        # Sort IDs to ensure consistency
        sorted_ids = sorted(str(pid) for pid in participant_ids)
        hash_input = ":".join(sorted_ids)

        return hashlib.sha256(hash_input.encode()).hexdigest()[:16]

    @staticmethod
    def find_or_create_direct_room(user1_id: str, user2_id: str):
        """
        Find existing direct room or create new one.
        """
        from apps.chat.models import ChatRoom

        # Find existing room
        room = (
            ChatRoom.objects.filter(
                room_type=ChatRoom.RoomType.DIRECT, participants__in=[user1_id]
            )
            .filter(participants__in=[user2_id])
            .annotate(participant_count=Count("participants"))
            .filter(participant_count=2)
            .first()
        )

        if room:
            return room, False

        # Create new room
        room = ChatRoom.objects.create(room_type=ChatRoom.RoomType.DIRECT)
        room.participants.add(user1_id, user2_id)

        # Initialize unread counts
        room.unread_counts = {str(user1_id): 0, str(user2_id): 0}
        room.save(update_fields=["unread_counts"])

        return room, True

    @staticmethod
    def get_online_users(room_id: str) -> List[str]:
        """
        Get list of online users in room.
        """
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync

        channel_layer = get_channel_layer()
        group_name = f"chat_{room_id}"

        # This depends on your channel layer implementation
        # Some backends support group inspection
        try:
            if hasattr(channel_layer, "group_channels"):
                channels = async_to_sync(channel_layer.group_channels)(group_name)
                # Extract user IDs from channel names
                return list(set(ch.split("_")[1] for ch in channels if "_" in ch))
        except Exception as e:
            logger.error(f"Error getting online users: {e}")

        return []

    @staticmethod
    def cleanup_old_messages(days: int = 365) -> int:
        """
        Soft delete old messages.
        """
        from apps.chat.models import Message

        cutoff_date = timezone.now() - timedelta(days=days)

        old_messages = Message.objects.filter(
            created_at__lt=cutoff_date, is_deleted=False
        )

        count = old_messages.count()

        old_messages.update(is_deleted=True, deleted_at=timezone.now())

        logger.info(f"Soft deleted {count} old messages")
        return count

    @staticmethod
    def get_user_chat_stats(user_id: str) -> Dict[str, Any]:
        """
        Get chat statistics for user.
        """
        from apps.chat.models import ChatRoom, Message

        rooms = ChatRoom.objects.filter(participants__id=user_id, is_active=True)

        total_messages_sent = Message.objects.filter(
            sender_id=user_id, is_deleted=False
        ).count()

        total_unread = sum(room.get_unread_count_for_user_id(user_id) for room in rooms)

        last_activity = (
            rooms.aggregate(last=Max("last_activity_at"))["last"] or timezone.now()
        )

        return {
            "total_rooms": rooms.count(),
            "active_rooms": rooms.filter(
                last_activity_at__gte=timezone.now() - timedelta(days=30)
            ).count(),
            "total_messages_sent": total_messages_sent,
            "total_unread": total_unread,
            "last_activity": last_activity.isoformat(),
        }

    @staticmethod
    def export_chat_history(room_id: str, format: str = "json") -> str:
        """
        Export chat history in various formats.
        """
        from apps.chat.models import Message
        from apps.chat.serializers import MessageListSerializer
        import json
        import csv
        from io import StringIO

        messages = (
            Message.objects.filter(room_id=room_id, is_deleted=False)
            .select_related("sender")
            .order_by("created_at")
        )

        if format == "json":
            serializer = MessageListSerializer(messages, many=True)
            return json.dumps(serializer.data, indent=2, default=str)

        elif format == "csv":
            output = StringIO()
            writer = csv.writer(output)

            # Header
            writer.writerow(["ID", "Sender", "Type", "Text", "Created At"])

            # Data
            for msg in messages:
                writer.writerow(
                    [
                        str(msg.id),
                        msg.sender.get_full_name() if msg.sender else "System",
                        msg.message_type,
                        msg.text[:100] if msg.text else "",
                        msg.created_at.isoformat(),
                    ]
                )

            return output.getvalue()

        elif format == "txt":
            lines = []
            for msg in messages:
                sender = msg.sender.get_full_name() if msg.sender else "System"
                time = msg.created_at.strftime("%Y-%m-%d %H:%M")
                text = msg.text or f"[{msg.message_type}]"
                lines.append(f"[{time}] {sender}: {text}")

            return "\n".join(lines)

        else:
            raise ValueError(f"Unsupported format: {format}")


class MessageBatcher:
    """
    Batch message operations for performance.
    """

    def __init__(self, batch_size: int = 100):
        self.batch_size = batch_size
        self.pending_messages: List[Dict] = []
        self.pending_reads: List[Dict] = []

    def add_message(self, message_data: Dict):
        """Add message to batch"""
        self.pending_messages.append(message_data)

        if len(self.pending_messages) >= self.batch_size:
            self.flush_messages()

    def add_read(self, read_data: Dict):
        """Add read receipt to batch"""
        self.pending_reads.append(read_data)

        if len(self.pending_reads) >= self.batch_size:
            self.flush_reads()

    def flush_messages(self):
        """Flush pending messages"""
        if not self.pending_messages:
            return

        from apps.chat.models import Message

        messages = [Message(**data) for data in self.pending_messages]

        Message.objects.bulk_create(messages)
        self.pending_messages.clear()

        logger.info(f"Flushed {len(messages)} messages")

    def flush_reads(self):
        """Flush pending read receipts"""
        if not self.pending_reads:
            return

        from apps.chat.models import MessageRead

        reads = [MessageRead(**data) for data in self.pending_reads]

        MessageRead.objects.bulk_create(reads, ignore_conflicts=True)
        self.pending_reads.clear()

        logger.info(f"Flushed {len(reads)} read receipts")

    def flush_all(self):
        """Flush all pending operations"""
        self.flush_messages()
        self.flush_reads()
