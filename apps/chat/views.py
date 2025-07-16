from django.utils import timezone
from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter

from apps.chat.models import ChatRoom, Message, MessageRead, UserTypingStatus
from apps.chat.serializers import (
    ChatRoomSerializer,
    MessageSerializer,
    MessageReadSerializer,
    TypingStatusSerializer,
)
from apps.common.permissions import IsChatParticipant

from drf_spectacular.utils import extend_schema


@extend_schema(tags=["chat"])
class ChatRoomViewSet(viewsets.ModelViewSet):
    """
    list/create direct|booking|support rooms
    """

    queryset = ChatRoom.objects.prefetch_related("participants")
    serializer_class = ChatRoomSerializer
    permission_classes = [IsAuthenticated]

    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["room_type", "is_active"]
    ordering_fields = ["updated_at", "created_at"]
    ordering = ["-updated_at"]

    def perform_create(self, serializer):
        room = serializer.save()
        room.participants.add(self.request.user)


# ─────────────── MessageViewSet (nested) ───────────────
class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [IsChatParticipant]

    def get_queryset(self):
        return (
            Message.objects.filter(room_id=self.kwargs["room_pk"])
            .select_related("sender", "reply_to")
            .order_by("created_at")
        )

    def perform_create(self, serializer):
        serializer.save(
            sender=self.request.user,
            room_id=self.kwargs["room_pk"],
        )
        # room updated_at ni yangilab qo'yamiz
        ChatRoom.objects.filter(pk=self.kwargs["room_pk"]).update(
            updated_at=timezone.now()
        )

    # ---- custom actions ----
    @action(detail=True, methods=["post"])
    def mark_read(self, request, room_pk=None, pk=None):
        """
        /chats/{room_pk}/messages/{id}/mark_read/
        """
        message = self.get_object()
        MessageRead.objects.get_or_create(message=message, user=request.user)
        return Response({"status": "read"}, status=204)

    @action(detail=True, methods=["post"])
    def soft_delete(self, request, room_pk=None, pk=None):
        message = self.get_object()
        if message.sender != request.user:
            return Response({"detail": "Not your message"}, status=403)
        message.is_deleted = True
        message.deleted_at = timezone.now()
        message.save(update_fields=["is_deleted", "deleted_at"])
        return Response(MessageSerializer(message).data)


# ─────────────── Read receipts list (optional) ───────────────
class MessageReadListView(generics.ListAPIView):
    """
    /chats/{room_pk}/messages/{message_pk}/reads/
    """

    serializer_class = MessageReadSerializer
    permission_classes = [IsChatParticipant]

    def get_queryset(self):
        return MessageRead.objects.filter(
            message_id=self.kwargs["message_pk"]
        ).select_related("user")


# ─────────────── Typing status ───────────────
class TypingStatusView(generics.UpdateAPIView):
    """
    PATCH /chats/{room_pk}/typing/
    body: { "is_typing": true/false }
    """

    serializer_class = TypingStatusSerializer
    permission_classes = [IsChatParticipant]

    def get_object(self):
        obj, _ = UserTypingStatus.objects.get_or_create(
            room_id=self.kwargs["room_pk"],
            user=self.request.user,
        )
        return obj
