# apps/chat/views.py
from django.utils import timezone
from django.db import transaction
from django.db.models import F, Q, Prefetch
from rest_framework import viewsets, generics, status, filters
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema, extend_schema_view

from apps.chat.models import ChatRoom, Message, MessageRead, UserTypingStatus
from apps.chat.serializers import (
    ChatRoomListSerializer,
    ChatRoomDetailSerializer,
    ChatRoomCreateSerializer,
    MessageListSerializer,
    MessageCreateSerializer,
    MessageUpdateSerializer,
    MessageReadSerializer,
    TypingStatusSerializer,
    BulkMarkAsReadSerializer,
    ChatStatisticsSerializer,
)
from apps.common.permissions import IsChatParticipant
from apps.common.pagination import StandardResultsSetPagination


# ═══════════════════════════════════════════════════════════════════════
# OPTIMIZED CHAT ROOM VIEWS
# ═══════════════════════════════════════════════════════════════════════


@extend_schema_view(
    list=extend_schema(
        summary="Get user's chat rooms",
        description="Get paginated list of user's chat rooms with optimized denormalized data",
    ),
    retrieve=extend_schema(
        summary="Get chat room details", description="Get detailed chat room info"
    ),
    create=extend_schema(
        summary="Create new chat room",
        description="Create a new chat room with participants",
    ),
)
@extend_schema(tags=["Chat Rooms"])
class ChatRoomViewSet(viewsets.ModelViewSet):
    """
    Optimized ViewSet for chat rooms with performance optimizations
    """

    permission_classes = [IsAuthenticated]
    filter_backends = [
        DjangoFilterBackend,
        filters.OrderingFilter,
        filters.SearchFilter,
    ]
    filterset_fields = ("room_type", "is_active")
    ordering_fields = ("last_activity_at", "last_message_at", "created_at")
    ordering = ("-last_activity_at",)  # Use denormalized field for sorting
    search_fields = ("participants__first_name", "participants__last_name")
    pagination_class = StandardResultsSetPagination

    def get_serializer_class(self):
        """Dynamic serializer selection for optimal performance"""
        if self.action == "list":
            return ChatRoomListSerializer
        elif self.action == "create":
            return ChatRoomCreateSerializer
        return ChatRoomDetailSerializer

    def get_queryset(self):
        """Optimized queryset with minimal database hits"""
        user = self.request.user

        # Use custom manager for optimal queries
        qs = ChatRoom.objects.for_user(user)

        # For list view, optimize for chat room list display
        if self.action == "list":
            qs = qs.select_related("booking").prefetch_related(
                "participants"  # Prefetch participants for other_participant calculation
            )

        # For detail view, get additional related data
        elif self.action == "retrieve":
            qs = qs.select_related("booking").prefetch_related(
                "participants", "typing_statuses__user"
            )

        return qs

    def perform_create(self, serializer):
        """Create chat room and set initial denormalized values"""
        with transaction.atomic():
            room = serializer.save()

            # Initialize denormalized fields
            room.last_activity_at = timezone.now()
            room.total_messages = 0
            room.unread_counts = {}
            room.save(
                update_fields=["last_activity_at", "total_messages", "unread_counts"]
            )

    @action(detail=True, methods=["post"])
    def mark_all_read(self, request, pk=None):
        """Mark all messages in room as read for current user"""
        room = self.get_object()

        with transaction.atomic():
            # Mark room as read (updates unread_counts)
            room.mark_as_read(request.user, save=True)

            # Get unread messages for bulk read receipt creation
            unread_message_ids = (
                Message.objects.filter(room=room, is_deleted=False)
                .exclude(read_receipts__user=request.user)
                .values_list("id", flat=True)
            )

            if unread_message_ids:
                # Bulk create read receipts
                read_receipts = [
                    MessageRead(
                        user=request.user, message_id=msg_id, read_at=timezone.now()
                    )
                    for msg_id in unread_message_ids
                ]
                MessageRead.objects.bulk_create(read_receipts, ignore_conflicts=True)

                # Update message read counts
                Message.objects.filter(id__in=unread_message_ids).update(
                    read_count=F("read_count") + 1
                )

        return Response({"marked_count": len(unread_message_ids)})

    @action(detail=False, methods=["get"])
    def statistics(self, request):
        """Get user's chat statistics"""
        user = request.user

        # Use optimized queries with denormalized data
        rooms = ChatRoom.objects.for_user(user)

        stats = {
            "total_rooms": rooms.count(),
            "active_rooms_count": rooms.filter(is_active=True).count(),
            "unread_rooms_count": 0,
            "total_unread_messages": 0,
        }

        # Calculate unread stats using denormalized data
        user_id = str(user.id)
        for room in rooms.filter(is_active=True):
            unread_count = room.unread_counts.get(user_id, 0)
            if unread_count > 0:
                stats["unread_rooms_count"] += 1
                stats["total_unread_messages"] += unread_count

        serializer = ChatStatisticsSerializer(stats)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def unread_rooms(self, request):
        """Get rooms with unread messages"""
        # Use custom manager method for efficient filtering
        rooms = ChatRoom.objects.unread_for_user(request.user)

        serializer = self.get_serializer(rooms, many=True)
        return Response(serializer.data)


