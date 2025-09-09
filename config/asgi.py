# config/asgi.py
import os
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

# HTTP uchun klassik Django ASGI app
django_asgi_app = get_asgi_application()

# Channels importlari (Django initdan keyin)
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator

from apps.chat.middleware import JWTAuthMiddlewareStack
from apps.chat.routing import websocket_urlpatterns as chat_ws_patterns

# 👇 MUHIM: "application" nomli global obyekt BO‘LISHI SHART
application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": AllowedHostsOriginValidator(
            JWTAuthMiddlewareStack(URLRouter(chat_ws_patterns))
        ),
    }
)
