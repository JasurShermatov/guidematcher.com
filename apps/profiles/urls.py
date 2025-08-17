# apps/profiles/urls.py
from rest_framework.routers import DefaultRouter
from django.urls import path, include
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
router.register(r"portfolio", PortfolioViewSet, basename="portfolio")
router.register(r"availability", AvailabilityViewSet, basename="availability")
router.register(
    r"documents", VerificationDocumentViewSet, basename="verification-document"
)

urlpatterns = [path("", include(router.urls))]
