# apps/accounts/urls.py
from django.urls import path
from .views import (
    RequestCodeView,
    RegisterView,
    LoginView,
    CustomTokenRefreshView,
    LogoutView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
)

urlpatterns = [
    path("request-code/", RequestCodeView.as_view(), name="request-code"),
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("refresh/", CustomTokenRefreshView.as_view(), name="token-refresh"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path(
        "forgot-password/", PasswordResetRequestView.as_view(), name="forgot-password"
    ),
    path("reset-password/", PasswordResetConfirmView.as_view(), name="reset-password"),
]
