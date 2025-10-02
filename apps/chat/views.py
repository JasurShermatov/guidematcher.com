# apps/chat/views.py
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import extend_schema

from apps.users.models import User
from .models import Conversation, Message, BlockedUser
from .serializers import (
    ConversationSerializer,
    MessageCreateSerializer,
    MessageListSerializer,
    BlockedUserSerializer,
    StartConversationSerializer,
    BlockUserSerializer,
    MessageActionSerializer,
    UnreadCountSerializer,
)


class ChatPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 100


@extend_schema(tags=["Chat"])
class ConversationListCreateView(generics.ListCreateAPIView):
    serializer_class = ConversationSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    pagination_class = ChatPagination

    def get_queryset(self):
        return Conversation.objects.get_user_conversations(self.request.user)

    def get_serializer_class(self):
        if self.request.method == "POST":
            return StartConversationSerializer
        return ConversationSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        other_user = User.objects.get(
            email=serializer.validated_data["user_email"], is_active=True
        )

        conversation, created = Conversation.objects.get_or_create_chat(
            request.user, other_user
        )

        initial_message = serializer.validated_data.get("message")
        if initial_message:
            message = Message.objects.create(
                conversation=conversation, sender=request.user, content=initial_message
            )

            conversation.updated_at = timezone.now()
            conversation.save()

        conversation_serializer = ConversationSerializer(
            conversation, context={"request": request}
        )

        return Response(
            conversation_serializer.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


@extend_schema(tags=["Chat"])
class ConversationDetailView(generics.RetrieveAPIView):

    serializer_class = ConversationSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get_queryset(self):
        return Conversation.objects.get_user_conversations(self.request.user)


@extend_schema(tags=["Chat"])
class MessageListView(generics.ListAPIView):

    serializer_class = MessageListSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    pagination_class = ChatPagination

    def get_queryset(self):
        conversation_id = self.kwargs["conversation_id"]
        conversation = get_object_or_404(
            Conversation.objects.get_user_conversations(self.request.user),
            id=conversation_id,
        )

        return (
            Message.objects.visible_for_user(self.request.user)
            .filter(conversation=conversation)
            .select_related("sender")
        )


@extend_schema(tags=["Chat"])
class MessageCreateView(generics.CreateAPIView):
    serializer_class = MessageCreateSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def perform_create(self, serializer):
        message = serializer.save(sender=self.request.user)
        message.conversation.updated_at = timezone.now()
        message.conversation.save(update_fields=["updated_at"])
        return message

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = self.perform_create(serializer)

        # 🔔 WS orqali shu suhbat guruhiga real-time event
        channel_layer = get_channel_layer()
        group_name = f"chat_{message.conversation_id}"

        payload = MessageListSerializer(message, context={"request": request}).data
        async_to_sync(channel_layer.group_send)(
            group_name, {"type": "chat_message", "message": payload}
        )

        return Response(payload, status=status.HTTP_201_CREATED)


@extend_schema(tags=["Chat"])
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_messages_read(request, conversation_id):
    conversation = get_object_or_404(
        Conversation.objects.get_user_conversations(request.user), id=conversation_id
    )

    updated_count = Message.objects.unread_for_user_in_conversation(
        request.user, conversation
    ).update(is_read=True, read_at=timezone.now())

    return Response({"status": "success", "messages_marked_read": updated_count})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def message_action(request, message_id):
    message = get_object_or_404(
        Message.objects.filter(sender=request.user), id=message_id
    )

    serializer = MessageActionSerializer(
        data=request.data, context={"request": request, "message": message}
    )
    serializer.is_valid(raise_exception=True)

    action = serializer.validated_data["action"]
    success = False
    action_text = None
    if action == "delete_sender":
        success = message.delete_for_sender(request.user)
        action_text = "deleted for you"
    elif action == "delete_both":
        success = message.delete_for_both(request.user)
        action_text = "deleted for everyone"
    elif action == "recover":
        success = message.recover_message(request.user)
        action_text = "recovered"

    if success:
        return Response(
            {
                "status": "success",
                "message": f"Message {action_text} successfully",
                "message_data": MessageListSerializer(
                    message, context={"request": request}
                ).data,
            }
        )

    return Response(
        {"status": "error", "message": "Action could not be performed"},
        status=status.HTTP_400_BAD_REQUEST,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def block_user(request):
    serializer = BlockUserSerializer(data=request.data, context={"request": request})
    serializer.is_valid(raise_exception=True)

    blocked_user = User.objects.get(
        email=serializer.validated_data["user_email"], is_active=True
    )

    blocked_obj, created = BlockedUser.objects.get_or_create(
        blocker=request.user, blocked=blocked_user
    )

    return Response(
        {
            "status": "success",
            "message": f"User {blocked_user.full_name or blocked_user.email} blocked successfully",
            "blocked_user": BlockedUserSerializer(blocked_obj).data,
        }
    )


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def unblock_user(request, user_id):

    blocked_user = get_object_or_404(User, id=user_id, is_active=True)

    try:
        blocked_obj = BlockedUser.objects.get(
            blocker=request.user, blocked=blocked_user
        )
        blocked_obj.delete()

        return Response(
            {
                "status": "success",
                "message": f"User {blocked_user.full_name or blocked_user.email} unblocked successfully",
            }
        )
    except BlockedUser.DoesNotExist:
        return Response(
            {"status": "error", "message": "User is not blocked"},
            status=status.HTTP_400_BAD_REQUEST,
        )


class BlockedUserListView(generics.ListAPIView):

    serializer_class = BlockedUserSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get_queryset(self):
        return BlockedUser.objects.filter(blocker=self.request.user).select_related(
            "blocked"
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def unread_count(request):
    total_unread = Conversation.objects.get_unread_count_for_user(request.user)

    conversations = Conversation.objects.get_user_conversations(request.user)
    conversation_counts = {}

    for conversation in conversations:
        unread = Message.objects.unread_for_user_in_conversation(
            request.user, conversation
        ).count()
        if unread > 0:
            conversation_counts[str(conversation.id)] = unread

    serializer = UnreadCountSerializer(
        {"total_unread": total_unread, "conversations": conversation_counts}
    )

    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def user_search(request):
    query = request.GET.get("q", "").strip()

    if not query or len(query) < 2:
        return Response(
            {"results": [], "message": "Query must be at least 2 characters"}
        )

    users = (
        User.objects.filter(
            Q(email__icontains=query)
            | Q(first_name__icontains=query)
            | Q(last_name__icontains=query)
            | Q(full_name__icontains=query),
            is_active=True,
        )
        .exclude(id=request.user.id)
        .exclude(
            Q(blocked_by__blocker=request.user) | Q(blocking__blocked=request.user)
        )[:10]
    )

    from .serializers import UserSerializer

    serializer = UserSerializer(users, many=True, context={"request": request})

    return Response({"results": serializer.data, "count": len(serializer.data)})
