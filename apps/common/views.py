from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework import viewsets, permissions

from apps.common.models import Country, City, Language, ServiceType
from apps.common.serializers import (
    CountrySerializer,
    CitySerializer,
    LanguageSerializer,
    ServiceTypeSerializer,
)


class ReadOnlyOrAdmin(permissions.BasePermission):
    """
    SAFE_METHODS -> har kim.
    POST/PUT/DELETE -> faqat staff/admin.
    """

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_authenticated and request.user.is_staff


from drf_spectacular.utils import extend_schema


@extend_schema(tags=["common"])
class CountryViewSet(viewsets.ModelViewSet):
    queryset = Country.objects.filter(is_active=True)
    serializer_class = CountrySerializer
    permission_classes = [ReadOnlyOrAdmin]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["name", "code"]
    ordering = ["name"]


# ─────────── City ───────────
class CityViewSet(viewsets.ModelViewSet):
    serializer_class = CitySerializer
    permission_classes = [ReadOnlyOrAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["country"]  # /cities/?country=<uuid>
    search_fields = ["name"]
    ordering = ["name"]

    def get_queryset(self):
        return City.objects.filter(is_active=True).select_related("country")


# ─────────── Language ───────────
class LanguageViewSet(viewsets.ModelViewSet):
    queryset = Language.objects.filter(is_active=True)
    serializer_class = LanguageSerializer
    permission_classes = [ReadOnlyOrAdmin]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["name", "code", "native_name"]
    ordering = ["name"]


# ─────────── ServiceType ───────────
class ServiceTypeViewSet(viewsets.ModelViewSet):
    queryset = ServiceType.objects.filter(is_active=True).order_by("order")
    serializer_class = ServiceTypeSerializer
    permission_classes = [ReadOnlyOrAdmin]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["name", "description"]
    ordering = ["order", "name"]
