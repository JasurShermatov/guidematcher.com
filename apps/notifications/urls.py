from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.notifications.views import (
    NotificationTypeViewSet,
    NotificationViewSet,
    UserNotificationSettingsView,
    UserNotificationTypeSettingsViewSet,
    EmailLogViewSet,
)

router = DefaultRouter()
router.register(r"types", NotificationTypeViewSet, basename="notification-type")
router.register(r"list", NotificationViewSet, basename="notification")
router.register(
    r"settings", UserNotificationSettingsView, basename="notification-settings"
)
router.register(
    r"type-settings",
    UserNotificationTypeSettingsViewSet,
    basename="notification-type-settings",
)
router.register(r"email-logs", EmailLogViewSet, basename="email-log")

urlpatterns = [
    path("", include(router.urls)),
]
