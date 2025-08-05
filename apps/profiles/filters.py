from django_filters import rest_framework as filters
from .models import GuideProfile
from apps.common.models import City, Service, Language
from django.db.models import Q


class GuideProfileFilter(filters.FilterSet):
    """
    FilterSet for GuideProfile model
    """

    location = filters.CharFilter(method="filter_location")
    service = filters.ModelChoiceFilter(queryset=Service.objects.all())
    min_rating = filters.NumberFilter(field_name="average_rating", lookup_expr="gte")
    max_price = filters.NumberFilter(method="filter_max_price")
    language = filters.ModelChoiceFilter(queryset=Language.objects.all())
    availability = filters.BooleanFilter(field_name="is_available")
    experience = filters.ChoiceFilter(
        field_name="experience_years", choices=GuideProfile.EXPERIENCE_CHOICES
    )
    search = filters.CharFilter(method="filter_search")

    class Meta:
        model = GuideProfile
        fields = [
            "location",
            "service",
            "min_rating",
            "max_price",
            "language",
            "availability",
            "experience",
            "search",
        ]

    def filter_location(self, queryset, name, value):
        """
        Filter by city, country, or operating cities
        """
        return queryset.filter(
            Q(operating_cities__name__icontains=value)
            | Q(user__country__icontains=value)
            | Q(user__city__icontains=value)
        ).distinct()

    def filter_max_price(self, queryset, name, value):
        """
        Filter by maximum hourly or daily rate
        """
        return queryset.filter(
            Q(hourly_rate__lte=value)
            | Q(hourly_rate__isnull=True)
            | Q(daily_rate__lte=value)
            | Q(daily_rate__isnull=True)
        ).distinct()

    def filter_search(self, queryset, name, value):
        """
        Search by user name, bio, or services
        """
        return queryset.filter(
            Q(user__first_name__icontains=value)
            | Q(user__last_name__icontains=value)
            | Q(user__bio__icontains=value)
            | Q(services__name__icontains=value)
        ).distinct()
