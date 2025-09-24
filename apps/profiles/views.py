# apps/profiles/views.py
from django.core.files.storage import default_storage
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError, NotFound
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from .models import (
    ClientProfile,
    CustomerProfile,
    Portfolio,
    Unavailability,
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
    UnavailabilitySerializer,
)


# ---------- Shared mixin for avatar ----------
class AvatarMixin:
    parser_classes = [MultiPartParser, FormParser]

    @action(detail=True, methods=["get"], url_path="avatar")
    def get_avatar(self, request, *args, **kwargs):
        profile = self.get_object()
        url = request.build_absolute_uri(profile.avatar.url) if profile.avatar else None
        return Response({"avatar_url": url}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["put", "patch"], url_path="avatar")
    def upload_avatar(self, request, *args, **kwargs):
        profile = self.get_object()
        avatar = request.FILES.get("avatar")
        if not avatar:
            return Response({"detail": "No avatar file uploaded."}, status=400)

        # remove old file if exists
        if profile.avatar:
            old_path = profile.avatar.path
            profile.avatar.delete(save=False)
            if default_storage.exists(old_path):
                default_storage.delete(old_path)

        profile.avatar = avatar
        profile.save(update_fields=["avatar"])
        url = request.build_absolute_uri(profile.avatar.url)
        return Response({"detail": "Avatar uploaded successfully.", "avatar_url": url})

    @action(detail=True, methods=["delete"], url_path="avatar")
    def delete_avatar(self, request, *args, **kwargs):
        profile = self.get_object()
        if not profile.avatar:
            return Response(
                {"detail": "No avatar to delete.", "avatar_url": None}, status=404
            )
        path = profile.avatar.path
        profile.avatar.delete(save=False)
        if default_storage.exists(path):
            default_storage.delete(path)
        profile.save(update_fields=["avatar"])
        return Response({"detail": "Avatar deleted successfully.", "avatar_url": None})


# ---------- Base profile viewset ----------
class BaseProfileViewSet(viewsets.ModelViewSet):
    lookup_field = "user_id"
    lookup_url_kwarg = "user_id"
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [AllowAny()]
        return [IsAuthenticated()]

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
        user_id = self.kwargs.get(self.lookup_url_kwarg)
        try:
            return self.model.objects.get(user_id=user_id)
        except self.model.DoesNotExist:
            raise NotFound(
                {"detail": f"No {self.model.__name__} matches this user ID."}
            )

    @action(detail=False, methods=["get", "put", "patch"], url_path="my")
    def my_profile(self, request):
        profile, _ = self.model.objects.get_or_create(user=request.user)
        if request.method == "GET":
            ser = self.serializer_class(profile, context={"request": request})
            return Response(ser.data)
        partial = request.method == "PATCH"
        ser = self.create_update_serializer_class(
            profile, data=request.data, partial=partial, context={"request": request}
        )
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(
            self.serializer_class(profile, context={"request": request}).data
        )

    def perform_create(self, serializer):
        if self.model.objects.filter(user=self.request.user).exists():
            raise ValidationError({"detail": "You already have a profile."})
        if getattr(self.request.user, "role", None) != self.user_role:
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


