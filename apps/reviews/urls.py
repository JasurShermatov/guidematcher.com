# apps/reviews/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.reviews.views import (
    ReviewViewSet,
    ReviewResponseViewSet,
    ReviewHelpfulViewSet,
)

router = DefaultRouter()
router.register("reviews", ReviewViewSet, basename="review")
router.register("responses", ReviewResponseViewSet, basename="review-response")
router.register("helpful", ReviewHelpfulViewSet, basename="review-helpful")

urlpatterns = [
    path("", include(router.urls)),
]
