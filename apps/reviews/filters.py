from django_filters import rest_framework as filters
from .models import Review


class ReviewFilter(filters.FilterSet):
    """
    Filter reviews by guide, rating, verification status, and featured status
    """

    guide = filters.UUIDFilter(field_name="guide__id")
    rating_min = filters.NumberFilter(field_name="rating", lookup_expr="gte")
    rating_max = filters.NumberFilter(field_name="rating", lookup_expr="lte")
    is_verified = filters.BooleanFilter(field_name="is_verified")
    is_featured = filters.BooleanFilter(field_name="is_featured")
    created_after = filters.DateTimeFilter(field_name="created_at", lookup_expr="gte")
    created_before = filters.DateTimeFilter(field_name="created_at", lookup_expr="lte")

    class Meta:
        model = Review
        fields = [
            "guide",
            "rating_min",
            "rating_max",
            "is_verified",
            "is_featured",
            "created_after",
            "created_before",
        ]
