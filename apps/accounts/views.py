from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from drf_spectacular.utils import extend_schema
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.users.serializers import AuthTokenSerializer
from .serializers import RequestVerificationCodeSerializer, RegisterSerializer


@extend_schema(tags=["accounts"])
class LoginView(TokenObtainPairView):
    serializer_class = AuthTokenSerializer


@extend_schema(tags=["accounts"])
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


@extend_schema(tags=["accounts"])
class RegisterView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer
