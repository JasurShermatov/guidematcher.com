# apps/users/views.py
from rest_framework import generics, permissions, status, viewsets, mixins
from rest_framework.response import Response
from rest_framework.decorators import action
from drf_spectacular.utils import extend_schema
from django.core.cache import cache

from apps.users.serializers import (
    GoogleAuthSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    ProfileSerializer,
    UserShortSerializer,
)


@extend_schema(tags=["users"])
class GoogleLoginView(generics.GenericAPIView):
    serializer_class = GoogleAuthSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tokens = serializer.save()
        return Response(tokens, status=status.HTTP_200_OK)


@extend_schema(tags=["users"])
class PasswordResetRequestView(generics.GenericAPIView):
    serializer_class = PasswordResetRequestSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        self.get_serializer(data=request.data).is_valid(raise_exception=True)
        return Response({"detail": "Reset link yuborildi."})


@extend_schema(tags=["users"])
class PasswordResetConfirmView(generics.GenericAPIView):
    serializer_class = PasswordResetConfirmSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        self.get_serializer(data=request.data).is_valid(raise_exception=True)
        return Response({"detail": "Parol yangilandi."})


@extend_schema(tags=["users"])
class ProfileViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "short":
            return UserShortSerializer
        return ProfileSerializer

    def get_object(self):
        user = cache.get(f"user:{self.request.user.pk}")
        if not user:
            user = self.request.user
            cache.set(f"user:{user.pk}", user, timeout=3600)
        return user

    @extend_schema(responses=ProfileSerializer)
    def retrieve(self, request):
        serializer = self.get_serializer(self.get_object())
        return Response(serializer.data)

    @extend_schema(request=ProfileSerializer, responses=ProfileSerializer)
    def update(self, request):
        user = self.get_object()
        serializer = self.get_serializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        cache.set(f"user:{user.pk}", user, timeout=3600)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], permission_classes=[permissions.IsAuthenticated])
    @extend_schema(responses=UserShortSerializer)
    def short(self, request):
        serializer = self.get_serializer(self.get_object())
        return Response(serializer.data)
