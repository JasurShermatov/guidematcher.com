from rest_framework.routers import DefaultRouter
from django.urls import path, include
from apps.profiles.views import (
    ClientProfileViewSet,
    CustomerProfileViewSet,
    PortfolioViewSet,
    VerificationDocumentViewSet,
    UnavailabilityViewSet,
)

router = DefaultRouter()
router.register(r"clients", ClientProfileViewSet, basename="client-profile")
router.register(r"customers", CustomerProfileViewSet, basename="customer-profile")
router.register(r"portfolios", PortfolioViewSet, basename="portfolio")
router.register(
    r"verifications", VerificationDocumentViewSet, basename="verification-document"
)
router.register(r"unavailabilities", UnavailabilityViewSet, basename="unavailability")

urlpatterns = [
    path("", include(router.urls)),
]
