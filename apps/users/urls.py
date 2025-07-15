# apps/users/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.users.views import (
    LoginView,
    RegisterView,
    VerifyEmailView,
    ResendVerificationCodeView,
    GoogleLoginView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
    ProfileViewSet,
)

router = DefaultRouter()
router.register("profile", ProfileViewSet, basename="profile")

urlpatterns = [
    # Auth
    path("login/", LoginView.as_view(), name="login"),
    path("register/", RegisterView.as_view(), name="register"),
    path("verify-email/", VerifyEmailView.as_view(), name="verify-email"),
    path("resend-code/", ResendVerificationCodeView.as_view(), name="resend-code"),
    path("google-login/", GoogleLoginView.as_view(), name="google-login"),
    # Password
    path("password/reset/", PasswordResetRequestView.as_view(), name="password-reset"),
    path(
        "password/reset/confirm/",
        PasswordResetConfirmView.as_view(),
        name="password-reset-confirm",
    ),
    # Profile router
    path("", include(router.urls)),
]
