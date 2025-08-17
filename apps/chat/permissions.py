from rest_framework import permissions
from django.contrib.auth import get_user_model
from .models import ChatRoom

User = get_user_model()


class IsChatParticipant(permissions.BasePermission):
    """
    Allows access only to chat room participants
    """

    def has_object_permission(self, request, view, obj):
        return request.user.is_authenticated and (
            isinstance(obj, ChatRoom)
            and (obj.client == request.user or obj.guide == request.user)
        )


class CanSendMessage(permissions.BasePermission):
    """
    Allows sending messages only if user is a participant and chat room is active
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        room_id = view.kwargs.get("room_id")
        try:
            room = ChatRoom.objects.get(id=room_id)
            return room.is_active and (
                room.client == request.user or room.guide == request.user
            )
        except ChatRoom.DoesNotExist:
            return False
