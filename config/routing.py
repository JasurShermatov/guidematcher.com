from django.urls import re_path
from apps.chat import routing as chat_routing

websocket_urlpatterns = [
    *chat_routing.websocket_urlpatterns,
]
