# apps/chat/views.py
import logging
from datetime import timedelta

from django.utils import timezone
from django.db import transaction
from django.db.models import F, Prefetch, Exists, OuterRef
from django.core.cache import cache
from rest_framework import viewsets, generics, status, filters, views
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

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
    MessageFileUploadSerializer,
)
from apps.chat.cache import ChatCache
from apps.chat.utils import ChatUtils
from apps.common.permissions import IsChatParticipant
from apps.common.pagination import StandardResultsSetPagination


logger = logging.getLogger(__name__)
channel_layer = get_channel_layer()


# ==================== THROTTLING ====================


class ChatMessageThrottle(UserRateThrottle):
    scope = "chat_message"
    rate = "30/min"  # 30 messages per minute


class ChatRoomCreateThrottle(UserRateThrottle):
    scope = "chat_room_create"
    rate = "10/hour"  # 10 rooms per hour


# ==================== CHAT ROOM VIEWSET ====================


@extend_schema_view(
    list=extend_schema(
        summary="Chat xonalar ro'yxati",
        description="Foydalanuvchi chat xonalarini olish",
        parameters=[
            OpenApiParameter(
                name="unread_only",
                type=bool,
                location=OpenApiParameter.QUERY,
                description="Faqat o'qilmagan xonalar",
            ),
        ],
    ),
    retrieve=extend_schema(
        summary="Chat xona tafsilotlari",
        description="Bitta chat xona haqida to'liq ma'lumot",
    ),
    create=extend_schema(
        summary="Yangi chat xona yaratish",
        description="Yangi chat xona yaratish (rate limited)",
    ),
)
@extend_schema(tags=["Chat Rooms"])
class ChatRoomViewSet(viewsets.ModelViewSet):

    permission_classes = [IsAuthenticated]
    filter_backends = [
        DjangoFilterBackend,
        filters.OrderingFilter,
        filters.SearchFilter,
    ]
    filterset_fields = ("room_type", "is_active")
    ordering_fields = ("last_activity_at", "last_message_at", "created_at")
    ordering = ("-last_activity_at",)
    search_fields = ("participants__first_name", "participants__last_name")
    pagination_class = StandardResultsSetPagination

    def get_throttles(self):
        if self.action == "create":
            return [ChatRoomCreateThrottle()]
        return []

    def get_serializer_class(self):
        if self.action == "list":
            return ChatRoomListSerializer
        elif self.action == "create":
            return ChatRoomCreateSerializer
        return ChatRoomDetailSerializer

    def get_queryset(self):
        user = self.request.user

        # Base queryset
        qs = ChatRoom.objects.filter(participants=user, is_active=True)

        # Unread only filter
        if self.request.query_params.get("unread_only") == "true":
            user_id_str = str(user.id)
            qs = qs.filter(unread_counts__has_key=user_id_str).exclude(
                unread_counts__contains={user_id_str: 0}
            )

        # Optimize based on action
        if self.action == "list":
            qs = qs.select_related("booking").prefetch_related(
                "participants",
                Prefetch(
                    "participants",
                    queryset=user.__class__.objects.only(
                        "id", "username", "first_name", "last_name", "avatar"
                    ),
                ),
            )
        elif self.action == "retrieve":
            qs = qs.select_related("booking").prefetch_related(
                "participants",
                Prefetch(
                    "typing_statuses",
                    queryset=UserTypingStatus.objects.filter(
                        is_typing=True,
                        last_typed_at__gte=timezone.now() - timedelta(minutes=2),
                    ).select_related("user"),
                ),
            )

        return qs

    def list(self, request, *args, **kwargs):
        """List with caching"""
        # Try cache first
        cache_key = f"chat:rooms:{request.user.id}:{request.GET.urlencode()}"
        cached_data = cache.get(cache_key)

        if cached_data:
            return Response(cached_data)

        # Get from DB
        response = super().list(request, *args, **kwargs)

        # Cache for 1 minute
        cache.set(cache_key, response.data, 60)

        return response

    def perform_create(self, serializer):
        """Create room with proper initialization"""
        with transaction.atomic():
            room = serializer.save()

            # Initialize denormalized fields
            room.last_activity_at = timezone.now()
            room.total_messages = 0

            # Initialize unread counts for all participants
            room.unread_counts = {}
            for participant in room.participants.all():
                room.unread_counts[str(participant.id)] = 0

            room.save(
                update_fields=["last_activity_at", "total_messages", "unread_counts"]
            )

            # Send WebSocket notification to participants
            self._notify_room_created(room)

            # Clear cache
            ChatCache.invalidate_user(self.request.user.id)

    @action(detail=True, methods=["post"])
    def mark_all_read(self, request, pk=None):
        room = self.get_object()

        with transaction.atomic():
            # Get unread messages
            unread_messages = (
                Message.objects.filter(room=room, is_deleted=False)
                .exclude(read_receipts__user=request.user)
                .values_list("id", flat=True)[:1000]
            )  # Limit for safety

            if unread_messages:
                # Bulk create read receipts
                read_receipts = [
                    MessageRead(
                        user=request.user, message_id=msg_id, read_at=timezone.now()
                    )
                    for msg_id in unread_messages
                ]

                MessageRead.objects.bulk_create(read_receipts, ignore_conflicts=True)

                # Update message read counts
                Message.objects.filter(id__in=unread_messages).update(
                    read_count=F("read_count") + 1
                )

            room.mark_as_read(request.user, save=True)

            ChatCache.invalidate_room(str(room.id))
            ChatCache.invalidate_user(str(request.user.id))

            self._notify_messages_read(room.id, list(unread_messages))

        return Response({"success": True, "marked_count": len(unread_messages)})

    @action(detail=False, methods=["get"])
    def statistics(self, request):

        cache_key = f"chat:stats:{request.user.id}"
        cached_stats = cache.get(cache_key)

        if cached_stats:
            return Response(cached_stats)

        user = request.user
        user_id_str = str(user.id)

        rooms = ChatRoom.objects.filter(participants=user, is_active=True)

        stats = {
            "total_rooms": rooms.count(),
            "active_rooms_count": rooms.filter(
                last_activity_at__gte=timezone.now() - timedelta(days=30)
            ).count(),
            "unread_rooms_count": 0,
            "total_unread_messages": 0,
        }

        for room in rooms.only("unread_counts"):
            unread = room.unread_counts.get(user_id_str, 0)
            if unread > 0:
                stats["unread_rooms_count"] += 1
                stats["total_unread_messages"] += unread

        cache.set(cache_key, stats, 300)

        serializer = ChatStatisticsSerializer(stats)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def participants_online(self, request, pk=None):
        room = self.get_object()
        online_users = ChatUtils.get_online_users(str(room.id))

        return Response(
            {"online_count": len(online_users), "online_user_ids": online_users}
        )

    @action(detail=True, methods=["post"])
    def leave(self, request, pk=None):
        room = self.get_object()

        with transaction.atomic():
            room.participants.remove(request.user)

            user_id_str = str(request.user.id)
            if user_id_str in room.unread_counts:
                del room.unread_counts[user_id_str]
                room.save(update_fields=["unread_counts"])

            self._notify_user_left(room.id, request.user.id)

        return Response({"success": True})

    def _notify_room_created(self, room):
        try:
            for participant in room.participants.all():
                async_to_sync(channel_layer.group_send)(
                    f"user_{participant.id}",
                    {
                        "type": "chat.room_created",
                        "room_id": str(room.id),
                        "room_type": room.room_type,
                    },
                )
        except Exception as e:
            logger.error(f"Error notifying room creation: {e}")

    def _notify_messages_read(self, room_id, message_ids):
        try:
            async_to_sync(channel_layer.group_send)(
                f"chat_{room_id}",
                {
                    "type": "chat.messages_read",
                    "user_id": str(self.request.user.id),
                    "message_ids": message_ids,
                },
            )
        except Exception as e:
            logger.error(f"Error notifying messages read: {e}")

    def _notify_user_left(self, room_id, user_id):
        try:
            async_to_sync(channel_layer.group_send)(
                f"chat_{room_id}",
                {
                    "type": "chat.user_left",
                    "user_id": str(user_id),
                },
            )
        except Exception as e:
            logger.error(f"Error notifying user left: {e}")