# ═══════════════════════════════════════════════════════════════════════
# OPTIMIZED MESSAGE VIEWS (Nested under ChatRoom)
# ═══════════════════════════════════════════════════════════════════════


@extend_schema_view(
    list=extend_schema(
        summary="Get messages in chat room",
        description="Get paginated messages with optimized read status and reply info",
    ),
    create=extend_schema(
        summary="Send message",
        description="Send new message and update denormalized chat room data",
    ),
    partial_update=extend_schema(
        summary="Edit message", description="Edit message text (only own messages)"
    ),
)
@extend_schema(tags=["Chat Messages"])
class MessageViewSet(viewsets.ModelViewSet):
    """
    Optimized ViewSet for messages with performance enhancements
    """

    permission_classes = [IsChatParticipant]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ("message_type", "sender", "is_deleted")
    ordering_fields = ("created_at",)
    ordering = ("created_at",)

    def get_serializer_class(self):
        """Dynamic serializer selection"""
        if self.action in ["create"]:
            return MessageCreateSerializer
        elif self.action in ["update", "partial_update"]:
            return MessageUpdateSerializer
        return MessageListSerializer

    def get_queryset(self):
        """Optimized queryset with prefetched relations"""
        room_pk = self.kwargs["room_pk"]

        # Base queryset with optimal select_related
        qs = Message.objects.filter(
            room_id=room_pk, is_deleted=False  # Don't show deleted messages by default
        ).select_related(
            "sender", "reply_to__sender"  # Always need sender info  # For reply preview
        )

        # For list view, optimize read receipt checking
        if self.action == "list":
            # Prefetch read receipts for current user to avoid N+1
            user = self.request.user
            qs = qs.prefetch_related(
                Prefetch(
                    "read_receipts",
                    queryset=MessageRead.objects.filter(user=user),
                    to_attr="_prefetched_read_receipts",
                )
            )

        return qs

    def perform_create(self, serializer):
        """Create message with optimized denormalization updates"""
        room_id = self.kwargs["room_pk"]

        with transaction.atomic():
            # Create message
            message = serializer.save(sender=self.request.user, room_id=room_id)

            # Update room's updated_at (triggers last_activity_at update)
            ChatRoom.objects.filter(pk=room_id).update(updated_at=timezone.now())

    def update(self, request, *args, **kwargs):
        """Update message with permission check"""
        message = self.get_object()

        # Permission check
        if message.sender != request.user:
            return Response(
                {"detail": "You can only edit your own messages"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Check if message is too old to edit (optional business rule)
        if message.created_at < timezone.now() - timezone.timedelta(hours=24):
            return Response(
                {"detail": "Cannot edit messages older than 24 hours"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        """Soft delete message"""
        message = self.get_object()

        # Permission check
        if message.sender != request.user and not request.user.is_staff:
            return Response(
                {"detail": "No permission to delete this message"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Soft delete
        with transaction.atomic():
            message.is_deleted = True
            message.deleted_at = timezone.now()
            message.save(update_fields=["is_deleted", "deleted_at"])

            # Update room stats if needed (decrease total_messages)
            ChatRoom.objects.filter(pk=message.room_id).update(
                total_messages=F("total_messages") - 1
            )

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"])
    def mark_read(self, request, room_pk=None, pk=None):
        """Mark single message as read"""
        message = self.get_object()

        # Create read receipt if not exists
        read_receipt, created = MessageRead.objects.get_or_create(
            message=message, user=request.user, defaults={"read_at": timezone.now()}
        )

        if created:
            # Update denormalized read count
            message.increment_read_count(save=True)

            # Update room unread count
            room = message.room
            current_unread = room.get_unread_count(request.user)
            if current_unread > 0:
                room.unread_counts[str(request.user.id)] = current_unread - 1
                room.save(update_fields=["unread_counts"])

        return Response({"is_read": True})

    @action(detail=False, methods=["post"])
    def bulk_mark_read(self, request, room_pk=None):
        """Bulk mark messages as read"""
        serializer = BulkMarkAsReadSerializer(
            data=request.data, context={"request": request, "room_id": room_pk}
        )
        serializer.is_valid(raise_exception=True)
        result = serializer.save()

        return Response(result)

    @action(detail=False, methods=["get"])
    def unread_count(self, request, room_pk=None):
        """Get unread message count for current user in this room"""
        try:
            room = ChatRoom.objects.get(pk=room_pk, participants=request.user)
            count = room.get_unread_count(request.user)
            return Response({"unread_count": count})
        except ChatRoom.DoesNotExist:
            return Response({"unread_count": 0})


# ═══════════════════════════════════════════════════════════════════════
# OPTIMIZED TYPING STATUS VIEW
# ═══════════════════════════════════════════════════════════════════════


@extend_schema(tags=["Chat Typing"])
class TypingStatusView(generics.RetrieveUpdateAPIView):
    """
    Optimized typing status management
    """

    serializer_class = TypingStatusSerializer
    permission_classes = [IsChatParticipant]

    def get_object(self):
        """Get or create typing status for user in room"""
        room_pk = self.kwargs.get("room_pk")

        obj, created = UserTypingStatus.objects.get_or_create(
            room_id=room_pk,
            user=self.request.user,
            defaults={"is_typing": False, "last_typed_at": timezone.now()},
        )
        return obj

    def update(self, request, *args, **kwargs):
        """Update typing status with automatic cleanup"""
        response = super().update(request, *args, **kwargs)

        # Trigger cleanup of old typing statuses (optional background task)
        # UserTypingStatus.cleanup_old_typing_statuses.delay()

        return response

    @action(detail=False, methods=["get"])
    def active_typers(self, request, room_pk=None):
        """Get users currently typing in room"""
        # Get active typers excluding current user
        active_typers = (
            UserTypingStatus.objects.filter(
                room_id=room_pk,
                is_typing=True,
                last_typed_at__gte=timezone.now() - timezone.timedelta(minutes=2),
            )
            .exclude(user=request.user)
            .select_related("user")
        )

        serializer = TypingStatusSerializer(active_typers, many=True)
        return Response(serializer.data)


# ═══════════════════════════════════════════════════════════════════════
# READ RECEIPTS VIEW
# ═══════════════════════════════════════════════════════════════════════


@extend_schema(tags=["Message Read Receipts"])
class MessageReadListView(generics.ListAPIView):
    """
    Get read receipts for specific message
    """

    serializer_class = MessageReadSerializer
    permission_classes = [IsChatParticipant]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        """Get read receipts for message with user info"""
        message_pk = self.kwargs.get("message_pk")

        return (
            MessageRead.objects.filter(message_id=message_pk)
            .select_related("user")
            .order_by("-read_at")
        )


# ═══════════════════════════════════════════════════════════════════════
# UTILITY VIEWS
# ═══════════════════════════════════════════════════════════════════════


@extend_schema(tags=["Chat Utilities"])
class ChatCleanupView(generics.GenericAPIView):
    """
    Administrative view for cleaning up chat data
    """

    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["post"])
    def cleanup_typing_statuses(self, request):
        """Clean up old typing statuses"""
        if not request.user.is_staff:
            return Response(
                {"detail": "Staff permission required"},
                status=status.HTTP_403_FORBIDDEN,
            )

        cleaned_count = UserTypingStatus.objects.filter(
            is_typing=True,
            last_typed_at__lt=timezone.now() - timezone.timedelta(minutes=5),
        ).update(is_typing=False)

        return Response({"cleaned_count": cleaned_count})

    @action(detail=False, methods=["post"])
    def recalculate_room_stats(self, request):
        """Recalculate denormalized room statistics"""
        if not request.user.is_staff:
            return Response(
                {"detail": "Staff permission required"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # This would be a background task in production
        updated_rooms = 0

        for room in ChatRoom.objects.all():
            # Recalculate total messages
            actual_count = room.messages.filter(is_deleted=False).count()
            if room.total_messages != actual_count:
                room.total_messages = actual_count
                room.save(update_fields=["total_messages"])
                updated_rooms += 1

        return Response({"updated_rooms": updated_rooms})
