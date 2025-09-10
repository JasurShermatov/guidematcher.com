from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.reviews.views import (
    ReviewViewSet,
    ReviewResponseViewSet,
    MyReviewsViewSet,
)

router = DefaultRouter()
router.register("reviews", ReviewViewSet, basename="review")
router.register("responses", ReviewResponseViewSet, basename="review-response")
router.register("my", MyReviewsViewSet, basename="my-reviews")

urlpatterns = [
    path("", include(router.urls)),
]
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.reviews.views import (
    ReviewViewSet,
    ReviewResponseViewSet,
    MyReviewsViewSet,
)

router = DefaultRouter()
router.register("reviews", ReviewViewSet, basename="review")
router.register("responses", ReviewResponseViewSet, basename="review-response")
router.register("my", MyReviewsViewSet, basename="my-reviews")

urlpatterns = [
    path("", include(router.urls)),
]
