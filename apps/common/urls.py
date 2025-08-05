# apps/common/urls.py

from django.urls import path
from . import views

app_name = "common"

urlpatterns = [
    path("countries/", views.country_list, name="country_list"),
    path("countries/<uuid:country_id>/", views.country_detail, name="country_detail"),
    path("cities/", views.city_list, name="city_list"),
    path("cities/<uuid:city_id>/", views.city_detail, name="city_detail"),
    path("services/", views.service_list, name="service_list"),
    path("services/<uuid:service_id>/", views.service_detail, name="service_detail"),
    path("languages/", views.language_list, name="language_list"),
    path(
        "languages/<uuid:language_id>/", views.language_detail, name="language_detail"
    ),
]
