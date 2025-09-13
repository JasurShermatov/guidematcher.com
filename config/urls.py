# config/urls.py

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

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

# ---- Health endpoint (oddiy, tayyor) ----
from django.http import HttpResponse
from django.views.decorators.http import require_safe


@require_safe
def healthcheck_view(request):
    return HttpResponse("OK", status=200)


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
    # Admin
    path("jonibek/", admin.site.urls),
    # JWT
    path("api/v1/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/v1/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/v1/token/verify/", TokenVerifyView.as_view(), name="token_verify"),
    # API schema & docs
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    # API v1
    path("api/v1/", include(api_v1_patterns)),
    # Healthcheck (Docker healthcheck uchun)
    path("health/", healthcheck_view, name="health"),
]

# STATIC/MEDIA faqat DEBUG rejimida serve qilinadi (prod’da Caddy/Nginx orqali)
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
