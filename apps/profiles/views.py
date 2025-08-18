# apps/profiles/views.py
from drf_spectacular.utils import extend_schema
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError, NotFound
from rest_framework.permissions import IsAuthenticated, AllowAny
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
    CustomerProfileCreateUpdateSerializer,
    ClientProfileCreateUpdateSerializer,
    PortfolioSerializer,
    AvailabilitySerializer,
    VerificationDocumentSerializer,
)


@extend_schema(tags=["Client Profile"])
class ClientProfileViewSet(viewsets.ModelViewSet):
    serializer_class = ClientProfileSerializer
    queryset = ClientProfile.objects.all()

    def get_permissions(self):
        """Permission'larni action bo'yicha sozlash"""
        if self.action in ["list", "retrieve"]:
            # Hamma ko'ra oladi
            permission_classes = [AllowAny]
        elif self.action in ["my_profile"]:
            # Faqat login qilganlar
            permission_classes = [IsAuthenticated]
        else:
            # Create/Update/Delete - faqat owner yoki admin
            permission_classes = [IsAuthenticated]

        return [permission() for permission in permission_classes]

    def get_serializer_class(self):
        """Action bo'yicha serializer tanlash"""
        if self.action in ["create", "update", "partial_update"]:
            return ClientProfileCreateUpdateSerializer
        return ClientProfileSerializer

    def get_object(self):
        """Object olish - ID orqali yoki own profile"""
        if self.action == "my_profile":
            try:
                return self.request.user.clientprofile
            except ClientProfile.DoesNotExist:
                raise NotFound({"detail": "You don't have a client profile yet."})

        # Normal ID orqali olish
        return super().get_object()

    def perform_create(self, serializer):
        """Profile yaratish"""
        if hasattr(self.request.user, "clientprofile"):
            raise ValidationError({"detail": "You already have a client profile."})

        if self.request.user.role != "client":
            raise ValidationError(
                {"detail": "Only clients can create client profiles."}
            )

        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        """Faqat o'z profilini update qila oladi"""
        obj = self.get_object()
        if obj.user != self.request.user and not getattr(
            self.request.user, "is_admin", False
        ):
            raise PermissionDenied({"detail": "You can only update your own profile."})
        serializer.save()

    @action(detail=False, methods=["get", "put", "patch"], url_path="my")
    def my_profile(self, request):
        """O'z profilini ko'rish/yangilash"""
        try:
            profile = request.user.clientprofile
        except ClientProfile.DoesNotExist:
            raise NotFound({"detail": "You don't have a client profile yet."})

        if request.method == "GET":
            serializer = ClientProfileSerializer(profile)
            return Response(serializer.data)

        elif request.method in ["PUT", "PATCH"]:
            partial = request.method == "PATCH"
            serializer = ClientProfileCreateUpdateSerializer(
                profile, data=request.data, partial=partial
            )
            if serializer.is_valid():
                serializer.save()
                response_serializer = ClientProfileSerializer(profile)
                return Response(response_serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(tags=["Customer Profile"])
class CustomerProfileViewSet(viewsets.ModelViewSet):
    serializer_class = CustomerProfileSerializer
    queryset = CustomerProfile.objects.all()
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = CustomerProfileFilter
    search_fields = ["user__first_name", "user__last_name", "professional_bio"]
    ordering_fields = ["average_rating", "created_at", "years_of_experience"]
    ordering = ["-average_rating"]

    def get_permissions(self):
        """Permission'larni action bo'yicha sozlash"""
        if self.action in ["list", "retrieve"]:
            # Hamma ko'ra oladi (public profiles)
            permission_classes = [AllowAny]
        elif self.action in ["my_profile"]:
            # Faqat login qilganlar
            permission_classes = [IsAuthenticated]
        else:
            # Create/Update/Delete - faqat owner yoki admin
            permission_classes = [IsAuthenticated]

        return [permission() for permission in permission_classes]

    def get_serializer_class(self):
        """Action bo'yicha serializer tanlash"""
        if self.action in ["create", "update", "partial_update"]:
            return CustomerProfileCreateUpdateSerializer
        return CustomerProfileSerializer

    def get_object(self):
        """Object olish - ID orqali yoki own profile"""
        if self.action == "my_profile":
            try:
                return self.request.user.customerprofile
            except CustomerProfile.DoesNotExist:
                raise NotFound({"detail": "You don't have a customer profile yet."})

        # Normal ID orqali olish
        return super().get_object()

    def get_queryset(self):
        """Queryset filtrlash"""
        if self.action in ["list", "retrieve"]:
            # Public view - hamma available customer'lar
            return CustomerProfile.objects.filter(is_available=True)
        else:
            # Private operations - faqat o'ziniki
            if hasattr(self.request.user, "customerprofile"):
                return CustomerProfile.objects.filter(user=self.request.user)
            return CustomerProfile.objects.none()

    def perform_create(self, serializer):
        """Profile yaratish"""
        if CustomerProfile.objects.filter(user=self.request.user).exists():
            raise ValidationError({"detail": "You already have a customer profile."})

        if self.request.user.role != "customer":
            raise ValidationError(
                {"detail": "Only customers can create customer profiles."}
            )

        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        """Faqat o'z profilini update qila oladi"""
        obj = self.get_object()
        if obj.user != self.request.user and not getattr(
            self.request.user, "is_admin", False
        ):
            raise PermissionDenied({"detail": "You can only update your own profile."})
        serializer.save()

    @action(detail=False, methods=["get", "put", "patch"], url_path="my")
    def my_profile(self, request):
        """O'z profilini ko'rish/yangilash"""
        try:
            profile = request.user.customerprofile
        except CustomerProfile.DoesNotExist:
            raise NotFound({"detail": "You don't have a customer profile yet."})

        if request.method == "GET":
            serializer = CustomerProfileSerializer(profile)
            return Response(serializer.data)

        elif request.method in ["PUT", "PATCH"]:
            partial = request.method == "PATCH"
            serializer = CustomerProfileCreateUpdateSerializer(
                profile, data=request.data, partial=partial
            )
            if serializer.is_valid():
                serializer.save()
                response_serializer = CustomerProfileSerializer(profile)
                return Response(response_serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# === Qolgan ViewSet'lar ===
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
        if not customer and not getattr(self.request.user, "is_admin", False):
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
        if getattr(user, "is_admin", False):
            return Portfolio.objects.all()
        return Portfolio.objects.filter(customer__user=user)


@extend_schema(tags=["VerificationDocument"])
class VerificationDocumentViewSet(CustomerOwnedModelViewSet):
    serializer_class = VerificationDocumentSerializer
    queryset = VerificationDocument.objects.all()

    def get_queryset(self):
        user = self.request.user
        if getattr(user, "is_admin", False):
            return VerificationDocument.objects.all()
        return VerificationDocument.objects.filter(customer__user=user)


@extend_schema(tags=["Availability"])
class AvailabilityViewSet(CustomerOwnedModelViewSet):
    serializer_class = AvailabilitySerializer
    queryset = Availability.objects.all()

    def get_queryset(self):
        user = self.request.user
        if getattr(user, "is_admin", False):
            return Availability.objects.all()
        return Availability.objects.filter(customer__user=user)

    def perform_create(self, serializer):
        try:
            customer_profile = self.request.user.customerprofile
        except CustomerProfile.DoesNotExist:
            raise ValidationError({"detail": "You don't have a customer profile yet."})

        date = serializer.validated_data.get("date")
        if Availability.objects.filter(customer=customer_profile, date=date).exists():
            raise ValidationError(
                {"detail": f"Availability for {date} already exists."}
            )
        serializer.save(customer=customer_profile)
