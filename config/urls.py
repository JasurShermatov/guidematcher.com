from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

# DRF / JWT / Schema
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

# ──────────────────────────────────────────────
# Version-langan API marshrutlari
# ──────────────────────────────────────────────
api_v1_patterns = [
    # Auth (registratsiya, verification, password‐reset …)
    path("auth/", include("apps.users.urls")),
    # Profillar
    path("profiles/", include("apps.profiles.urls")),
    # Booking
    path("bookings/", include("apps.bookings.urls")),
    # Chat
    path("chat/", include("apps.chat.urls")),
    # Reviewlar
    path("reviews/", include("apps.reviews.urls")),
    # Notificationlar
    path("notifications/", include("apps.notifications.urls")),
    # Disputelar
    path("disputes/", include("apps.disputes.urls")),
    # Common (mamlakat, til, xizmat turlari va h.k.)
    path("common/", include("apps.common.urls")),
    # 📩 Accounts (email verification, registration helpers)
    path("accounts/", include("apps.accounts.urls")),  # 👈 Qo‘shildi
]

urlpatterns = [
    # Django admin
    path("admin/", admin.site.urls),
    # JWT tokenlar
    path("api/v1/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/v1/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/v1/token/verify/", TokenVerifyView.as_view(), name="token_verify"),
    # OpenAPI – yaml/json
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    # Swagger UI
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    # ReDoc
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    # Version 1 API drf-router/path-lari
    path("api/v1/", include(api_v1_patterns)),
]

# ──────────────────────────────────────────────
# Media & static — faqat DEBUG =True da
# ──────────────────────────────────────────────
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)