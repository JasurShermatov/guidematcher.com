# apps/reviews/filters.py
import django_filters as df
from django.utils import timezone

from apps.reviews.models import Review


class ReviewFilter(df.FilterSet):
    """
    ?min_rating        – minimum umumiy baho (>=)
    ?max_rating        – maksimum umumiy baho (<=)
    ?customer=<uuid>   – xizmat ko‘rsatuvchi (CustomerProfile.id)
    ?client=<uuid>     – buyurtmachi (User.id)
    ?published=true    – faqat eʼlon qilingan / qilingan emas
    ?created_between=2025-01-01,2025-01-31
    """

    # ★ Baholar
    min_rating = df.NumberFilter(field_name="overall_rating", lookup_expr="gte")
    max_rating = df.NumberFilter(field_name="overall_rating", lookup_expr="lte")

    # ★ Tashqi kalitlar (UUID)
    customer = df.UUIDFilter(field_name="customer__id")
    client = df.UUIDFilter(field_name="client__id")

    # ★ Boolean flag
    published = df.BooleanFilter(field_name="is_published")

    # ★ Sana oralig‘i (custom)
    created_between = df.CharFilter(method="filter_created_between")

    class Meta:
        model = Review
        # Meta.fields DRF’ga kerak bo‘ladi, lekin custom maydonlar alohida metodda
        fields = ["customer", "client", "published"]

    # YYYY-MM-DD,YYYY-MM-DD  →  queryset
    def filter_created_between(self, qs, name, value):
        try:
            start_str, end_str = value.split(",")
            start_date = timezone.datetime.fromisoformat(start_str).date()
            end_date = timezone.datetime.fromisoformat(end_str).date()
        except Exception:
            # noto‘g‘ri format – hech narsa filter qilmaymiz
            return qs
        return qs.filter(created_at__date__range=[start_date, end_date])
