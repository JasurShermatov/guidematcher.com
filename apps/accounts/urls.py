from django.urls import path
from .views import (
    RequestCodeView,
    RegisterView,
    CustomTokenObtainPairView,
    CustomTokenRefreshView,
    LogoutView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
    me_view,  # ✅ /api/v1/accounts/me/
)

urlpatterns = [
    path("request-code/", RequestCodeView.as_view(), name="request-code"),
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", CustomTokenObtainPairView.as_view(), name="login"),
    path("refresh/", CustomTokenRefreshView.as_view(), name="token-refresh"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path(
        "forgot-password/", PasswordResetRequestView.as_view(), name="forgot-password"
    ),
    path("reset-password/", PasswordResetConfirmView.as_view(), name="reset-password"),
    path("me/", me_view, name="accounts-me"),  # ✅
]
