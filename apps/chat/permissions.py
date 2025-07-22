# apps/common/permissions.py (if not exists)
from rest_framework import permissions
from apps.chat.models import ChatRoom


class IsChatParticipant(permissions.BasePermission):
    """
    Permission to check if user is participant of chat room.
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        # Get room_pk from URL kwargs
        room_pk = view.kwargs.get("room_pk") or view.kwargs.get("pk")
        if not room_pk:
            return True  # Let view handle this

        try:
            room = ChatRoom.objects.get(pk=room_pk)
            return room.participants.filter(id=request.user.id).exists()
        except ChatRoom.DoesNotExist:
            return False

    def has_object_permission(self, request, view, obj):
        # For message objects, check room participation
        if hasattr(obj, "room"):
            return obj.room.participants.filter(id=request.user.id).exists()

        # For room objects
        if hasattr(obj, "participants"):
            return obj.participants.filter(id=request.user.id).exists()

        return False
