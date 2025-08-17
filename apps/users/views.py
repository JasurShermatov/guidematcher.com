from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.decorators import action
from drf_spectacular.utils import extend_schema
from django.core.cache import cache

from apps.users.models import User
from apps.users.serializers import (
    GoogleAuthSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    ProfileSerializer,
    UserShortSerializer,
)
from apps.users.permissions import IsOwnerOrAdmin


@extend_schema(tags=["users"])
class GoogleLoginView(generics.GenericAPIView):
    """Google orqali login"""

    serializer_class = GoogleAuthSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tokens = serializer.save()
        return Response(tokens, status=status.HTTP_200_OK)


@extend_schema(tags=["users"])
class PasswordResetRequestView(generics.GenericAPIView):
    """Parolni tiklash uchun email yuborish"""

    serializer_class = PasswordResetRequestSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        self.get_serializer(data=request.data).is_valid(raise_exception=True)
        return Response({"detail": "Reset link yuborildi."})


@extend_schema(tags=["users"])
class PasswordResetConfirmView(generics.GenericAPIView):
    """Parolni yangilash"""

    serializer_class = PasswordResetConfirmSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        self.get_serializer(data=request.data).is_valid(raise_exception=True)
        return Response({"detail": "Parol yangilandi."})


@extend_schema(tags=["users"])
class UserViewSet(viewsets.ModelViewSet):
    """
    User management:
    - Oddiy user → faqat o‘z profilini ko‘rishi va yangilashi mumkin.
    - Admin → barcha userlarni boshqarishi mumkin.
    - GET /users/short/ → login bo‘lgan user qisqa ma’lumotlari.
    """

    queryset = User.objects.all()
    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdmin]

    def get_serializer_class(self):
        if self.action == "short":
            return UserShortSerializer
        return ProfileSerializer

    def get_object(self):
        """Cache orqali yoki DB dan userni olish"""
        pk = self.kwargs.get("pk") or self.request.user.pk
        user = cache.get(f"user:{pk}")
        if not user:
            user = self.get_queryset().get(pk=pk)
            cache.set(f"user:{pk}", user, timeout=3600)
        return user

    @action(
        detail=False,
        methods=["get"],
        permission_classes=[permissions.IsAuthenticated],
    )
    @extend_schema(responses=UserShortSerializer)
    def short(self, request):
        """GET /users/short/ → login bo‘lgan user qisqa ma’lumotlari"""
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)
