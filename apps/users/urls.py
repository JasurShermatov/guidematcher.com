from django.urls import path
from . import views

app_name = "users"

urlpatterns = [
    path("register/", views.register_user, name="register"),
    path("login/", views.login_user, name="login"),
    path("profile/", views.user_profile, name="profile"),
    path("profile/<uuid:user_id>/", views.user_detail, name="user_detail"),
    path("verify-email/", views.verify_email, name="verify_email"),
    path("login-attempts/", views.login_attempts, name="login_attempts"),
]
