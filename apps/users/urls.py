from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.users.views import (
    GoogleLoginView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
    ProfileViewSet,
)

router = DefaultRouter()
router.register(r"profiles", ProfileViewSet, basename="profiles")

urlpatterns = [
    # OAuth Login
    path("auth/google/", GoogleLoginView.as_view(), name="auth-google-login"),
    # Password Reset Flow
    path(
        "auth/password/reset/",
        PasswordResetRequestView.as_view(),
        name="auth-password-reset",
    ),
    path(
        "auth/password/reset/confirm/",
        PasswordResetConfirmView.as_view(),
        name="auth-password-reset-confirm",
    ),
    # API endpoints
    path("", include(router.urls)),
]
