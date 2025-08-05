# apps/chat/middleware.py

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from urllib.parse import parse_qs
import jwt
from django.conf import settings

User = get_user_model()


@database_sync_to_async
def get_user(user_id):
    """Get user by ID"""
    try:
        return User.objects.get(id=user_id)
    except User.DoesNotExist:
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    """
    Custom middleware for JWT authentication in WebSocket connections
    """

    async def __call__(self, scope, receive, send):
        # Get token from query string
        query_string = scope.get("query_string", b"").decode()
        query_params = parse_qs(query_string)
        token = query_params.get("token", [None])[0]

        if token:
            try:
                # Validate token
                UntypedToken(token)

                # Decode token to get user ID
                decoded_data = jwt.decode(
                    token, settings.SECRET_KEY, algorithms=["HS256"]
                )
                user_id = decoded_data.get("user_id")

                if user_id:
                    scope["user"] = await get_user(user_id)
                else:
                    scope["user"] = AnonymousUser()

            except (InvalidToken, TokenError, jwt.DecodeError):
                scope["user"] = AnonymousUser()
        else:
            scope["user"] = AnonymousUser()

        return await super().__call__(scope, receive, send)


def JWTAuthMiddlewareStack(inner):
    """
    WebSocket authentication middleware stack
    """
    return JWTAuthMiddleware(inner)
