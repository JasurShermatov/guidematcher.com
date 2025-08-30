# urls.py
from django.urls import path
from . import views

app_name = "chat"

urlpatterns = [
    # Conversation endpoints
    path(
        "conversations/",
        views.ConversationListCreateView.as_view(),
        name="conversation-list-create",
    ),
    path(
        "conversations/<int:pk>/",
        views.ConversationDetailView.as_view(),
        name="conversation-detail",
    ),
    # Message endpoints
    path(
        "conversations/<int:conversation_id>/messages/",
        views.MessageListView.as_view(),
        name="message-list",
    ),
    path("messages/send/", views.MessageCreateView.as_view(), name="message-create"),
    path(
        "messages/<int:message_id>/action/", views.message_action, name="message-action"
    ),
    # Message status endpoints
    path(
        "conversations/<int:conversation_id>/mark-read/",
        views.mark_messages_read,
        name="mark-messages-read",
    ),
    path("unread-count/", views.unread_count, name="unread-count"),
    # User blocking endpoints
    path("block/", views.block_user, name="block-user"),
    path("unblock/<int:user_id>/", views.unblock_user, name="unblock-user"),
    path("blocked/", views.BlockedUserListView.as_view(), name="blocked-users"),
    # Utility endpoints
    path("users/search/", views.user_search, name="user-search"),
]
