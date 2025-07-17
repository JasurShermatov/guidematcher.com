#  apps/users/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.users.views import (
    GoogleLoginView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
    ProfileViewSet,
)

router = DefaultRouter()
router.register("profile", ProfileViewSet, basename="profile")

urlpatterns = [
    path("google-login/", GoogleLoginView.as_view(), name="google-login"),
    path("password/reset/", PasswordResetRequestView.as_view(), name="password-reset"),
    path(
        "password/reset/confirm/",
        PasswordResetConfirmView.as_view(),
        name="password-reset-confirm",
    ),
    path("", include(router.urls)),
]
