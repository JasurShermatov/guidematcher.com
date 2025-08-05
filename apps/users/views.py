from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.shortcuts import get_object_or_404
from django.contrib.auth import authenticate
from .models import User, EmailVerification, LoginAttempt
from .serializers import (
    UserSerializer,
    UserRegistrationSerializer,
    UserLoginSerializer,
    EmailVerificationSerializer,
    LoginAttemptSerializer,
)
from apps.common.permissions import IsAuthenticated, IsStaff
import logging

logger = logging.getLogger(__name__)


@api_view(["POST"])
def register_user(request):
    """
    Register a new user
    """
    try:
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            logger.info(f"User registered: {user.email}")
            return Response(
                {
                    "refresh": str(refresh),
                    "access": str(refresh.access_token),
                    "user": UserSerializer(user).data,
                },
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"Error registering user: {str(e)}")
        return Response(
            {"detail": "Foydalanuvchi ro'yxatdan o'tkazishda xatolik yuz berdi"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
def login_user(request):
    """
    Authenticate and login a user
    """
    try:
        serializer = UserLoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data
            refresh = RefreshToken.for_user(user)
            LoginAttempt.objects.create(
                email=user.email,
                ip_address=request.META.get("REMOTE_ADDR"),
                success=True,
                user_agent=request.META.get("HTTP_USER_AGENT", ""),
            )
            logger.info(f"User logged in: {user.email}")
            return Response(
                {
                    "refresh": str(refresh),
                    "access": str(refresh.access_token),
                    "user": UserSerializer(user).data,
                },
                status=status.HTTP_200_OK,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"Error logging in user: {str(e)}")
        LoginAttempt.objects.create(
            email=request.data.get("email", ""),
            ip_address=request.META.get("REMOTE_ADDR"),
            success=False,
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
        )
        return Response(
            {"detail": "Kirishda xatolik yuz berdi"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated])
def user_profile(request):
    """
    Retrieve or update the authenticated user's profile
    """
    user = request.user
    try:
        if request.method == "GET":
            serializer = UserSerializer(user)
            return Response(serializer.data, status=status.HTTP_200_OK)

        elif request.method == "PUT":
            serializer = UserSerializer(user, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save(updated_by=user)
                logger.info(f"User profile updated: {user.email}")
                return Response(serializer.data, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"Error processing user profile for {user.email}: {str(e)}")
        return Response(
            {"detail": "Foydalanuvchi profilini qayta ishlashda xatolik yuz berdi"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def user_detail(request, user_id):
    """
    Retrieve details of a specific user (e.g., for guide profiles)
    """
    try:
        user = get_object_or_404(User, id=user_id, is_active=True)
        if not (request.user.is_staff or request.user == user or user.is_guide()):
            return Response(
                {"detail": "Bu foydalanuvchi ma'lumotlariga kirish huquqingiz yo'q"},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = UserSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Error retrieving user {user_id}: {str(e)}")
        return Response(
            {"detail": "Foydalanuvchi ma'lumotlarini olishda xatolik yuz berdi"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
def verify_email(request):
    """
    Verify a user's email with a token
    """
    try:
        serializer = EmailVerificationSerializer(data=request.data)
        if serializer.is_valid():
            verification = EmailVerification.objects.get(
                token=serializer.validated_data["token"], is_used=False
            )
            user = verification.user
            user.is_verified = True
            user.is_active = True
            user.save()
            verification.is_used = True
            verification.save()
            logger.info(f"Email verified for user: {user.email}")
            return Response(
                {"detail": "Email muvaffaqiyatli tasdiqlandi"},
                status=status.HTTP_200_OK,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except EmailVerification.DoesNotExist:
        logger.warning(
            f"Invalid or used email verification token: {request.data.get('token')}"
        )
        return Response(
            {"detail": "Noto'g'ri yoki ishlatilgan token"},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except Exception as e:
        logger.error(f"Error verifying email: {str(e)}")
        return Response(
            {"detail": "Email tasdiqlashda xatolik yuz berdi"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsStaff])
def login_attempts(request):
    """
    List login attempts (admin only)
    """
    try:
        queryset = LoginAttempt.objects.all().order_by("-created_at")
        email = request.query_params.get("email")
        if email:
            queryset = queryset.filter(email=email)

        from apps.common.pagination import StandardResultsSetPagination

        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(queryset, request)
        serializer = LoginAttemptSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)
    except Exception as e:
        logger.error(f"Error listing login attempts: {str(e)}")
        return Response(
            {"detail": "Kirish urinishlarini ro'yxatlashda xatolik yuz berdi"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
