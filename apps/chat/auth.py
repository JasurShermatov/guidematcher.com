from urllib.parse import parse_qs
from django.contrib.auth.models import AnonymousUser
from django.contrib.auth import get_user_model
from channels.middleware import BaseMiddleware
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from channels.db import database_sync_to_async
import logging

logger = logging.getLogger(__name__)
User = get_user_model()


class QueryStringJWTAuthMiddleware(BaseMiddleware):
    """
    WebSocket orqali JWT query string orqali autentifikatsiya.
    Misol: ws://host/ws/chat/<room_id>/?token=<JWT>
    """

    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        query_string = scope.get("query_string", b"").decode()
        query_params = parse_qs(query_string)
        token = query_params.get("token", [None])[0]

        user = AnonymousUser()
        auth_error = None

        if token:
            try:
                jwt_auth = JWTAuthentication()
                validated_token = jwt_auth.get_validated_token(token)
                user = jwt_auth.get_user(validated_token)

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

        scope["user"] = user
        scope["auth_error"] = auth_error
        scope["is_authenticated"] = user.is_authenticated

        return await self.inner(scope, receive, send)


class RoomPermissionMiddleware(BaseMiddleware):
    """
    Xonaga kirish huquqini tekshiruvchi middleware.
    """

    async def __call__(self, scope, receive, send):
        if scope.get("type") == "websocket" and "room_id" in scope.get(
            "url_route", {}
        ).get("kwargs", {}):
            room_id = scope["url_route"]["kwargs"]["room_id"]
            user = scope.get("user")

            if user and user.is_authenticated:

                @database_sync_to_async
                def check_room_access(user_id, room_id):
                    from apps.chat.models import ChatRoom

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
