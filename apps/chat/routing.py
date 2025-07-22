# apps/chat/routing.py
from django.urls import re_path
from apps.chat.consumers import ChatConsumer, ChatNotificationConsumer

# ══════════════════════════════════════════════════════════════════════
# WEBSOCKET URL PATTERNS
# ══════════════════════════════════════════════════════════════════════

websocket_urlpatterns = [
    # ─────────────────────────────────────────────────────────────────
    # Chat Room WebSocket
    # ─────────────────────────────────────────────────────────────────
    # Real-time chat for specific room
    # ws://domain/ws/chat/{room_id}/?token={jwt_token}
    re_path(
        r"ws/chat/(?P<room_id>[0-9a-f-]{36})/$",
        ChatConsumer.as_asgi(),
        name="chat_websocket",
    ),
    # ─────────────────────────────────────────────────────────────────
    # User Notifications WebSocket
    # ─────────────────────────────────────────────────────────────────
    # Global notifications for user (new messages, invitations, etc.)
    # ws://domain/ws/notifications/{user_id}/?token={jwt_token}
    re_path(
        r"ws/notifications/(?P<user_id>[0-9a-f-]{36})/$",
        ChatNotificationConsumer.as_asgi(),
        name="notifications_websocket",
    ),
]

# ══════════════════════════════════════════════════════════════════════
# AUTH MIDDLEWARE
# ══════════════════════════════════════════════════════════════════════

# apps/chat/auth.py
from urllib.parse import parse_qs
from django.contrib.auth.models import AnonymousUser
from django.contrib.auth import get_user_model
from channels.middleware import BaseMiddleware
import logging

logger = logging.getLogger(__name__)
User = get_user_model()


class QueryStringJWTAuthMiddleware(BaseMiddleware):
    """
    Optimized WebSocket JWT authentication middleware with better error handling.

    Supports:
    - JWT token in query string: ?token={jwt_token}
    - Optional room-based authorization
    - Comprehensive logging
    """

    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        """
        Authenticate WebSocket connection using JWT token from query string.
        """
        # Parse query string for token
        query_string = scope.get("query_string", b"").decode()
        query_params = parse_qs(query_string)
        token = query_params.get("token", [None])[0]

        # Initialize user as anonymous
        user = AnonymousUser()
        auth_error = None

        if token:
            try:
                # Import here to avoid circular imports
                from rest_framework_simplejwt.authentication import JWTAuthentication
                from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

                jwt_auth = JWTAuthentication()

                # Validate token
                validated_token = jwt_auth.get_validated_token(token)
                user = jwt_auth.get_user(validated_token)

                # Additional user validation
                if not user.is_active:
                    auth_error = "User account is disabled"
                    user = AnonymousUser()
                else:
                    logger.debug("WS auth success: user=%s", user.id)

            except InvalidToken as e:
                auth_error = f"Invalid JWT token: {str(e)}"
                logger.warning("WS auth failed - invalid token: %s", e)
            except TokenError as e:
                auth_error = f"Token error: {str(e)}"
                logger.warning("WS auth failed - token error: %s", e)
            except Exception as e:
                auth_error = f"Authentication error: {str(e)}"
                logger.error("WS auth failed - unexpected error: %s", e)
        else:
            auth_error = "No authentication token provided"
            logger.debug("WS auth failed - no token provided")

        # Add authentication info to scope
        scope["user"] = user
        scope["auth_error"] = auth_error
        scope["is_authenticated"] = user.is_authenticated

        # Call the next middleware/consumer
        return await self.inner(scope, receive, send)


class RoomPermissionMiddleware(BaseMiddleware):
    """
    Additional middleware for room-based permissions.
    Checks if user has access to specific chat room.
    """

    async def __call__(self, scope, receive, send):
        # Only process chat room connections
        if scope.get("type") == "websocket" and "room_id" in scope.get(
            "url_route", {}
        ).get("kwargs", {}):
            room_id = scope["url_route"]["kwargs"]["room_id"]
            user = scope.get("user")

            if user and user.is_authenticated:
                # Check room access asynchronously
                from channels.db import database_sync_to_async
                from apps.chat.models import ChatRoom

                @database_sync_to_async
                def check_room_access(user_id, room_id):
                    try:
                        return ChatRoom.objects.filter(
                            id=room_id, participants__id=user_id, is_active=True
                        ).exists()
                    except:
                        return False

                has_access = await check_room_access(user.id, room_id)
                scope["room_access"] = has_access

                if not has_access:
                    logger.warning(
                        "WS room access denied: user=%s room=%s", user.id, room_id
                    )
            else:
                scope["room_access"] = False

        return await self.inner(scope, receive, send)


