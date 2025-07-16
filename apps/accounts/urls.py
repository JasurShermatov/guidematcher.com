from django.urls import path
from .views import RequestCodeView, RegisterView
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenBlacklistView,
)

urlpatterns = [
    path("request-code/", RequestCodeView.as_view()),
    path("register/", RegisterView.as_view()),
    path("login/", TokenObtainPairView.as_view()),
    path("refresh/", TokenRefreshView.as_view()),
    path("logout/", TokenBlacklistView.as_view()),
]