# ---------- Client profile ----------
@extend_schema(tags=["Client Profile"])
class ClientProfileViewSet(BaseProfileViewSet):
    model = ClientProfile
    queryset = ClientProfile.objects.select_related("user").prefetch_related(
        "languages"
    )
    serializer_class = ClientProfileSerializer
    create_update_serializer_class = (
        ClientProfileCreateUpdateSerializer  # FIX: correct CU serializer
    )
    profile_attr = "clientprofile"
    user_role = "client"

    @action(
        detail=True,
        methods=["get", "put", "delete"],
        parser_classes=[MultiPartParser, FormParser],
        url_path="avatar",
        permission_classes=[IsAuthenticated, IsOwnerOrAdmin],
    )
    def avatar(self, request, user_id=None):
        profile = get_object_or_404(ClientProfile, user__id=user_id)
        if request.user != profile.user and not getattr(
            request.user, "is_admin", False
        ):
            raise PermissionDenied({"error": "You can only manage your own avatar."})

        if request.method == "GET":
            url = (
                request.build_absolute_uri(profile.avatar.url)
                if profile.avatar
                else None
            )
            return Response({"avatar_url": url})

        if request.method == "PUT":
            avatar = request.FILES.get("avatar")
            if not avatar:
                return Response({"error": "Avatar file is required."}, status=400)
            if avatar.size > 5 * 1024 * 1024:
                return Response(
                    {"error": "Avatar file size must be less than 5MB."}, status=400
                )
            if avatar.content_type not in ["image/jpeg", "image/png", "image/gif"]:
                return Response(
                    {"error": "Avatar must be a JPEG, PNG, or GIF image."}, status=400
                )
            if profile.avatar:
                profile.avatar.delete(save=False)
            profile.avatar = avatar
            profile.save(update_fields=["avatar"])
            url = request.build_absolute_uri(profile.avatar.url)
            return Response(
                {"message": "Avatar uploaded successfully.", "avatar_url": url}
            )

        # DELETE
        if not profile.avatar:
            return Response(
                {"error": "No avatar to delete.", "avatar_url": None}, status=404
            )
        profile.avatar.delete(save=False)
        profile.save(update_fields=["avatar"])
        return Response({"message": "Avatar deleted successfully.", "avatar_url": None})


# ---------- Customer profile ----------
@extend_schema(tags=["Customer Profile"])
class CustomerProfileViewSet(AvatarMixin, BaseProfileViewSet):
    model = CustomerProfile
    queryset = CustomerProfile.objects.select_related("user", "city").prefetch_related(
        "languages", "service_types"
    )
    serializer_class = CustomerProfileSerializer
    create_update_serializer_class = CustomerProfileCreateUpdateSerializer
    profile_attr = "customerprofile"
    user_role = "customer"


class CustomerOwnedModelViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]

    def get_customer_profile(self):
        try:
            return self.request.user.customerprofile
        except CustomerProfile.DoesNotExist:
            return None

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        return (
            qs if getattr(user, "is_admin", False) else qs.filter(customer__user=user)
        )

    def perform_create(self, serializer):
        customer = self.get_customer_profile()
        if not customer and not getattr(self.request.user, "is_admin", False):
            raise PermissionDenied(
                {"detail": "You must be a customer to create this resource."}
            )
        serializer.save(customer=customer)

    @action(detail=False, methods=["get"], url_path="my")
    def my_items(self, request):
        qs = self.filter_queryset(self.get_queryset())
        ser = self.get_serializer(qs, many=True, context={"request": request})
        return Response(ser.data)


# ---------- Portfolio ----------
@extend_schema(tags=["Portfolio"])
class PortfolioViewSet(CustomerOwnedModelViewSet):
    serializer_class = PortfolioSerializer
    queryset = Portfolio.objects.select_related("customer", "customer__user")
    parser_classes = [MultiPartParser, FormParser, JSONParser]


# ---------- Verification docs ----------
@extend_schema(tags=["VerificationDocument"])
class VerificationDocumentViewSet(CustomerOwnedModelViewSet):
    serializer_class = VerificationDocumentSerializer
    queryset = VerificationDocument.objects.select_related(
        "customer", "customer__user", "verified_by"
    )
    parser_classes = [MultiPartParser, FormParser, JSONParser]


# ---------- Unavailability ----------
@extend_schema(tags=["Unavailability"])
class UnavailabilityViewSet(CustomerOwnedModelViewSet):
    serializer_class = UnavailabilitySerializer
    queryset = Unavailability.objects.select_related("customer", "customer__user")

    def perform_create(self, serializer):
        customer = self.get_customer_profile()
        if not customer:
            raise ValidationError({"detail": "You don't have a customer profile yet."})
        serializer.save(customer=customer)
