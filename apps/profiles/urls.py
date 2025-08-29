from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.profiles.views import (
    ClientProfileViewSet,
    CustomerProfileViewSet,
    PortfolioViewSet,
    AvailabilityViewSet,
    VerificationDocumentViewSet,
)

router = DefaultRouter()

router.register(r"clients", ClientProfileViewSet, basename="client-profile")
router.register(r"customers", CustomerProfileViewSet, basename="customer-profile")

router.register(r"portfolios", PortfolioViewSet, basename="portfolio")
router.register(r"availabilities", AvailabilityViewSet, basename="availability")
router.register(
    r"verifications", VerificationDocumentViewSet, basename="verification-document"
)

urlpatterns = [
    path("", include(router.urls)),
]
