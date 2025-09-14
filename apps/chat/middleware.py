# apps/chat/middleware.py
import logging
from urllib.parse import parse_qs
from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import UntypedToken, AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

logger = logging.getLogger(__name__)


class JWTAuthMiddleware(BaseMiddleware):

    def __init__(self, inner):
        super().__init__(inner)

    async def __call__(self, scope, receive, send):
        scope["user"] = await self.get_user_from_scope(scope)
        return await super().__call__(scope, receive, send)

    @database_sync_to_async
    def get_user_from_scope(self, scope):
        try:
            # Try to get token from query string
            query_string = scope.get("query_string", b"").decode()
            query_params = parse_qs(query_string)
            token = query_params.get("token", [None])[0]

            if not token:
                headers = dict(scope.get("headers", []))
                auth_header = headers.get(b"authorization", b"").decode()

                if auth_header:
                    if auth_header.startswith("Bearer "):
                        token = auth_header.split(" ", 1)[1]
                    else:
                        token = auth_header

            if not token:
                logger.debug("No token provided in WebSocket connection")
                return AnonymousUser()

            try:
                UntypedToken(token)

                access_token = AccessToken(token)
                user_id = access_token.get("user_id")

                if not user_id:
                    logger.debug("No user_id found in token")
                    return AnonymousUser()

                from apps.users.models import User

                user = User.objects.select_related().get(id=user_id, is_active=True)
                logger.debug(f"WebSocket authenticated user: {user.id}")
                return user

            except (InvalidToken, TokenError) as e:
                logger.debug(f"Invalid token: {e}")
                return AnonymousUser()
            except User.DoesNotExist:
                logger.debug(f"User {user_id} not found or inactive")
                return AnonymousUser()

        except Exception as e:
            logger.exception(f"Error during WebSocket authentication: {e}")
            return AnonymousUser()


def JWTAuthMiddlewareStack(inner):
    return JWTAuthMiddleware(inner)
