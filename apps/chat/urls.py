from django.urls import path
from . import views

app_name = "chat"

urlpatterns = [
    path("rooms/", views.chat_rooms, name="chat_rooms"),
    path("rooms/<uuid:room_id>/", views.chat_room_detail, name="chat_room_detail"),
    path(
        "rooms/<uuid:room_id>/messages/",
        views.chat_room_messages,
        name="chat_room_messages",
    ),
    path("rooms/<uuid:room_id>/send/", views.send_message, name="send_message"),
    path(
        "messages/<uuid:message_id>/read/",
        views.mark_message_read,
        name="mark_message_read",
    ),
]
