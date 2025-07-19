# config/asgi.py
import os
import django
from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()  # ← models, signals va s-chiziqlar to‘liq yuklanadi

# HTTP stack
django_asgi_app = get_asgi_application()

# WebSocket stack
from apps.chat.routing import websocket_urlpatterns  # noqa: E402  (import order)
from apps.chat.middleware import JWTAuthMiddlewareStack  # <— query-string JWT o‘rash

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": JWTAuthMiddlewareStack(  # Django session → JWT
            URLRouter(websocket_urlpatterns)
        ),
    }
)
