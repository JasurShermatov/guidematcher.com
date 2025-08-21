import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack

# Devda Origin validatorni vaqtincha olib turamiz (Postman muammosi bo‘lsa)
# from channels.security.websocket import AllowedHostsOriginValidator
from apps.chat import routing as chat_routing

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

django_asgi_app = get_asgi_application()

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": AuthMiddlewareStack(URLRouter(chat_routing.websocket_urlpatterns)),
    }
)
