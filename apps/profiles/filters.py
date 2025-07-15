import django_filters as df
from apps.profiles.models import CustomerProfile


class CustomerProfileFilter(df.FilterSet):
    city = df.NumberFilter(field_name="city_id")
    language = df.CharFilter(method="filter_language")  # ?language=en
    service_type = df.NumberFilter(method="filter_service")
    min_rating = df.NumberFilter(field_name="average_rating", lookup_expr="gte")
    is_available = df.BooleanFilter()

    class Meta:
        model = CustomerProfile
        fields = ["city", "language", "service_type", "is_available"]

    # --- custom methods ---
    def filter_language(self, qs, name, value):
        return qs.filter(languages__code=value)

    def filter_service(self, qs, name, value):
        return qs.filter(service_types=value)
