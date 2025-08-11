from drf_spectacular.utils import extend_schema
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .filters import CustomerProfileFilter
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from .models import (
    ClientProfile,
    CustomerProfile,
    Portfolio,
    Availability,
    VerificationDocument,
)
from .permissions import RoleBasedProfilePermission, IsOwnerOrAdmin
from .serializers import (
    ClientProfileSerializer,
    CustomerProfileSerializer,
    PortfolioSerializer,
    AvailabilitySerializer,
    VerificationDocumentSerializer,
)


@extend_schema(tags=["Client Profile"])
class ClientProfileViewSet(viewsets.ModelViewSet):
    serializer_class = ClientProfileSerializer
    queryset = ClientProfile.objects.all()
    permission_classes = [IsAuthenticated, RoleBasedProfilePermission, IsOwnerOrAdmin]

    def perform_create(self, serializer):
        if hasattr(self.request.user, "clientprofile"):
            raise ValidationError({"detail": "You already have a client profile."})
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["get"], url_path="my")
    def my_profile(self, request):
        try:
            profile = request.user.clientprofile
        except ClientProfile.DoesNotExist:
            raise ValidationError({"detail": "You don’t have a client profile yet."})
        serializer = self.get_serializer(profile)
        return Response(serializer.data)


@extend_schema(tags=["Customer Profile"])
class CustomerProfileViewSet(viewsets.ModelViewSet):
    serializer_class = CustomerProfileSerializer
    queryset = CustomerProfile.objects.all()
    permission_classes = [IsAuthenticated, RoleBasedProfilePermission, IsOwnerOrAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = CustomerProfileFilter

    def perform_create(self, serializer):
        if CustomerProfile.objects.filter(user=self.request.user).exists():
            raise ValidationError({"detail": "You already have a customer profile."})
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["get"], url_path="my")
    def my_profile(self, request):
        try:
            profile = request.user.customerprofile
        except CustomerProfile.DoesNotExist:
            raise ValidationError({"detail": "You don’t have a customer profile yet."})
        serializer = self.get_serializer(profile)
        return Response(serializer.data)


@extend_schema(tags=["CustomerOwnedModel"])
class CustomerOwnedModelViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]

    def get_customer_profile(self):
        try:
            return self.request.user.customerprofile
        except CustomerProfile.DoesNotExist:
            return None

    def perform_create(self, serializer):
        customer = self.get_customer_profile()
        if not customer and not self.request.user.is_admin:
            raise PermissionDenied(
                detail={"message": "❌ You must be a customer to create this resource."}
            )
        serializer.save(customer=customer)

    @action(detail=False, methods=["get"], url_path="my")
    def my_items(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


@extend_schema(tags=["Portfolio"])
class PortfolioViewSet(CustomerOwnedModelViewSet):
    serializer_class = PortfolioSerializer
    queryset = Portfolio.objects.all()

    def get_queryset(self):
        user = self.request.user
        if user.is_admin:
            return Portfolio.objects.all()
        return Portfolio.objects.filter(customer__user=user)


@extend_schema(tags=["VerificationDocument"])
class VerificationDocumentViewSet(CustomerOwnedModelViewSet):
    serializer_class = VerificationDocumentSerializer
    queryset = VerificationDocument.objects.all()

    def get_queryset(self):
        user = self.request.user
        if user.is_admin:
            return VerificationDocument.objects.all()
        return VerificationDocument.objects.filter(customer__user=user)


@extend_schema(tags=["Ability"])
class AvailabilityViewSet(CustomerOwnedModelViewSet):
    serializer_class = AvailabilitySerializer
    queryset = Availability.objects.all()

    def get_queryset(self):
        user = self.request.user
        if user.is_admin:
            return Availability.objects.all()
        return Availability.objects.filter(customer__user=user)

    def perform_create(self, serializer):
        try:
            customer_profile = self.request.user.customerprofile
        except CustomerProfile.DoesNotExist:
            raise ValidationError({"detail": "You don’t have a customer profile yet."})

        date = serializer.validated_data.get("date")
        if Availability.objects.filter(customer=customer_profile, date=date).exists():
            raise ValidationError(
                {"detail": f"Availability for {date} already exists."}
            )
        serializer.save(customer=customer_profile)
