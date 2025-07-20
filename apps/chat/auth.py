#  apps/chat/auth.py
from urllib.parse import parse_qs
from django.contrib.auth.models import AnonymousUser


class QueryStringJWTAuthMiddleware:
    """
    WebSocket uchun JWT query string token bilan autentifikatsiya.
    URL: ws://.../ws/chat/<room_id>/?token=<JWT>
    """

    def __init__(self, inner):
        self.inner = inner

    def __call__(self, scope):
        return QueryStringJWTAuthMiddlewareInstance(scope, self.inner)


class QueryStringJWTAuthMiddlewareInstance:
    def __init__(self, scope, inner):
        self.scope = scope
        self.inner = inner

    async def __call__(self, receive, send):
        from rest_framework_simplejwt.authentication import JWTAuthentication
        from rest_framework_simplejwt.exceptions import InvalidToken

        query_string = self.scope.get("query_string", b"").decode()
        query_params = parse_qs(query_string)
        token = query_params.get("token", [None])[0]

        user = AnonymousUser()
        if token:
            try:
                jwt_auth = JWTAuthentication()
                validated_token = jwt_auth.get_validated_token(token)
                user = jwt_auth.get_user(validated_token)
            except InvalidToken:
                pass

        self.scope["user"] = user
        return await self.inner(self.scope, receive, send)
