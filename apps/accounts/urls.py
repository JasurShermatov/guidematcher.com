# apps/accounts/urls.py

from django.urls import path
from . import views

app_name = "accounts"

urlpatterns = [
    # Registration and authentication
    path("request-code/", views.request_code, name="request_code"),
    path("register/", views.register, name="register"),
    path("login/", views.login, name="login"),
    path("logout/", views.logout, name="logout"),
    # Password reset
    path(
        "password-reset/", views.password_reset_request, name="password_reset_request"
    ),
    path(
        "password-reset-confirm/",
        views.password_reset_confirm,
        name="password_reset_confirm",
    ),
    # Token management
    path("refresh/", views.refresh_token, name="refresh_token"),
]
