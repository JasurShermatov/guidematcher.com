from django.urls import path
from .views import (
    ConversationListCreateView,
    ConversationDetailView,
    MessageListView,
    MessageCreateView,
    accept_booking_in_chat,
    update_booking_dates,  # ⚠️ bu sizning views.py da shunday nomlangan
)

urlpatterns = [
    # Conversations
    path(
        "conversations/", ConversationListCreateView.as_view(), name="conversation-list"
    ),
    path(
        "conversations/<int:pk>/",
        ConversationDetailView.as_view(),
        name="conversation-detail",
    ),
    # Messages
    path(
        "conversations/<int:conversation_id>/messages/",
        MessageListView.as_view(),
        name="message-list",
    ),
    path(
        "messages/send/",
        MessageCreateView.as_view(),
        name="message-create",
    ),
    # Booking endpoints
    path(
        "conversations/<int:conversation_id>/bookings/<int:booking_id>/accept/",
        accept_booking_in_chat,
        name="accept-booking",
    ),
    path(
        "conversations/<int:conversation_id>/bookings/<int:booking_id>/update/",
        update_booking_dates,
        name="update-booking",
    ),
]
