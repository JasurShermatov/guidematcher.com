from rest_framework.routers import DefaultRouter
from rest_framework_nested.routers import NestedDefaultRouter
from django.urls import path, include

from apps.bookings.views import BookingViewSet, BookingMessageViewSet

router = DefaultRouter()
router.register(r"bookings", BookingViewSet, basename="booking")

# nested router: /bookings/{booking_pk}/messages/
nested_router = NestedDefaultRouter(router, r"bookings", lookup="booking")
nested_router.register(r"messages", BookingMessageViewSet, basename="booking-messages")

urlpatterns = [
    path("", include(router.urls)),
    path("", include(nested_router.urls)),
]
