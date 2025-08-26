# ============================================
# apps/chat/urls.py - PROFESSIONAL VERSION
# ============================================

from django.urls import path

from .views import (
    ConversationListCreateView,
    ConversationDetailView,
    MessageListView,
    MessageCreateView,
    accept_booking_in_chat,
    update_booking_dates,
    cancel_booking_in_chat,
    block_user_view,
    unblock_user_view,
)

app_name = "chat"

urlpatterns = [
    path(
        "conversations/",
        ConversationListCreateView.as_view(),
        name="conversation-list",
    ),
    path(
        "conversations/<int:pk>/",
        ConversationDetailView.as_view(),
        name="conversation-detail",
    ),
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
    path(
        "conversations/<int:conversation_id>/bookings/<int:booking_id>/cancel/",
        cancel_booking_in_chat,
        name="cancel-booking",
    ),
    path(
        "users/block/<int:user_id>/",
        block_user_view,
        name="block-user",
    ),
    path(
        "users/unblock/<int:blocked_user_id>/",
        unblock_user_view,
        name="unblock-user",
    ),
]
