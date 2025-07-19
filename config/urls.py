# config/urls.py

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

# ─── JWT Authentication ────────────────────────────────────────
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)

# ─── OpenAPI / Swagger / ReDoc ─────────────────────────────────
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)

# ─── API v1 – modular routing ──────────────────────────────────
api_v1_patterns = [
    path(
        "accounts/", include("apps.accounts.urls")
    ),  # 📩 Register / Login / Email verify
    path("auth/", include("apps.users.urls")),  # 👤 Google auth, password reset
    path("common/", include("apps.common.urls")),  # 🌍 Countries, cities, services
    path("bookings/", include("apps.bookings.urls")),  # 📦 Booking-related endpoints
    path("chat/", include("apps.chat.urls")),  # 💬 Chat and messaging
    path("reviews/", include("apps.reviews.urls")),  # ⭐ Review & rating
    path(
        "notifications/", include("apps.notifications.urls")
    ),  # 🔔 Notification center
    path("disputes/", include("apps.disputes.urls")),  # ⚖️ Dispute resolution
    path("profiles/", include("apps.profiles.urls")),  # 🧑 Public profiles
]

# ─── Root URL patterns ─────────────────────────────────────────
urlpatterns = [
    # Admin
    path("admin/", admin.site.urls),
    # JWT tokens
    path("api/v1/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/v1/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/v1/token/verify/", TokenVerifyView.as_view(), name="token_verify"),
    # OpenAPI schema & docs
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    # Modular API v1
    path("api/v1/", include(api_v1_patterns)),
]

# ─── Media / Static for development ────────────────────────────
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
