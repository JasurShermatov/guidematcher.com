# apps/common/views.py
from rest_framework import viewsets, permissions
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema

from apps.common.models import Country, City, Language, ServiceType
from apps.common.serializers import (
    CountrySerializer,
    CitySerializer,
    LanguageSerializer,
    ServiceTypeSerializer,
)


class ReadOnlyOrAdmin(permissions.BasePermission):
    """
    GET/HEAD/OPTIONS -> everybody.
    POST/PUT/PATCH/DELETE -> only staff/admin.
    """

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_authenticated and request.user.is_staff


@extend_schema(tags=["common"])
class CountryViewSet(viewsets.ModelViewSet):
    serializer_class = CountrySerializer
    permission_classes = [ReadOnlyOrAdmin]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["name", "code"]
    ordering = ["name"]

    def get_queryset(self):
        qs = Country.objects.all()
        if not (self.request.user.is_authenticated and self.request.user.is_staff):
            qs = qs.filter(is_active=True)
        return qs


@extend_schema(tags=["common"])
class CityViewSet(viewsets.ModelViewSet):
    serializer_class = CitySerializer
    permission_classes = [ReadOnlyOrAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["country"]  # /cities/?country=<uuid>
    search_fields = ["name", "country__name", "country__code"]
    ordering = ["name"]

    def get_queryset(self):
        qs = City.objects.select_related("country")
        if not (self.request.user.is_authenticated and self.request.user.is_staff):
            qs = qs.filter(is_active=True, country__is_active=True)
        return qs


@extend_schema(tags=["common"])
class LanguageViewSet(viewsets.ModelViewSet):
    serializer_class = LanguageSerializer
    permission_classes = [ReadOnlyOrAdmin]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["name", "code", "native_name"]
    ordering = ["name"]

    def get_queryset(self):
        qs = Language.objects.all()
        if not (self.request.user.is_authenticated and self.request.user.is_staff):
            qs = qs.filter(is_active=True)
        return qs


@extend_schema(tags=["common"])
class ServiceTypeViewSet(viewsets.ModelViewSet):
    serializer_class = ServiceTypeSerializer
    permission_classes = [ReadOnlyOrAdmin]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["name", "description"]
    ordering = ["order", "name"]

    def get_queryset(self):
        qs = ServiceType.objects.all().order_by("order", "name")
        if not (self.request.user.is_authenticated and self.request.user.is_staff):
            qs = qs.filter(is_active=True)
        return qs