# ══════════════════════════════════════════════════════════════════════
# MIDDLEWARE STACK
# ══════════════════════════════════════════════════════════════════════

# apps/chat/middleware.py
from channels.auth import AuthMiddlewareStack
from .auth import QueryStringJWTAuthMiddleware, RoomPermissionMiddleware


def JWTAuthMiddlewareStack(inner):
    """
    Enhanced middleware stack with JWT authentication and room permissions.

    Stack order (outer to inner):
    1. Django session auth (fallback)
    2. JWT auth from query string (primary)
    3. Room-based permissions
    4. Inner consumer
    """
    return QueryStringJWTAuthMiddleware(
        RoomPermissionMiddleware(AuthMiddlewareStack(inner))
    )


# ══════════════════════════════════════════════════════════════════════
# CONNECTION UTILITIES
# ══════════════════════════════════════════════════════════════════════


class WebSocketConnectionManager:
    """
    Utility class for managing WebSocket connections and groups.
    """

    @staticmethod
    def get_room_group_name(room_id: str) -> str:
        """Get group name for chat room."""
        return f"chat_{room_id}"

    @staticmethod
    def get_user_group_name(user_id: str) -> str:
        """Get group name for user notifications."""
        return f"user_{user_id}"

    @staticmethod
    def get_typing_group_name(room_id: str) -> str:
        """Get group name for typing indicators."""
        return f"typing_{room_id}"

    @classmethod
    async def notify_room(
        cls, channel_layer, room_id: str, event_type: str, data: dict
    ):
        """Send notification to all room participants."""
        group_name = cls.get_room_group_name(room_id)
        await channel_layer.group_send(
            group_name, {"type": f"chat.{event_type}", **data}
        )

    @classmethod
    async def notify_user(cls, channel_layer, user_id: str, notification_data: dict):
        """Send notification to specific user."""
        group_name = cls.get_user_group_name(user_id)
        await channel_layer.group_send(
            group_name, {"type": "chat.notification", **notification_data}
        )


# ══════════════════════════════════════════════════════════════════════
# WEBSOCKET UTILITIES
# ══════════════════════════════════════════════════════════════════════


def validate_websocket_message(
    message_data: dict, required_fields: list
) -> tuple[bool, str]:
    """
    Validate WebSocket message structure.

    Args:
        message_data: The message data to validate
        required_fields: List of required field names

    Returns:
        Tuple of (is_valid, error_message)
    """
    if not isinstance(message_data, dict):
        return False, "Message must be a JSON object"

    for field in required_fields:
        if field not in message_data:
            return False, f"Missing required field: {field}"

        # Check for empty strings/None
        if message_data[field] in [None, ""]:
            return False, f"Field '{field}' cannot be empty"

    return True, ""


def sanitize_websocket_data(data: dict) -> dict:
    """
    Sanitize WebSocket data to prevent XSS and other issues.

    Args:
        data: Raw data dictionary

    Returns:
        Sanitized data dictionary
    """
    import html

    sanitized = {}
    for key, value in data.items():
        if isinstance(value, str):
            # HTML escape string values
            sanitized[key] = html.escape(value.strip())
        elif isinstance(value, (int, float, bool)):
            sanitized[key] = value
        elif isinstance(value, dict):
            sanitized[key] = sanitize_websocket_data(value)
        elif isinstance(value, list):
            sanitized[key] = [
                html.escape(item) if isinstance(item, str) else item for item in value
            ]
        else:
            sanitized[key] = value

    return sanitized


# ══════════════════════════════════════════════════════════════════════
# CONFIGURATION CONSTANTS
# ══════════════════════════════════════════════════════════════════════

# WebSocket connection limits
WS_MAX_CONNECTIONS_PER_USER = 5
WS_MESSAGE_RATE_LIMIT = 30  # messages per minute
WS_TYPING_TIMEOUT = 5  # seconds
WS_PING_INTERVAL = 30  # seconds

# Message size limits
WS_MAX_MESSAGE_SIZE = 1024 * 50  # 50KB for text messages
WS_MAX_LOCATION_ACCURACY = 8  # decimal places for lat/lng

# Group size limits
WS_MAX_ROOM_PARTICIPANTS = 100
WS_MAX_NOTIFICATION_BATCH = 50
