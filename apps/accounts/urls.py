# apps/accounts/urls.py
from django.urls import path
from .views import RequestCodeView, RegisterView, LoginView
from rest_framework_simplejwt.views import TokenRefreshView, TokenBlacklistView

urlpatterns = [
    path("request-code/", RequestCodeView.as_view(), name="request-code"),
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),  # JWT login
    path("refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("logout/", TokenBlacklistView.as_view(), name="logout"),
]
