# apps/profiles/urls.py

from django.urls import path
from . import views

app_name = "profiles"

urlpatterns = [
    # Current user profile
    path("", views.current_user_profile, name="current_user_profile"),
    # Public profile views
    path("<uuid:user_id>/", views.user_profile_detail, name="user_profile_detail"),
    # Guide search and discovery
    path("guides/search/", views.guide_search, name="guide_search"),
    path(
        "destinations/popular/", views.popular_destinations, name="popular_destinations"
    ),
    # Guide-specific features
    path("languages/", views.guide_languages, name="guide_languages"),
    path(
        "languages/<uuid:language_id>/",
        views.guide_language_detail,
        name="guide_language_detail",
    ),
    path("portfolio/", views.portfolio, name="portfolio"),
    path("portfolio/<uuid:item_id>/", views.portfolio_detail, name="portfolio_detail"),
    # Favorites
    path("favorites/", views.favorites, name="favorites"),
    path(
        "favorites/<uuid:favorite_id>/", views.favorite_detail, name="favorite_detail"
    ),
]
