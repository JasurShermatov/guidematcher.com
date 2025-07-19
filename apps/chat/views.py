from django.utils import timezone
from rest_framework import viewsets, generics, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.filters import OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend

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
    list / create chat rooms
    """

    serializer_class = ChatRoomSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ("room_type", "is_active")
    ordering_fields = ("updated_at", "created_at")
    ordering = ("-updated_at",)

    def get_queryset(self):
        qs = ChatRoom.objects.prefetch_related("participants")
        if not self.request.user.is_staff:
            qs = qs.filter(participants=self.request.user, is_active=True)
        return qs

    def perform_create(self, serializer):
        room = serializer.save()
        room.participants.add(self.request.user)


# ───────────────────── Message ─────────────────────
@extend_schema(tags=["chat"])
class MessageViewSet(viewsets.ModelViewSet):
    """
    CRUD for messages inside a room  (nested router: /chats/{room_pk}/messages/)
    """

    serializer_class = MessageSerializer
    permission_classes = [IsChatParticipant]

    def get_queryset(self):
        return (
            Message.objects.filter(room_id=self.kwargs["room_pk"])
            .select_related("sender", "reply_to")
            .order_by("created_at")
        )

    # ----- CREATE -----
    def perform_create(self, serializer):
        msg = serializer.save(sender=self.request.user, room_id=self.kwargs["room_pk"])
        # refresh room.updated_at
        ChatRoom.objects.filter(pk=self.kwargs["room_pk"]).update(
            updated_at=timezone.now()
        )
        return msg

    # ----- UPDATE (edit) -----
    def update(self, request, *args, **kwargs):
        msg = self.get_object()
        if msg.sender != request.user:
            return Response({"detail": "You can edit only your messages"}, status=403)
        partial = kwargs.pop("partial", False)
        serializer = self.get_serializer(msg, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save(is_edited=True, edited_at=timezone.now())
        return Response(serializer.data)

    # ----- DELETE (for all) -----
    def destroy(self, request, *args, **kwargs):
        msg = self.get_object()
        if msg.sender != request.user and not request.user.is_staff:
            return Response({"detail": "No permission"}, status=403)
        msg.is_deleted = True
        msg.deleted_at = timezone.now()
        msg.save(update_fields=["is_deleted", "deleted_at"])
        return Response(status=204)

    # ---- mark_read ----
    @action(detail=True, methods=["post"])
    def mark_read(self, request, room_pk=None, pk=None):
        MessageRead.objects.get_or_create(message_id=pk, user=request.user)
        return Response(status=204)

    # ---- soft_delete (only self-side) ----
    @action(detail=True, methods=["post"])
    def soft_delete(self, request, room_pk=None, pk=None):
        msg = self.get_object()
        if msg.sender != request.user:
            return Response({"detail": "Not your message"}, status=403)
        msg.is_deleted = True
        msg.deleted_at = timezone.now()
        msg.save(update_fields=["is_deleted", "deleted_at"])
        return Response(MessageSerializer(msg).data)


# ───────────────────── Read receipts ─────────────────────
class MessageReadListView(generics.ListAPIView):
    serializer_class = MessageReadSerializer
    permission_classes = [IsChatParticipant]

    def get_queryset(self):
        return MessageRead.objects.filter(
            message_id=self.kwargs["message_pk"]
        ).select_related("user")


# ───────────────────── Typing status ─────────────────────
class TypingStatusView(generics.UpdateAPIView):
    serializer_class = TypingStatusSerializer
    permission_classes = [IsChatParticipant]

    def get_object(self):
        obj, _ = UserTypingStatus.objects.get_or_create(
            room_id=self.kwargs["room_pk"], user=self.request.user
        )
        return obj
