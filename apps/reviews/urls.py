# apps/reviews/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.reviews.views import (
    ReviewViewSet,
    ReviewResponseViewSet,
    MyReviewsViewSet,  # qo‘shilgan
)

router = DefaultRouter()
router.register("reviews", ReviewViewSet, basename="review")
router.register("responses", ReviewResponseViewSet, basename="review-response")
router.register("my", MyReviewsViewSet, basename="my-reviews")  # qo‘shilgan

urlpatterns = [
    path("", include(router.urls)),
]
