# apps/profiles/urls.py
from rest_framework.routers import DefaultRouter
from django.urls import path, include
from apps.profiles.views import (
    ClientProfileViewSet,
    CustomerProfileViewSet,
    PortfolioViewSet,
    VerificationDocumentViewSet,
    UnavailabilityViewSet,  # 👈 Yangi viewset import qilamiz
)

# REST Framework Router
router = DefaultRouter()

# Profile endpoints - user-friendly naming
router.register(r"clients", ClientProfileViewSet, basename="client-profile")
router.register(r"customers", CustomerProfileViewSet, basename="customer-profile")

# Customer-related endpoints - grouped logically
router.register(r"portfolios", PortfolioViewSet, basename="portfolio")
router.register(
    r"verifications", VerificationDocumentViewSet, basename="verification-document"
)
router.register(  # 👈 Yangi route qo‘shamiz
    r"unavailabilities", UnavailabilityViewSet, basename="unavailability"
)

# Main URL patterns
urlpatterns = [
    # Router URLs
    path("", include(router.urls)),
]
