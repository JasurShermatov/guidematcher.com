# config/asgi.py
import os
import django
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()  # <--- muhim

django_asgi_app = get_asgi_application()

from apps.chat.routing import websocket_urlpatterns  # noqa: E402

# Sizning QueryStringJWTAuthMiddleware bilan o'rash
from apps.chat.middleware import JWTAuthMiddlewareStack  # wrapper

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": JWTAuthMiddlewareStack(URLRouter(websocket_urlpatterns)),
    }
)
