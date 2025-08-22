#  apps/disputes/urls.py
from rest_framework.routers import DefaultRouter
from rest_framework_nested.routers import NestedDefaultRouter
from django.urls import path, include

from apps.disputes.views import (
    DisputeViewSet,
    EvidenceViewSet,
    DisputeMessageViewSet,
)

router = DefaultRouter()
router.register(r"disputes", DisputeViewSet, basename="dispute")

nested = NestedDefaultRouter(router, r"disputes", lookup="dispute")
nested.register(r"evidence", EvidenceViewSet, basename="dispute-evidence")
nested.register(r"messages", DisputeMessageViewSet, basename="dispute-messages")

urlpatterns = [
    path("", include(router.urls)),
    path("", include(nested.urls)),
]
