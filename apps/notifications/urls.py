from django.urls import path
from . import views

app_name = "notifications"

urlpatterns = [
    path("", views.notification_list, name="notification_list"),
    path(
        "<uuid:notification_id>/", views.notification_detail, name="notification_detail"
    ),
    path(
        "mark-read/<uuid:notification_id>/",
        views.mark_notification_read,
        name="mark_notification_read",
    ),
    path(
        "preferences/", views.notification_preferences, name="notification_preferences"
    ),
    path("email-logs/", views.email_log_list, name="email_log_list"),
]
