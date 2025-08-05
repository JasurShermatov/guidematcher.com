# apps/bookings/urls.py

from django.urls import path
from . import views

app_name = "bookings"

urlpatterns = [
    # Booking management
    path("", views.booking_list, name="booking_list"),
    path("<uuid:booking_id>/", views.booking_detail, name="booking_detail"),
    path("<uuid:booking_id>/history/", views.booking_history, name="booking_history"),
    # Booking actions
    path(
        "<uuid:booking_id>/complete/", views.complete_booking, name="complete_booking"
    ),
    path("<uuid:booking_id>/start/", views.start_booking, name="start_booking"),
    # Booking requests
    path("requests/", views.booking_requests, name="booking_requests"),
    path(
        "requests/<uuid:request_id>/",
        views.booking_request_detail,
        name="booking_request_detail",
    ),
    # Utility endpoints
    path("statistics/", views.booking_statistics, name="booking_statistics"),
    path("available-guides/", views.available_guides, name="available_guides"),
    path("calendar/", views.booking_calendar, name="booking_calendar"),
]
