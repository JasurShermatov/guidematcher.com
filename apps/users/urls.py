from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.users.views import (
    GoogleLoginView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
    UserViewSet,
)

router = DefaultRouter()
router.register(r"users", UserViewSet, basename="users")

urlpatterns = [
    path("auth/google/", GoogleLoginView.as_view(), name="auth-google-login"),
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
    path("", include(router.urls)),
]
