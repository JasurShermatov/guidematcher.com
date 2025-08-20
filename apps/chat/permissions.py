# apps/common/permissions.py
"""
Custom permissions for chat functionality.
"""
from rest_framework import permissions
from apps.chat.models import ChatRoom
import logging

logger = logging.getLogger(__name__)


class IsChatParticipant(permissions.BasePermission):
    """
    Permission to check if user is participant of chat room.

    Usage in ViewSet:
        permission_classes = [IsChatParticipant]
    """

    message = "You are not a participant of this chat room."

    def has_permission(self, request, view):
        """
        Check if user can access the room.
        """
        # User must be authenticated
        if not request.user.is_authenticated:
            return False

        # Get room_pk from URL kwargs
        room_pk = view.kwargs.get("room_pk") or view.kwargs.get("pk")

        # If no room_pk, allow (will be handled by view)
        if not room_pk:
            return True

        # Check room participation
        try:
            room = ChatRoom.objects.get(pk=room_pk, is_active=True)
            is_participant = room.participants.filter(id=request.user.id).exists()

            if not is_participant:
                logger.warning(
                    f"Access denied: user={request.user.id} not in room={room_pk}"
                )

            return is_participant

        except ChatRoom.DoesNotExist:
            logger.error(f"Room not found: {room_pk}")
            return False

    def has_object_permission(self, request, view, obj):
        """
        Check object-level permissions.
        """
        # For message objects
        if hasattr(obj, "room"):
            return obj.room.participants.filter(id=request.user.id).exists()

        # For room objects
        if hasattr(obj, "participants"):
            return obj.participants.filter(id=request.user.id).exists()

        return False


class IsMessageOwner(permissions.BasePermission):
    """
    Permission to check if user owns the message.
    """

    message = "You can only modify your own messages."

    def has_object_permission(self, request, view, obj):
        """
        Check if user is the message sender.
        """
        # Read permissions for all participants
        if request.method in permissions.SAFE_METHODS:
            if hasattr(obj, "room"):
                return obj.room.participants.filter(id=request.user.id).exists()
            return True

        # Write permissions only for owner
        return obj.sender == request.user


# apps/common/pagination.py
"""
Custom pagination classes for API responses.
"""
from rest_framework.pagination import PageNumberPagination, CursorPagination
from rest_framework.response import Response


class StandardResultsSetPagination(PageNumberPagination):
    """
    Standard pagination with detailed metadata.

    Response format:
    {
        "count": 100,
        "next": "http://api/endpoint/?page=2",
        "previous": null,
        "page_size": 20,
        "current_page": 1,
        "total_pages": 5,
        "results": [...]
    }
    """

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100
    page_query_param = "page"

    def get_paginated_response(self, data):
        """
        Return paginated response with metadata.
        """
        return Response(
            {
                "count": self.page.paginator.count,
                "next": self.get_next_link(),
                "previous": self.get_previous_link(),
                "page_size": self.get_page_size(self.request),
                "current_page": self.page.number,
                "total_pages": self.page.paginator.num_pages,
                "results": data,
            }
        )


class ChatMessagePagination(CursorPagination):
    """
    Cursor-based pagination for chat messages.
    Better for real-time chat with continuous scrolling.
    """

    cursor_query_param = "cursor"
    page_size = 50
    ordering = "-created_at"  # Latest messages first
    cursor_query_description = "The pagination cursor value."
    page_size_query_param = "page_size"
    max_page_size = 200

    def get_paginated_response(self, data):
        """
        Return cursor-paginated response.
        """
        return Response(
            {
                "next": self.get_next_link(),
                "previous": self.get_previous_link(),
                "results": data,
            }
        )


class LargePagination(PageNumberPagination):
    """
    Pagination for large datasets.
    """

    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 500
