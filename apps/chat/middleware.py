from channels.auth import AuthMiddlewareStack
from .auth import QueryStringJWTAuthMiddleware, RoomPermissionMiddleware


def JWTAuthMiddlewareStack(inner):
    return QueryStringJWTAuthMiddleware(
        RoomPermissionMiddleware(AuthMiddlewareStack(inner))
    )
