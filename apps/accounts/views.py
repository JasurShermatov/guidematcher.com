#  apps/accounts/views.py
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from drf_spectacular.utils import extend_schema
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import (
    CustomTokenObtainPairSerializer,
    RequestVerificationCodeSerializer,
    RegisterSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    LogoutSerializer,
)


@extend_schema(
    tags=["accounts"],
    summary="User Login",
    description="Authenticate user with email and password",
)
class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        request.data["email"] = request.data.get("email", "").lower().strip()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.user
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)

        profile_id = None
        if user.role == "Client":
            from apps.clients.models import ClientProfile

            profile = ClientProfile.objects.filter(user=user).first()
            if profile:
                profile_id = profile.id
        elif user.role == "Customer":
            from apps.customers.models import CustomerProfile

            profile = CustomerProfile.objects.filter(user=user).first()
            if profile:
                profile_id = profile.id

        response_data = {
            "message": "Login successful.",
            "access_token": access_token,
            "refresh_token": str(refresh),
            "user": {
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": user.role,
                "country": user.country_name if user.country else None,
                "profile_id": profile_id,
            },
        }
        return Response(response_data, status=status.HTTP_200_OK)


@extend_schema(
    tags=["accounts"],
    summary="Request Verification Code",
    description="Send verification code to email for registration",
)
class RequestCodeView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = RequestVerificationCodeSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ev = serializer.save()
        return Response(
            {
                "message": "Verification code sent successfully.",
                "expires_at": ev.expires_at,
            },
            status=status.HTTP_201_CREATED,
        )


@extend_schema(
    tags=["accounts"],
    summary="Register New User",
    description="Register a new user with verification code",
)
class RegisterView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "message": "User registered successfully.",
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "role": user.role,
                    "country": user.country_name if user.country else None,
                },
                "access_token": str(refresh.access_token),
                "refresh_token": str(refresh),
            },
            status=status.HTTP_201_CREATED,
        )


@extend_schema(
    tags=["accounts"],
    summary="Refresh Access Token",
    description="Get new access token using refresh token",
)
class CustomTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        # response.data["refresh"] – bu yangi token, agar ROTATE_REFRESH_TOKENS=True bo'lsa
        return Response(
            {
                "message": "Token refreshed successfully.",
                "access_token": response.data["access"],
                "refresh_token": response.data.get(
                    "refresh", request.data.get("refresh")
                ),
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=["accounts"],
    summary="Request Password Reset",
    description="Send password reset code to user's email",
)
class PasswordResetRequestView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = PasswordResetRequestSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = serializer.save()
        return Response(result, status=status.HTTP_200_OK)


@extend_schema(
    tags=["accounts"],
    summary="Confirm Password Reset",
    description="Reset password using verification code",
)
class PasswordResetConfirmView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = PasswordResetConfirmSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"message": "Password has been reset successfully."},
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=["accounts"],
    summary="Logout User",
    description="Blacklist the refresh token to logout user",
)
class LogoutView(generics.GenericAPIView):
    permission_classes = [AllowAny]
    serializer_class = LogoutSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            RefreshToken(serializer.validated_data["refresh"]).blacklist()
            return Response(
                {"message": "Successfully logged out"}, status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {"error": f"Invalid or expired token: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
