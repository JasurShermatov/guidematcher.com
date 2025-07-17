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
# API v1 marshrutlari — modullar bo‘yicha
# ──────────────────────────────────────────────
api_v1_patterns = [
    # 📩 Accounts: Login / Register / Email verification
    path("accounts/", include("apps.accounts.urls")),
    # 👤 Users: Google login, password reset, profile
    path("auth/", include("apps.users.urls")),
    # 🌍 Common data: countries, languages, services, etc.
    path("common/", include("apps.common.urls")),
    # 📦 Booking
    path("bookings/", include("apps.bookings.urls")),
    # 💬 Chat / Messages
    path("chat/", include("apps.chat.urls")),
    # ⭐ Reviews
    path("reviews/", include("apps.reviews.urls")),
    # 🔔 Notifications
    path("notifications/", include("apps.notifications.urls")),
    # ⚖️ Disputes
    path("disputes/", include("apps.disputes.urls")),
    # 🧑 Profiles (public profiles if separated from auth)
    path("profiles/", include("apps.profiles.urls")),
]

# ──────────────────────────────────────────────
# Umumiy loyihaviy URLConf
# ──────────────────────────────────────────────
urlpatterns = [
    # Admin panel
    path("admin/", admin.site.urls),
    # JWT (qo‘shimcha token endpointlar)
    path("api/v1/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/v1/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/v1/token/verify/", TokenVerifyView.as_view(), name="token_verify"),
    # OpenAPI schema (json/yaml)
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    # Swagger UI
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    # ReDoc
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    # API V1 versionlangan yo‘llar
    path("api/v1/", include(api_v1_patterns)),
]

# ──────────────────────────────────────────────
# Media & Static fayllar (faqat DEBUG=True holatda)
# ──────────────────────────────────────────────
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
