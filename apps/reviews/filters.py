# apps/reviews/filters.py
import django_filters as df
from apps.reviews.models import Review


class ReviewFilter(df.FilterSet):
    min_rating = df.NumberFilter(field_name="overall_rating", lookup_expr="gte")
    max_rating = df.NumberFilter(field_name="overall_rating", lookup_expr="lte")
    is_published = df.BooleanFilter()
    customer_id = df.UUIDFilter(field_name="customer_id")

    class Meta:
        model = Review
        fields = ["customer_id", "client_id", "is_published"]
