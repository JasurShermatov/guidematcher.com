from django.urls import path
from . import views

app_name = "reviews"

urlpatterns = [
    path("", views.review_list_create, name="review_list_create"),
    path("<uuid:review_id>/", views.review_detail, name="review_detail"),
    path("<uuid:review_id>/respond/", views.review_respond, name="review_respond"),
    path("<uuid:review_id>/helpful/", views.review_helpful, name="review_helpful"),
    path("<uuid:review_id>/report/", views.review_report, name="review_report"),
    path(
        "reports/<uuid:report_id>/resolve/",
        views.review_report_resolve,
        name="review_report_resolve",
    ),
]
