# apps/accounts/views.py
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from drf_spectacular.utils import extend_schema

from .serializers import RequestVerificationCodeSerializer, RegisterSerializer


@extend_schema(tags=["Accounts"])
class RequestCodeView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = RequestVerificationCodeSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ev = serializer.save()
        return Response(
            {"detail": "Kod yuborildi.", "expires_at": ev.expires_at},
            status=status.HTTP_201_CREATED,
        )


class RegisterView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer
