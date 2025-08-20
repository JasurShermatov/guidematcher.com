# apps/chat/urls.py
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_nested.routers import NestedDefaultRouter
from apps.chat.views import (
    ChatRoomViewSet,
    MessageViewSet,
    MessageReadListView,
    TypingStatusView,
    ActiveTypersView,
    # BookingChatViewSet -> agar views.py da yozilmagan bo‘lsa, import qilmang!
)

# ==================== MAIN ROUTER ====================
router = DefaultRouter()
router.register(r"rooms", ChatRoomViewSet, basename="chat-room")

# Agar BookingChatViewSet mavjud bo‘lsa, ochamiz:
# router.register(r"booking-chats", BookingChatViewSet, basename="booking-chat")

# ==================== NESTED ROUTERS ====================
rooms_router = NestedDefaultRouter(router, r"rooms", lookup="room")
rooms_router.register(r"messages", MessageViewSet, basename="room-messages")

# ==================== APP CONFIG ====================
app_name = "chat"

# ==================== URL PATTERNS ====================
urlpatterns = [
    # Asosiy routerlar
    path("", include(router.urls)),
    path("", include(rooms_router.urls)),
    # Xabarlarni o‘qilgan qilib belgilash (read receipts)
    path(
        "rooms/<uuid:room_pk>/messages/<uuid:message_pk>/read-receipts/",
        MessageReadListView.as_view(),
        name="message-read-receipts",
    ),
    # Typing status
    path(
        "rooms/<uuid:room_pk>/typing/",
        TypingStatusView.as_view(),
        name="typing-status",
    ),
    path(
        "rooms/<uuid:room_pk>/typing/active/",
        ActiveTypersView.as_view(),
        name="active-typers",
    ),
]
