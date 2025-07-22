from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_nested.routers import NestedDefaultRouter
from apps.chat.views import (
    ChatRoomViewSet,
    MessageViewSet,
    MessageReadListView,
    TypingStatusView,
    ActiveTypersView,
)

# Routers
router = DefaultRouter()
router.register(r"chats", ChatRoomViewSet, basename="chat-room")

nested_router = NestedDefaultRouter(router, r"chats", lookup="room")
nested_router.register(r"messages", MessageViewSet, basename="chat-message")

# URL patterns
urlpatterns = [
    path("", include(router.urls)),
    path("", include(nested_router.urls)),
    # Read receipts
    path(
        "chats/<uuid:room_pk>/messages/<uuid:message_pk>/read-receipts/",
        MessageReadListView.as_view(),
        name="message-read-receipts",
    ),
    # Typing status
    path(
        "chats/<uuid:room_pk>/typing/",
        TypingStatusView.as_view(),
        name="typing-status",
    ),
    path(
        "chats/<uuid:room_pk>/typing/active/",
        ActiveTypersView.as_view(),
        name="active-typers",
    ),
]
