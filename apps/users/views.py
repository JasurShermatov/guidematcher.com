# apps/users/views.py
from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.decorators import action
from drf_spectacular.utils import extend_schema
from django.core.cache import cache

from apps.users.models import User
from apps.users.serializers import (
    GoogleAuthSerializer,
    ProfileSerializer,
    UserShortSerializer,
)
from apps.users.permissions import IsOwnerOrAdmin


@extend_schema(
    tags=["users"],
    summary="Google Login",
    description="Authenticate user via Google OAuth and return access + refresh tokens",
)
class GoogleLoginView(generics.GenericAPIView):
    serializer_class = GoogleAuthSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tokens = serializer.save()
        return Response(tokens, status=status.HTTP_200_OK)


@extend_schema(
    tags=["users"],
    summary="List All Users",
    description="Retrieve a paginated list of all users. Admins can see all users, ordinary users may see only their own info depending on permissions.",
)
class UserListView(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdmin]

    def get_serializer_class(self):
        if self.action == "short":
            return UserShortSerializer
        return ProfileSerializer

    def get_object(self):
        pk = self.kwargs.get("pk") or self.request.user.pk
        user = cache.get(f"user:{pk}")
        if not user:
            user = self.get_queryset().get(pk=pk)
            cache.set(f"user:{pk}", user, timeout=3600)
        return user

    @extend_schema(
        summary="Retrieve User Detail",
        description="Get full details of a user by ID. Admins can retrieve any user, ordinary users can retrieve only their own profile.",
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @extend_schema(
        summary="Create New User",
        description="Create a new user (usually for admin use). Returns created user data.",
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @extend_schema(
        summary="Update User",
        description="Update all fields of a user by ID. Admins can update any user, ordinary users can update only their own profile.",
    )
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @extend_schema(
        summary="Partial Update User",
        description="Update some fields of a user by ID (PATCH). Admins can update any user, ordinary users can update only their own profile.",
    )
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    @extend_schema(
        summary="Delete User",
        description="Delete a user by ID. Usually restricted to admins.",
    )
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)

    @action(
        detail=False,
        methods=["get"],
        permission_classes=[permissions.IsAuthenticated],
    )
    @extend_schema(
        summary="Get Short Info of Logged-in User",
        description="Return minimal information about the currently logged-in user (id, name, email, role).",
    )
    def short(self, request):
        serializer = UserShortSerializer(request.user)
        return Response(serializer.data)
