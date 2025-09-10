# apps/bookings/urls.py (to'liq)
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BookingViewSet

router = DefaultRouter()
router.register("bookings", BookingViewSet, basename="booking")

# 🔧 Alias: /api/v1/bookings/incoming/ -> BookingViewSet.incoming
booking_incoming_alias = BookingViewSet.as_view({"get": "incoming"})

urlpatterns = [
    path("", include(router.urls)),
    path("incoming/", booking_incoming_alias, name="booking-incoming-alias"),
]
