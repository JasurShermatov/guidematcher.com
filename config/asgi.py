import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator

# Django settings ni o'rnatish
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

# Django ASGI application
django_asgi_app = get_asgi_application()

# WebSocket routing va middleware import
from apps.chat.routing import websocket_urlpatterns
from apps.chat.middleware import JWTAuthMiddlewareStack

# ASGI application configuration
application = ProtocolTypeRouter(
    {
        # HTTP uchun Django
        "http": django_asgi_app,
        # WebSocket uchun Channels with JWT authentication
        "websocket": AllowedHostsOriginValidator(
            JWTAuthMiddlewareStack(URLRouter(websocket_urlpatterns))
        ),
    }
)
