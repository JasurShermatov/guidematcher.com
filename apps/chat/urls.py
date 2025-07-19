# apps/chat/urls.py
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_nested.routers import NestedDefaultRouter

from apps.chat.views import (
    ChatRoomViewSet,
    MessageViewSet,
    MessageReadListView,
    TypingStatusView,
)

router = DefaultRouter()
router.register(r"chats", ChatRoomViewSet, basename="chat-room")

nested = NestedDefaultRouter(router, r"chats", lookup="room")  # /chats/{uuid}/...
nested.register(r"messages", MessageViewSet, basename="chat-message")

urlpatterns = [
    path("", include(router.urls)),
    path("", include(nested.urls)),
    # ➜ /chats/<room>/messages/<msg>/reads/
    path(
        "chats/<uuid:room_pk>/messages/<uuid:message_pk>/reads/",
        MessageReadListView.as_view(),
        name="message-read-list",
    ),
    # ➜ /chats/<room>/typing/
    path(
        "chats/<uuid:room_pk>/typing/",
        TypingStatusView.as_view(),
        name="typing-status",
    ),
]
