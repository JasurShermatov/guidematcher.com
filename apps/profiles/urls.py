# apps/profiles/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ClientProfileViewSet,
    CustomerProfileViewSet,
    PortfolioViewSet,
    VerificationDocumentViewSet,
    UnavailabilityViewSet,
)

router = DefaultRouter()
# lookup_field = user_id bo‘lgani uchun route shunaqa:
router.register(r"clients", ClientProfileViewSet, basename="client-profiles")
router.register(r"customers", CustomerProfileViewSet, basename="customer-profiles")
router.register(r"portfolio", PortfolioViewSet, basename="portfolio")
router.register(
    r"verification-docs", VerificationDocumentViewSet, basename="verification-docs"
)
router.register(r"unavailability", UnavailabilityViewSet, basename="unavailability")

urlpatterns = [
    path("", include(router.urls)),
]
