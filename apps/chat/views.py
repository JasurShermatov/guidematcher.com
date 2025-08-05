from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from .models import ChatRoom, Message
from .serializers import ChatRoomSerializer, MessageSerializer, MessageCreateSerializer
from .permissions import IsChatParticipant, CanSendMessage
from .pagination import ChatRoomPagination, MessagePagination
from apps.common.permissions import IsAuthenticated
from apps.notifications.services import NotificationService
from apps.chat.consumers import send_chat_notification
from asgiref.sync import async_to_sync
import logging

User = get_user_model()
logger = logging.getLogger(__name__)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def chat_rooms(request):
    """
    List chat rooms or create a new one
    """
    if request.method == "GET":
        try:
            rooms = ChatRoom.objects.filter(
                client=request.user
            ) | ChatRoom.objects.filter(guide=request.user)
            rooms = rooms.select_related("client", "guide").order_by("-last_message_at")
            paginator = ChatRoomPagination()
            page = paginator.paginate_queryset(rooms, request)
            serializer = ChatRoomSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)
        except Exception as e:
            logger.error(f"Error listing chat rooms for {request.user.email}: {str(e)}")
            return Response(
                {"detail": "Chat xonalarini olishda xatolik yuz berdi."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    elif request.method == "POST":
        try:
            guide_id = request.data.get("guide_id")
            guide = get_object_or_404(User, id=guide_id, role="Guide", is_active=True)
            if guide == request.user:
                return Response(
                    {"detail": "O'zingiz bilan chat boshlay olmaysiz."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            room, created = ChatRoom.objects.get_or_create(
                client=request.user, guide=guide, defaults={"is_active": True}
            )
            serializer = ChatRoomSerializer(room)
            status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
            return Response(serializer.data, status=status_code)
        except Exception as e:
            logger.error(f"Error creating chat room for {request.user.email}: {str(e)}")
            return Response(
                {"detail": "Chat xonasini yaratishda xatolik yuz berdi."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated, IsChatParticipant])
def chat_room_detail(request, room_id):
    """
    Get or update chat room details
    """
    room = get_object_or_404(ChatRoom, id=room_id)

    if request.method == "GET":
        try:
            serializer = ChatRoomSerializer(room)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Error retrieving chat room {room_id}: {str(e)}")
            return Response(
                {"detail": "Chat xonasini olishda xatolik yuz berdi."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    elif request.method == "PUT":
        try:
            is_active = request.data.get("is_active")
            if is_active is not None:
                room.is_active = is_active
                room.save(update_fields=["is_active"])
            serializer = ChatRoomSerializer(room)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Error updating chat room {room_id}: {str(e)}")
            return Response(
                {"detail": "Chat xonasini yangilashda xatolik yuz berdi."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsChatParticipant])
def chat_room_messages(request, room_id):
    """
    List messages in a chat room
    """
    try:
        room = get_object_or_404(ChatRoom, id=room_id)
        messages = (
            Message.objects.filter(room=room)
            .select_related("sender")
            .order_by("created_at")
        )
        paginator = MessagePagination()
        page = paginator.paginate_queryset(messages, request)
        serializer = MessageSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)
    except Exception as e:
        logger.error(f"Error listing messages for room {room_id}: {str(e)}")
        return Response(
            {"detail": "Xabarlarni olishda xatolik yuz berdi."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated, CanSendMessage])
def send_message(request, room_id):
    """
    Send a message to a chat room
    """
    try:
        room = get_object_or_404(ChatRoom, id=room_id)
        serializer = MessageCreateSerializer(
            data=request.data, context={"request": request, "room": room}
        )
        if serializer.is_valid():
            message = serializer.save()
            other_user = room.get_other_participant(request.user)
            message_data = MessageSerializer(message).data

            # Call NotificationService.send_message_notification synchronously
            async_to_sync(NotificationService.send_message_notification)(
                message, request.user, other_user
            )
            # Call send_chat_notification synchronously
            async_to_sync(send_chat_notification)(other_user.id, message_data)
            return Response(message_data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"Error sending message to room {room_id}: {str(e)}")
        return Response(
            {"detail": "Xabar yuborishda xatolik yuz berdi."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsChatParticipant])
def mark_message_read(request, message_id):
    """
    Mark a message as read
    """
    try:
        message = get_object_or_404(Message, id=message_id)
        if message.sender != request.user and not message.is_read:
            message.mark_as_read()
            message_data = MessageSerializer(message).data
            async_to_sync(send_chat_notification)(
                message.sender.id,
                {
                    "id": str(message.id),
                    "is_read": True,
                    "read_at": message.read_at.isoformat(),
                },
            )
            return Response(message_data)
        return Response(
            {"detail": "Xabar allaqachon o'qilgan yoki sizning xabaringiz."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except Exception as e:
        logger.error(f"Error marking message {message_id} as read: {str(e)}")
        return Response(
            {"detail": "Xabarni o'qilgan deb belgilashda xatolik yuz berdi."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
