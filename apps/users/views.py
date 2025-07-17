# apps/users/views.py
from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema

from apps.users.serializers import (
    GoogleAuthSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    ProfileSerializer,
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
class ProfileViewSet(
    viewsets.GenericViewSet, generics.RetrieveAPIView, generics.UpdateAPIView
):
    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user
