from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from drf_spectacular.utils import extend_schema
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from apps.users.serializers import AuthTokenSerializer
from .serializers import RequestVerificationCodeSerializer, RegisterSerializer


@extend_schema(tags=["accounts"])
class LoginView(TokenObtainPairView):
    serializer_class = AuthTokenSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.user
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)

        response_data = {
            "access_token": access_token,
            "refresh_token": str(refresh),
            "user": {
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": user.role,
                "country": user.country_name if user.country else None,
            },
        }
        return Response(response_data, status=status.HTTP_200_OK)


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

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)

        response_data = {
            "message": "Foydalanuvchi muvaffaqiyatli ro‘yxatdan o‘tdi",
            "user": {
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": user.role,
                "country": user.country_name if user.country else None,
            },
            "access_token": access_token,
            "refresh_token": str(refresh),
        }

        return Response(response_data, status=status.HTTP_201_CREATED)


@extend_schema(tags=["accounts"])
class CustomTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        return Response(
            {
                "access_token": response.data["access"],
                "refresh_token": request.data.get("refresh"),
            },
            status=status.HTTP_200_OK,
        )
