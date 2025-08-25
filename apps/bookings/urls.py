# apps/bookings/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BookingViewSet

router = DefaultRouter()
router.register("bookings", BookingViewSet, basename="booking")

urlpatterns = [
    path("", include(router.urls)),
]


# GET /api/bookings/ - barcha bookinglar
# POST /api/bookings/ - yangi booking
# GET /api/bookings/{id}/ - bitta booking
# PUT /api/bookings/{id}/ - booking yangilash
# DELETE /api/bookings/{id}/ - booking o'chirish
# POST /api/bookings/{id}/accept/ - qabul qilish va vaqt belgilash
# POST /api/bookings/{id}/update_dates/ - vaqtni o'zgartirish
# POST /api/bookings/{id}/cancel/ - bekor qilish
# POST /api/bookings/create_from_chat/ - chat orqali yaratish
# GET /api/bookings/search_customers/ - customer qidirish
# GET /api/bookings/my_schedule/ - customer kalendari