# ==================== MESSAGE VIEWSET ====================


@extend_schema_view(
    list=extend_schema(
        summary="Xonadagi xabarlar",
        description="Chat xonadagi xabarlar ro'yxati",
        parameters=[
            OpenApiParameter(
                name="before",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Load messages before this message ID",
            ),
        ],
    ),
    create=extend_schema(
        summary="Xabar yuborish", description="Yangi xabar yuborish (rate limited)"
    ),
    partial_update=extend_schema(
        summary="Xabarni tahrirlash",
        description="O'z xabarini tahrirlash (24 soat ichida)",
    ),
)
@extend_schema(tags=["Chat Messages"])
class MessageViewSet(viewsets.ModelViewSet):

    permission_classes = [IsChatParticipant]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ("message_type", "sender", "is_deleted")
    ordering_fields = ("created_at",)
    ordering = ("-created_at",)  # Latest first for chat

    def get_throttles(self):
        if self.action == "create":
            return [ChatMessageThrottle()]
        return []

    def get_serializer_class(self):
        if self.action == "create":
            return MessageCreateSerializer
        elif self.action in ["update", "partial_update"]:
            return MessageUpdateSerializer
        elif self.action == "upload_file":
            return MessageFileUploadSerializer
        return MessageListSerializer

    def get_queryset(self):
        room_pk = self.kwargs["room_pk"]
        user = self.request.user

        qs = Message.objects.filter(room_id=room_pk, is_deleted=False).select_related(
            "sender", "reply_to", "reply_to__sender"
        )

        before_id = self.request.query_params.get("before")
        if before_id:
            try:
                before_msg = Message.objects.get(id=before_id)
                qs = qs.filter(created_at__lt=before_msg.created_at)
            except Message.DoesNotExist:
                pass

        if self.action == "list":
            qs = qs.prefetch_related(
                Prefetch(
                    "read_receipts",
                    queryset=MessageRead.objects.filter(user=user),
                    to_attr="_prefetched_read_receipts",
                )
            ).annotate(
                is_read_by_me=Exists(
                    MessageRead.objects.filter(message=OuterRef("pk"), user=user)
                )
            )

        return qs

    def list(self, request, *args, **kwargs):
        room_pk = self.kwargs["room_pk"]

        if not request.GET.get("page") or request.GET.get("page") == "1":
            cache_key = f"chat:messages:{room_pk}:page1"
            cached_data = cache.get(cache_key)

            if cached_data:
                return Response(cached_data)

        response = super().list(request, *args, **kwargs)

        # Cache first page for 30 seconds
        if not request.GET.get("page") or request.GET.get("page") == "1":
            cache.set(cache_key, response.data, 30)

        return response

    def perform_create(self, serializer):
        room_id = self.kwargs["room_pk"]

        with transaction.atomic():
            message = serializer.save(sender=self.request.user, room_id=room_id)

            ChatCache.invalidate_messages(room_id)
            ChatCache.invalidate_room(room_id)

    def update(self, request, *args, **kwargs):
        message = self.get_object()

        if message.sender != request.user:
            return Response(
                {"error": "Faqat o'z xabaringizni tahrirlashingiz mumkin"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if message.created_at < timezone.now() - timedelta(hours=24):
            return Response(
                {"error": "24 soatdan eski xabarlarni tahrirlash mumkin emas"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        response = super().update(request, *args, **kwargs)

        self._notify_message_edited(message)

        return response

    def destroy(self, request, *args, **kwargs):
        message = self.get_object()

        if message.sender != request.user and not request.user.is_staff:
            return Response(
                {"error": "Xabarni o'chirish huquqi yo'q"},
                status=status.HTTP_403_FORBIDDEN,
            )

        with transaction.atomic():
            message.is_deleted = True
            message.deleted_at = timezone.now()
            message.save(update_fields=["is_deleted", "deleted_at"])

            ChatCache.invalidate_messages(str(message.room_id))

            self._notify_message_deleted(message)

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"])
    def mark_read(self, request, room_pk=None, pk=None):
        message = self.get_object()

        read_receipt, created = MessageRead.objects.get_or_create(
            message=message, user=request.user, defaults={"read_at": timezone.now()}
        )

        if created:

            self._notify_message_read(message.room_id, [str(message.id)])

        return Response({"is_read": True})

    @action(detail=False, methods=["post"])
    def bulk_mark_read(self, request, room_pk=None):
        serializer = BulkMarkAsReadSerializer(
            data=request.data, context={"request": request, "room_id": room_pk}
        )
        serializer.is_valid(raise_exception=True)
        result = serializer.save()

        if result.get("marked_count") > 0:
            self._notify_message_read(room_pk, request.data.get("message_ids", []))

        return Response(result)

    @action(detail=False, methods=["post"])
    def upload_file(self, request, room_pk=None):
        serializer = MessageFileUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        file_obj = request.FILES.get("file")
        if not file_obj:
            return Response(
                {"error": "Fayl topilmadi"}, status=status.HTTP_400_BAD_REQUEST
            )

        message_type = serializer.validated_data["message_type"]

        try:
            if message_type == Message.MessageType.IMAGE:
                FileValidator.validate_image_file(file_obj)
            elif message_type == Message.MessageType.AUDIO:
                FileValidator.validate_audio_file(file_obj)
            elif message_type == Message.MessageType.VIDEO:
                FileValidator.validate_video_file(file_obj)
            else:
                FileValidator.validate_document_file(file_obj)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # Create message with file
        with transaction.atomic():
            message = Message.objects.create(
                room_id=room_pk,
                sender=request.user,
                message_type=message_type,
                file=file_obj,
                file_name=file_obj.name,
                file_size=file_obj.size,
                text=serializer.validated_data.get("text", ""),
            )

            serializer = MessageListSerializer(message)

            self._notify_new_message(message)

            return Response(serializer.data, status=status.HTTP_201_CREATED)

    def _notify_new_message(self, message):
        try:
            from apps.chat.serializers import MessageListSerializer

            serialized = MessageListSerializer(message).data

            async_to_sync(channel_layer.group_send)(
                f"chat_{message.room_id}",
                {"type": "chat.message", "message": serialized},
            )
        except Exception as e:
            logger.error(f"Error notifying new message: {e}")

    def _notify_message_edited(self, message):
        try:
            async_to_sync(channel_layer.group_send)(
                f"chat_{message.room_id}",
                {
                    "type": "chat.message_edited",
                    "message_id": str(message.id),
                    "new_text": message.text,
                    "edited_at": message.edited_at.isoformat(),
                },
            )
        except Exception as e:
            logger.error(f"Error notifying message edit: {e}")

    def _notify_message_deleted(self, message):
        try:
            async_to_sync(channel_layer.group_send)(
                f"chat_{message.room_id}",
                {"type": "chat.message_deleted", "message_id": str(message.id)},
            )
        except Exception as e:
            logger.error(f"Error notifying message delete: {e}")

    def _notify_message_read(self, room_id, message_ids):
        try:
            async_to_sync(channel_layer.group_send)(
                f"chat_{room_id}",
                {
                    "type": "chat.read",
                    "user_id": str(self.request.user.id),
                    "message_ids": message_ids,
                },
            )
        except Exception as e:
            logger.error(f"Error notifying message read: {e}")


# ==================== TYPING STATUS ====================


@extend_schema(tags=["Chat Typing"])
class TypingStatusView(generics.RetrieveUpdateAPIView):

    serializer_class = TypingStatusSerializer
    permission_classes = [IsChatParticipant]

    def get_object(self):
        room_pk = self.kwargs.get("room_pk")
        obj, created = UserTypingStatus.objects.get_or_create(
            room_id=room_pk, user=self.request.user, defaults={"is_typing": False}
        )
        return obj

    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)

        room_pk = self.kwargs.get("room_pk")
        is_typing = request.data.get("is_typing", False)

        try:
            async_to_sync(channel_layer.group_send)(
                f"chat_{room_pk}",
                {
                    "type": "chat.typing",
                    "user_id": str(request.user.id),
                    "is_typing": is_typing,
                },
            )
        except Exception as e:
            logger.error(f"Error notifying typing status: {e}")

        return response


@extend_schema(tags=["Chat Typing"])
class ActiveTypersView(views.APIView):

    permission_classes = [IsChatParticipant]

    def get(self, request, room_pk=None):
        active_typers = (
            UserTypingStatus.objects.filter(
                room_id=room_pk,
                is_typing=True,
                last_typed_at__gte=timezone.now() - timedelta(minutes=2),
            )
            .exclude(user=request.user)
            .select_related("user")
        )

        serializer = TypingStatusSerializer(active_typers, many=True)
        return Response(serializer.data)


# ==================== READ RECEIPTS ====================


@extend_schema(tags=["Message Read Receipts"])
class MessageReadListView(generics.ListAPIView):

    serializer_class = MessageReadSerializer
    permission_classes = [IsChatParticipant]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        message_pk = self.kwargs.get("message_pk")
        return (
            MessageRead.objects.filter(message_id=message_pk)
            .select_related("user")
            .order_by("-read_at")
        )
