from rest_framework.routers import DefaultRouter
from rest_framework_nested.routers import NestedDefaultRouter
from django.urls import path, include

from apps.chat.views import (
    ChatRoomViewSet,
    MessageViewSet,
    MessageReadListView,
    TypingStatusView,
)

router = DefaultRouter()
router.register(r"chats", ChatRoomViewSet, basename="chat-room")

nested = NestedDefaultRouter(router, r"chats", lookup="room")
nested.register(r"messages", MessageViewSet, basename="chat-messages")

urlpatterns = [
    path("", include(router.urls)),
    path("", include(nested.urls)),
    # reads list
    path(
        "chats/<uuid:room_pk>/messages/<uuid:message_pk>/reads/",
        MessageReadListView.as_view(),
        name="message-read-list",
    ),
    # typing status
    path(
        "chats/<uuid:room_pk>/typing/",
        TypingStatusView.as_view(),
        name="typing-status",
    ),
]
