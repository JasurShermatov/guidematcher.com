# apps/users/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.users.views import (
    GoogleLoginView,
    UserListView,
    CustomerDetailView,
)

# DRF router bilan UserViewSet
router = DefaultRouter()
router.register(r"users", UserListView, basename="users")

urlpatterns = [
    # Google OAuth login
    path("auth/google/", GoogleLoginView.as_view(), name="auth-google-login"),
    # User router (list, retrieve, create, update, delete)
    path("", include(router.urls)),
    # Customer profile detail by UUID
    path(
        "profiles/customers/<uuid:pk>/",
        CustomerDetailView.as_view(),
        name="customer-detail",
    ),
]
