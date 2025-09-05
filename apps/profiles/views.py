from django.core.files.storage import default_storage
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError, NotFound
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from sqlalchemy import null

from .filters import CustomerProfileFilter
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


class AvatarMixin:
    """Avatar upload, retrieve, delete API mixin"""

    parser_classes = [MultiPartParser, FormParser]

    @action(detail=True, methods=["get"], url_path="avatar")
    def get_avatar(self, request, user_id=None):
        """
        Retrieve profile avatar.
        Returns 404 if no avatar is set.
        """
        profile = self.get_object()
        if not profile.avatar:
            return Response(
                {"detail": "No avatar set.", "avatar_url": None},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response({"avatar_url": request.build_absolute_uri(profile.avatar.url)})

    @action(detail=True, methods=["put", "patch"], url_path="avatar")
    def upload_avatar(self, request, user_id=None):
        """
        Upload or update profile avatar.
        Expects an avatar file in the request.
        """
        profile = self.get_object()
        avatar = request.FILES.get("avatar")
        if not avatar:
            return Response(
                {"detail": "No avatar file uploaded."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Delete old avatar if exists
        if profile.avatar:
            old_avatar_path = profile.avatar.path
            profile.avatar.delete(save=False)
            if default_storage.exists(old_avatar_path):
                default_storage.delete(old_avatar_path)

        # Save new avatar
        profile.avatar = avatar
        profile.save(update_fields=["avatar"])
        return Response(
            {
                "detail": "Avatar uploaded successfully.",
                "avatar_url": request.build_absolute_uri(profile.avatar.url),
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["delete"], url_path="avatar")
    def delete_avatar(self, request, user_id=None):
        """
        Delete profile avatar.
        Returns 404 if no avatar exists.
        """
        profile = self.get_object()
        if not profile.avatar:
            return Response(
                {"detail": "No avatar to delete.", "avatar_url": None},
                status=status.HTTP_404_NOT_FOUND,
            )

        avatar_path = profile.avatar.path
        profile.avatar.delete(save=False)
        if default_storage.exists(avatar_path):
            default_storage.delete(avatar_path)

        profile.save(update_fields=["avatar"])
        return Response(
            {"detail": "Avatar deleted successfully.", "avatar_url": None},
            status=status.HTTP_200_OK,
        )


class BaseProfileViewSet(viewsets.ModelViewSet):
    lookup_field = "user_id"

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            permission_classes = [AllowAny]
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

    def perform_create(self, serializer):
        if hasattr(self.request.user, self.profile_attr):
            raise ValidationError({"detail": "You already have a profile."})
        if self.request.user.role != self.user_role:
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


class ClientProfileViewSet(viewsets.ModelViewSet):
    queryset = ClientProfile.objects.all()
    serializer_class = ClientProfileSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

    @action(detail=False, methods=["get", "patch"], url_path="my")
    def my_profile(self, request):
        profile, created = ClientProfile.objects.get_or_create(user=request.user)
        if request.method == "GET":
            serializer = self.serializer_class(profile)
            return Response(serializer.data)
        elif request.method == "PATCH":
            serializer = self.serializer_class(profile, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(
        detail=True,
        methods=["get", "put", "delete"],
        parser_classes=[MultiPartParser, FormParser],
        url_path="avatar",
        permission_classes=[IsAuthenticated, IsOwnerOrAdmin],
    )
    def avatar(self, request, pk=None):
        profile = get_object_or_404(ClientProfile, user__id=pk)
        if request.user != profile.user and not getattr(
            request.user, "is_admin", False
        ):
            raise PermissionDenied({"error": "You can only manage your own avatar."})

        if request.method == "GET":
            if profile.avatar:
                avatar_url = request.build_absolute_uri(profile.avatar.url)
                return Response({"avatar_url": avatar_url}, status=status.HTTP_200_OK)
            return Response(
                {"error": "No avatar set.", "avatar_url": null},
                status=status.HTTP_404_NOT_FOUND,
            )

        elif request.method == "PUT":
            avatar = request.FILES.get("avatar")
            if not avatar:
                return Response(
                    {"error": "Avatar file is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            # Validate file size and type
            if avatar.size > 5 * 1024 * 1024:
                return Response(
                    {"error": "Avatar file size must be less than 5MB."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if avatar.content_type not in ["image/jpeg", "image/png", "image/gif"]:
                return Response(
                    {"error": "Avatar must be a JPEG, PNG, or GIF image."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            # Delete old avatar if exists
            if profile.avatar:
                profile.avatar.delete(save=False)
            profile.avatar = avatar
            profile.save(update_fields=["avatar"])
            avatar_url = request.build_absolute_uri(profile.avatar.url)
            return Response(
                {"message": "Avatar uploaded successfully.", "avatar_url": avatar_url},
                status=status.HTTP_200_OK,
            )

        elif request.method == "DELETE":
            if not profile.avatar:
                return Response(
                    {"error": "No avatar to delete.", "avatar_url": null},
                    status=status.HTTP_404_NOT_FOUND,
                )
            profile.avatar.delete(save=False)
            profile.save(update_fields=["avatar"])
            return Response(
                {"message": "Avatar deleted successfully.", "avatar_url": null},
                status=status.HTTP_200_OK,
            )


@extend_schema(tags=["Customer Profile"])
class CustomerProfileViewSet(AvatarMixin, BaseProfileViewSet):
    model = CustomerProfile
    queryset = CustomerProfile.objects.all()
    serializer_class = CustomerProfileSerializer
    create_update_serializer_class = CustomerProfileCreateUpdateSerializer
    profile_attr = "customerprofile"
    user_role = "customer"
    lookup_field = "user_id"

    @action(
        detail=True,
        methods=["get", "put", "delete"],
        parser_classes=[MultiPartParser, FormParser],
        url_path="avatar",
        permission_classes=[IsAuthenticated],
    )
    def avatar(self, request, user_id=None):
        profile = self.get_object()
        if request.method == "GET":
            if profile.avatar:
                avatar_url = request.build_absolute_uri(profile.avatar.url)
                return Response({"avatar_url": avatar_url}, status=status.HTTP_200_OK)
            return Response(
                {"detail": "No avatar set.", "avatar_url": None},
                status=status.HTTP_404_NOT_FOUND,
            )
        elif request.method == "PUT":
            if "avatar" not in request.FILES:
                return Response(
                    {"detail": "Avatar file required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            # Delete old avatar if exists
            if profile.avatar:
                old_avatar_path = profile.avatar.path
                profile.avatar.delete(save=False)
                if default_storage.exists(old_avatar_path):
                    default_storage.delete(old_avatar_path)
            profile.avatar = request.FILES["avatar"]
            profile.save(update_fields=["avatar"])
            avatar_url = request.build_absolute_uri(profile.avatar.url)
            return Response(
                {"detail": "Avatar uploaded successfully.", "avatar_url": avatar_url},
                status=status.HTTP_200_OK,
            )
        elif request.method == "DELETE":
            if not profile.avatar:
                return Response(
                    {"detail": "No avatar to delete.", "avatar_url": None},
                    status=status.HTTP_404_NOT_FOUND,
                )
            avatar_path = profile.avatar.path
            profile.avatar.delete(save=False)
            if default_storage.exists(avatar_path):
                default_storage.delete(avatar_path)
            profile.save(update_fields=["avatar"])
            return Response(
                {"detail": "Avatar deleted successfully.", "avatar_url": None},
                status=status.HTTP_200_OK,
            )


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


@extend_schema(tags=["Unavailability"])
class UnavailabilityViewSet(CustomerOwnedModelViewSet):
    serializer_class = UnavailabilitySerializer
    queryset = Unavailability.objects.all()

    def get_queryset(self):
        user = self.request.user
        if getattr(user, "is_admin", False):
            return Unavailability.objects.all()
        return Unavailability.objects.filter(customer__user=user)

    def perform_create(self, serializer):
        customer_profile = self.get_customer_profile()
        if not customer_profile:
            raise ValidationError({"detail": "You don't have a customer profile yet."})

        start_date = serializer.validated_data.get("start_date")
        end_date = serializer.validated_data.get("end_date")

        if Unavailability.objects.filter(
            customer=customer_profile,
            start_date__lte=end_date,
            end_date__gte=start_date,
        ).exists():
            raise ValidationError(
                {
                    "detail": "You already have an unavailability period overlapping this date range."
                }
            )

        serializer.save(customer=customer_profile)
