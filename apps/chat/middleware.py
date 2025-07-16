# apps/chat/middleware.py
from channels.auth import AuthMiddlewareStack

from .auth import QueryStringJWTAuthMiddleware


def JWTAuthMiddlewareStack(inner):
    """
    Standart Channels AuthMiddlewareStack ustiga bizning QueryString JWT ni qo‘shamiz.
    Avval Django session auth, keyin query-string JWT override.
    """
    return QueryStringJWTAuthMiddleware(AuthMiddlewareStack(inner))
