from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status


@api_view(["GET"])
@permission_classes([AllowAny])
def healthcheck_view(request, *args, **kwargs):
    return Response({"status": "ok"}, status=status.HTTP_200_OK)


# ─── API v1 – modular routing ──────────────────────────────────
api_v1_patterns = [
    path("accounts/", include("apps.accounts.urls")),
    path("auth/", include("apps.users.urls")),
    path("common/", include("apps.common.urls")),
    path("bookings/", include("apps.bookings.urls")),
    path("chat/", include("apps.chat.urls")),
    path("reviews/", include("apps.reviews.urls")),
    path("profiles/", include("apps.profiles.urls")),
]

urlpatterns = [
    path("api/admin/", admin.site.urls),
    path("api/v1/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/v1/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/v1/token/verify/", TokenVerifyView.as_view(), name="token_verify"),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    path("api/v1/", include(api_v1_patterns)),
    path("health/", healthcheck_view, name="health"),  # ✅ bitta health endpoint kifoya
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
