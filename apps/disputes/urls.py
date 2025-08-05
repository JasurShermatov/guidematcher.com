from django.urls import path
from . import views

app_name = "disputes"

urlpatterns = [
    path("", views.dispute_list_create, name="dispute_list_create"),
    path("<uuid:dispute_id>/", views.dispute_detail, name="dispute_detail"),
    path("<uuid:dispute_id>/resolve/", views.dispute_resolve, name="dispute_resolve"),
]
