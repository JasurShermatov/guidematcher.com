from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from apps.profiles.models import (
    ClientProfile,
    CustomerProfile,
    Portfolio,
    Availability,
    VerificationDocument,
)
from apps.profiles.serializers import (
    ClientProfileSerializer,
    CustomerProfileSerializer,
    PortfolioSerializer,
    AvailabilitySerializer,
    VerificationDocumentSerializer,
)
from apps.profiles.filters import CustomerProfileFilter
from apps.profiles.permissions import IsOwnerOrReadOnly


from drf_spectacular.utils import extend_schema


@extend_schema(tags=["profiles"])
class CustomerProfileViewSet(viewsets.ModelViewSet):
    """
    /profiles/customers/                  – list (public)
    /profiles/customers/my/               – retrieve|update current user's profile
    """

    queryset = CustomerProfile.objects.select_related(
        "user", "city__country"
    ).prefetch_related("languages", "service_types", "portfolio_items")
    serializer_class = CustomerProfileSerializer
    permission_classes = [IsOwnerOrReadOnly]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = CustomerProfileFilter
    search_fields = ["user__first_name", "user__last_name", "professional_bio"]
    ordering = ["-average_rating"]

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [AllowAny()]
        return [IsAuthenticated(), IsOwnerOrReadOnly()]

    # current user shortcut
    @action(
        detail=False,
        methods=["get", "put", "patch"],
        url_path="my",
        permission_classes=[IsAuthenticated],
    )
    def my_profile(self, request):
        obj, _ = CustomerProfile.objects.get_or_create(user=request.user)
        if request.method in ["PUT", "PATCH"]:
            serializer = self.get_serializer(obj, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
        else:
            serializer = self.get_serializer(obj)
        return Response(serializer.data)


# ─────────── ClientProfile ───────────
class ClientProfileViewSet(viewsets.ModelViewSet):
    queryset = ClientProfile.objects.select_related("user").prefetch_related(
        "languages"
    )
    serializer_class = ClientProfileSerializer
    permission_classes = [IsOwnerOrReadOnly]

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [AllowAny()]
        return [IsAuthenticated(), IsOwnerOrReadOnly()]

    @action(
        detail=False,
        methods=["get", "put", "patch"],
        url_path="my",
        permission_classes=[IsAuthenticated],
    )
    def my_profile(self, request):
        obj, _ = ClientProfile.objects.get_or_create(user=request.user)
        if request.method in ["PUT", "PATCH"]:
            serializer = self.get_serializer(obj, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
        else:
            serializer = self.get_serializer(obj)
        return Response(serializer.data)


# ─────────── Portfolio (owner only) ───────────
class PortfolioViewSet(viewsets.ModelViewSet):
    serializer_class = PortfolioSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]

    def get_queryset(self):
        return Portfolio.objects.filter(customer__user=self.request.user)

    def perform_create(self, serializer):
        customer = CustomerProfile.objects.get(user=self.request.user)
        serializer.save(customer=customer)


# ─────────── Availability (owner only) ───────────
class AvailabilityViewSet(viewsets.ModelViewSet):
    serializer_class = AvailabilitySerializer
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["date", "is_available"]

    def get_queryset(self):
        return Availability.objects.filter(customer__user=self.request.user)

    def perform_create(self, serializer):
        customer = CustomerProfile.objects.get(user=self.request.user)
        serializer.save(customer=customer)


# ─────────── VerificationDocument (owner; upload) ───────────
class VerificationDocumentViewSet(viewsets.ModelViewSet):
    serializer_class = VerificationDocumentSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]

    def get_queryset(self):
        return VerificationDocument.objects.filter(customer__user=self.request.user)

    def perform_create(self, serializer):
        customer = CustomerProfile.objects.get(user=self.request.user)
        serializer.save(customer=customer)
