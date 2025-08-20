# apps/chat/auth.py
from urllib.parse import parse_qs
from django.contrib.auth.models import AnonymousUser
from django.contrib.auth import get_user_model
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
import logging

logger = logging.getLogger(__name__)
User = get_user_model()


class QueryStringJWTAuthMiddleware(BaseMiddleware):
    """
    WebSocket JWT authentication through query string.

    Usage:
        ws://domain/ws/chat/<room_id>/?token=<JWT_TOKEN>

    Example:
        const token = localStorage.getItem('access_token');
        const ws = new WebSocket(`ws://localhost:8000/ws/chat/${roomId}/?token=${token}`);
    """

    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        """
        Authenticate WebSocket connection using JWT from query string.
        """
        try:
            # Parse query string
            query_string = scope.get("query_string", b"").decode()
            query_params = parse_qs(query_string)
            token = query_params.get("token", [None])[0]

            # Default to anonymous
            user = AnonymousUser()
            auth_error = None

            if token:
                # Authenticate with JWT
                user = await self.authenticate_jwt(token)
                if user:
                    logger.info(f"WebSocket authenticated: user={user.id}")
                else:
                    auth_error = "Invalid or expired token"
                    user = AnonymousUser()
            else:
                auth_error = "No authentication token provided"
                logger.debug("WebSocket connection without token")

            # Add to scope
            scope["user"] = user
            scope["auth_error"] = auth_error
            scope["is_authenticated"] = user.is_authenticated

        except Exception as e:
            logger.error(f"Auth middleware error: {e}")
            scope["user"] = AnonymousUser()
            scope["auth_error"] = str(e)
            scope["is_authenticated"] = False

        return await self.inner(scope, receive, send)

    @database_sync_to_async
    def authenticate_jwt(self, token):
        """
        Authenticate JWT token and return user.
        """
        try:
            jwt_auth = JWTAuthentication()
            validated_token = jwt_auth.get_validated_token(token)
            user = jwt_auth.get_user(validated_token)

            if user and user.is_active:
                return user

            return None

        except (InvalidToken, TokenError) as e:
            logger.warning(f"JWT validation failed: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected auth error: {e}")
            return None


class RoomPermissionMiddleware(BaseMiddleware):
    """
    Check room access permissions for WebSocket connections.
    """

    async def __call__(self, scope, receive, send):
        """
        Verify user has access to the requested chat room.
        """
        # Only check for chat room WebSocket connections
        if scope.get("type") == "websocket" and "room_id" in scope.get(
            "url_route", {}
        ).get("kwargs", {}):
            room_id = scope["url_route"]["kwargs"]["room_id"]
            user = scope.get("user")

            if user and user.is_authenticated:
                has_access = await self.check_room_access(user.id, room_id)
                scope["room_access"] = has_access

                if not has_access:
                    logger.warning(
                        f"Room access denied: user={user.id}, room={room_id}"
                    )
            else:
                scope["room_access"] = False
                logger.debug(f"Unauthenticated access attempt to room {room_id}")

        return await self.inner(scope, receive, send)

    @database_sync_to_async
    def check_room_access(self, user_id, room_id):
        """
        Check if user is participant of the room.
        """
        from apps.chat.models import ChatRoom

        try:
            return ChatRoom.objects.filter(
                id=room_id, participants__id=user_id, is_active=True
            ).exists()
        except Exception as e:
            logger.error(f"Room access check error: {e}")
            return False


# Middleware Stack Builder
def build_jwt_auth_stack(inner):
    """
    Build complete authentication middleware stack for WebSocket.

    Order:
    1. JWT Authentication from query string
    2. Room permission check
    3. Inner consumer
    """
    from channels.auth import AuthMiddlewareStack

    return QueryStringJWTAuthMiddleware(
        RoomPermissionMiddleware(AuthMiddlewareStack(inner))
    )
