# apps/chat/urls.py
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_nested.routers import NestedDefaultRouter

from apps.chat.views import (
    ChatRoomViewSet,
    MessageViewSet,
    MessageReadListView,
    TypingStatusView,
    ChatCleanupView,
)

# ══════════════════════════════════════════════════════════════════════
# MAIN ROUTER CONFIGURATION
# ══════════════════════════════════════════════════════════════════════

# Main chat rooms router
router = DefaultRouter()
router.register(r"chats", ChatRoomViewSet, basename="chat-room")

# Nested router for messages under chat rooms
# /api/chats/{uuid}/messages/
nested_router = NestedDefaultRouter(router, r"chats", lookup="room")
nested_router.register(r"messages", MessageViewSet, basename="chat-message")

# ══════════════════════════════════════════════════════════════════════
# URL PATTERNS
# ══════════════════════════════════════════════════════════════════════

urlpatterns = [
    # ─────────────────────────────────────────────────────────────────
    # Main router URLs
    # ─────────────────────────────────────────────────────────────────
    path("", include(router.urls)),
    path("", include(nested_router.urls)),
    # ─────────────────────────────────────────────────────────────────
    # Chat Room specific endpoints
    # ─────────────────────────────────────────────────────────────────
    # Chat room statistics
    # GET /api/chats/statistics/
    path(
        "chats/statistics/",
        ChatRoomViewSet.as_view({"get": "statistics"}),
        name="chat-room-statistics",
    ),
    # Unread rooms
    # GET /api/chats/unread-rooms/
    path(
        "chats/unread-rooms/",
        ChatRoomViewSet.as_view({"get": "unread_rooms"}),
        name="chat-room-unread",
    ),
    # Mark all messages in room as read
    # POST /api/chats/{room_id}/mark-all-read/
    path(
        "chats/<uuid:pk>/mark-all-read/",
        ChatRoomViewSet.as_view({"post": "mark_all_read"}),
        name="chat-room-mark-all-read",
    ),
    # ─────────────────────────────────────────────────────────────────
    # Message specific endpoints
    # ─────────────────────────────────────────────────────────────────
    # Single message read status
    # POST /api/chats/{room_id}/messages/{message_id}/mark-read/
    path(
        "chats/<uuid:room_pk>/messages/<uuid:pk>/mark-read/",
        MessageViewSet.as_view({"post": "mark_read"}),
        name="message-mark-read",
    ),
    # Bulk mark messages as read
    # POST /api/chats/{room_id}/messages/bulk-mark-read/
    path(
        "chats/<uuid:room_pk>/messages/bulk-mark-read/",
        MessageViewSet.as_view({"post": "bulk_mark_read"}),
        name="message-bulk-mark-read",
    ),
    # Get unread message count for room
    # GET /api/chats/{room_id}/messages/unread-count/
    path(
        "chats/<uuid:room_pk>/messages/unread-count/",
        MessageViewSet.as_view({"get": "unread_count"}),
        name="message-unread-count",
    ),
    # ─────────────────────────────────────────────────────────────────
    # Read receipts endpoints
    # ─────────────────────────────────────────────────────────────────
    # Get read receipts for specific message
    # GET /api/chats/{room_id}/messages/{message_id}/read-receipts/
    path(
        "chats/<uuid:room_pk>/messages/<uuid:message_pk>/read-receipts/",
        MessageReadListView.as_view(),
        name="message-read-receipts",
    ),
    # ─────────────────────────────────────────────────────────────────
    # Typing status endpoints
    # ─────────────────────────────────────────────────────────────────
    # Get/Update typing status for current user in room
    # GET/PUT/PATCH /api/chats/{room_id}/typing/
    path(
        "chats/<uuid:room_pk>/typing/",
        TypingStatusView.as_view(),
        name="typing-status",
    ),
    # Get active typers in room (excluding current user)
    # GET /api/chats/{room_id}/typing/active-typers/
    path(
        "chats/<uuid:room_pk>/typing/active-typers/",
        TypingStatusView.as_view({"get": "active_typers"}),
        name="active-typers",
    ),
    # ─────────────────────────────────────────────────────────────────
    # Admin/Utility endpoints
    # ─────────────────────────────────────────────────────────────────
    # Cleanup old typing statuses (Admin only)
    # POST /api/chats/admin/cleanup-typing/
    path(
        "chats/admin/cleanup-typing/",
        ChatCleanupView.as_view({"post": "cleanup_typing_statuses"}),
        name="admin-cleanup-typing",
    ),
    # Recalculate room statistics (Admin only)
    # POST /api/chats/admin/recalculate-stats/
    path(
        "chats/admin/recalculate-stats/",
        ChatCleanupView.as_view({"post": "recalculate_room_stats"}),
        name="admin-recalculate-stats",
    ),
]

# ══════════════════════════════════════════════════════════════════════
# API DOCUMENTATION
# ══════════════════════════════════════════════════════════════════════

"""
Chat API Endpoints Documentation:

CHAT ROOMS:
-----------
GET    /api/chats/                         - List user's chat rooms (paginated)
POST   /api/chats/                         - Create new chat room
GET    /api/chats/{id}/                     - Get chat room details
PUT    /api/chats/{id}/                     - Update chat room
DELETE /api/chats/{id}/                     - Delete chat room
GET    /api/chats/statistics/               - Get user's chat statistics
GET    /api/chats/unread-rooms/             - Get rooms with unread messages
POST   /api/chats/{id}/mark-all-read/       - Mark all messages in room as read

MESSAGES:
---------
GET    /api/chats/{room_id}/messages/                    - List messages in room
POST   /api/chats/{room_id}/messages/                    - Send new message
GET    /api/chats/{room_id}/messages/{id}/               - Get message details
PUT    /api/chats/{room_id}/messages/{id}/               - Edit message
DELETE /api/chats/{room_id}/messages/{id}/               - Delete message
POST   /api/chats/{room_id}/messages/{id}/mark-read/     - Mark message as read
POST   /api/chats/{room_id}/messages/bulk-mark-read/     - Bulk mark as read
GET    /api/chats/{room_id}/messages/unread-count/       - Get unread count

READ RECEIPTS:
--------------
GET    /api/chats/{room_id}/messages/{msg_id}/read-receipts/  - Get read receipts

TYPING STATUS:
--------------
GET    /api/chats/{room_id}/typing/                      - Get typing status
PUT    /api/chats/{room_id}/typing/                      - Update typing status
GET    /api/chats/{room_id}/typing/active-typers/        - Get active typers

ADMIN/UTILITIES:
----------------
POST   /api/chats/admin/cleanup-typing/                  - Cleanup old typing (Admin)
POST   /api/chats/admin/recalculate-stats/               - Recalculate stats (Admin)

WEBSOCKET:
----------
ws://domain/ws/chat/{room_id}/?token={jwt_token}         - Real-time chat
ws://domain/ws/notifications/{user_id}/?token={jwt_token} - User notifications

FILTERS & SEARCH:
-----------------
Chat Rooms:
- ?room_type=direct|booking|support
- ?is_active=true|false
- ?search=query
- ?ordering=-last_activity_at

Messages:
- ?message_type=text|image|file|audio|video|location|system
- ?sender={user_id}
- ?is_deleted=true|false
- ?ordering=created_at

PAGINATION:
-----------
All list endpoints support pagination with:
- ?page=1
- ?page_size=20 (default: 20, max: 100)

Response format:
{
    "count": 150,
    "next": "url_to_next_page",
    "previous": "url_to_previous_page", 
    "results": [...]
}

PERMISSIONS:
------------
- IsAuthenticated: All endpoints require authentication
- IsChatParticipant: Message endpoints require user to be room participant
- IsOwnerOrReadOnly: Users can only edit/delete their own messages
- IsStaffUser: Admin endpoints require staff permissions

ERROR CODES:
------------
- 400: Bad Request (validation errors)
- 401: Unauthorized (no authentication)
- 403: Forbidden (no permission)
- 404: Not Found (resource doesn't exist)
- 429: Too Many Requests (rate limiting)
- 500: Internal Server Error

WEBSOCKET EVENTS:
-----------------
Client -> Server:
- message.send: Send text message
- location.send: Send location
- file.broadcast: Broadcast uploaded file
- typing: Update typing status
- read: Mark messages as read
- ping: Keepalive

Server -> Client:
- message: New message received
- typing: User typing status changed
- read: Messages marked as read
- room_updated: Room statistics updated
- system: System notification
- error: Error occurred
- pong: Ping response
"""
