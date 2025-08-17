from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.users.views import (
    GoogleLoginView,
    UserListView,
)

router = DefaultRouter()
router.register(r"users", UserListView, basename="users")

urlpatterns = [
    # Google OAuth login
    path("auth/google/", GoogleLoginView.as_view(), name="auth-google-login"),
    # Users CRUD endpoints
    path("", include(router.urls)),
]
