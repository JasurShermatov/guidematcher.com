from rest_framework.routers import DefaultRouter
from django.urls import path, include

from apps.common.views import (
    CountryViewSet,
    CityViewSet,
    LanguageViewSet,
    ServiceTypeViewSet,
)

router = DefaultRouter()
router.register(r"countries", CountryViewSet, basename="country")
router.register(r"cities", CityViewSet, basename="city")
router.register(r"languages", LanguageViewSet, basename="language")
router.register(r"service-types", ServiceTypeViewSet, basename="service-type")

urlpatterns = [
    path("", include(router.urls)),
]
