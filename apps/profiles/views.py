from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import OpenApiParameter
from drf_spectacular.utils import extend_schema
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError, NotFound
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from .filters import CustomerProfileFilter
from .models import (
    ClientProfile,
    CustomerProfile,
    Portfolio,
    Availability,
    VerificationDocument,
)
from .permissions import IsOwnerOrAdmin
from .serializers import (
    ClientProfileSerializer,
    ClientProfileCreateUpdateSerializer,
    CustomerProfileSerializer,
    CustomerProfileCreateUpdateSerializer,
    PortfolioSerializer,
    VerificationDocumentSerializer,
    AvailabilitySerializer,
    CustomerPortfolioPublicSerializer,
)


class BaseProfileViewSet(viewsets.ModelViewSet):
    lookup_field = "user_id"

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            permission_classes = [AllowAny]
        elif self.action in ["my_profile"]:
            permission_classes = [IsAuthenticated]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return self.create_update_serializer_class
        return self.serializer_class

    def get_object(self):
        if self.action == "my_profile":
            try:
                return getattr(self.request.user, self.profile_attr)
            except self.model.DoesNotExist:
                raise NotFound({"detail": "Profile not found."})

        user_id = self.kwargs.get("user_id")
        try:
            return self.model.objects.get(user_id=user_id)
        except self.model.DoesNotExist:
            raise NotFound(
                {"detail": f"No {self.model.__name__} matches this user ID."}
            )

    @action(detail=False, methods=["get", "put", "patch"], url_path="my")
    def my_profile(self, request):
        try:
            profile = getattr(request.user, self.profile_attr, None)
            if not profile:
                raise NotFound({"detail": "Profile not found."})

            if request.method == "GET":
                serializer = self.serializer_class(profile)
                return Response(serializer.data)

            partial = request.method == "PATCH"
            serializer = self.create_update_serializer_class(
                profile, data=request.data, partial=partial
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(self.serializer_class(profile).data)
        except Exception as e:
            raise ValidationError({"detail": str(e)})

    def perform_create(self, serializer):
        # FIXED: Profile mavjudligini to'g'ri tekshirish
        try:
            existing_profile = getattr(self.request.user, self.profile_attr, None)
            if existing_profile:
                raise ValidationError({"detail": "You already have a profile."})
        except AttributeError:
            # Profile attribute mavjud emas, davom etamiz
            pass

        # FIXED: User role tekshirishni to'g'irlash
        if hasattr(self.request.user, "role"):
            if self.request.user.role.lower() != self.user_role.lower():
                raise ValidationError(
                    {"detail": f"Only {self.user_role}s can create profile."}
                )

        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        obj = self.get_object()
        if obj.user != self.request.user and not getattr(
            self.request.user, "is_admin", False
        ):
            raise PermissionDenied({"detail": "You can only update your own profile."})
        serializer.save()


@extend_schema(tags=["Client Profile"])
class ClientProfileViewSet(BaseProfileViewSet):
    model = ClientProfile
    queryset = ClientProfile.objects.all()
    serializer_class = ClientProfileSerializer
    create_update_serializer_class = ClientProfileCreateUpdateSerializer
    profile_attr = "clientprofile"
    user_role = "client"


@extend_schema(tags=["Customer Profile"])
class CustomerProfileViewSet(BaseProfileViewSet):
    model = CustomerProfile
    queryset = CustomerProfile.objects.all()
    serializer_class = CustomerProfileSerializer
    create_update_serializer_class = CustomerProfileCreateUpdateSerializer
    profile_attr = "customerprofile"
    user_role = "customer"

    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = CustomerProfileFilter
    search_fields = ["user__first_name", "user__last_name", "professional_bio"]
    ordering_fields = ["average_rating", "created_at", "years_of_experience"]
    ordering = ["-average_rating"]

    def get_queryset(self):
        # FIXED: List action uchun to'g'ri queryset
        if self.action in ["list", "retrieve", "portfolio"]:
            return (
                CustomerProfile.objects.filter(is_available=True, user__is_active=True)
                .select_related("user", "city", "city__country")
                .prefetch_related("service_types", "languages", "portfolio_set")
            )
        elif self.action == "my_profile":
            # My profile uchun faqat foydalanuvchining profili
            return CustomerProfile.objects.filter(user=self.request.user)
        return CustomerProfile.objects.all()

    @extend_schema(
        summary="Get customer public portfolio with reviews",
        description="Get complete customer portfolio including all reviews, ratings, and portfolio items",
        parameters=[
            OpenApiParameter(
                "review_limit",
                int,
                OpenApiParameter.QUERY,
                description="Number of reviews to return (default: 10, max: 50)",
            )
        ],
        responses={200: CustomerPortfolioPublicSerializer},
    )
    @action(
        detail=True,
        methods=["get"],
        url_path="portfolio",
        permission_classes=[AllowAny],
    )
    def portfolio(self, request, user_id=None):
        try:
            customer = (
                CustomerProfile.objects.select_related("user", "city", "city__country")
                .prefetch_related(
                    "service_types",
                    "languages",
                    "portfolio_set",
                    "received_reviews__client",
                )
                .get(user_id=user_id, is_available=True)
            )
        except CustomerProfile.DoesNotExist:
            raise NotFound({"detail": "Customer portfolio not found or not available"})

        serializer = CustomerPortfolioPublicSerializer(
            customer, context={"request": request}
        )
        return Response(serializer.data)


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
                {"detail": "You must be a customer to create this resource."}
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
        customer_profile = self.get_customer_profile()
        if not customer_profile:
            raise ValidationError({"detail": "You don't have a customer profile yet."})

        date = serializer.validated_data.get("date")
        if Availability.objects.filter(customer=customer_profile, date=date).exists():
            raise ValidationError(
                {"detail": f"Availability for {date} already exists."}
            )

        serializer.save(customer=customer_profile)
