from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Notification, NotificationPreference, EmailLog
from .serializers import (
    NotificationSerializer,
    NotificationPreferenceSerializer,
    EmailLogSerializer,
)
from apps.common.permissions import IsAuthenticated, IsStaff
from apps.common.pagination import StandardResultsSetPagination
import logging

logger = logging.getLogger(__name__)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def notification_list(request):
    """
    List notifications for the authenticated user
    """
    try:
        queryset = Notification.objects.filter(user=request.user).order_by(
            "-created_at"
        )
        is_read = request.query_params.get("is_read")
        notification_type = request.query_params.get("type")

        if is_read is not None:
            queryset = queryset.filter(is_read=is_read.lower() == "true")
        if notification_type:
            queryset = queryset.filter(type=notification_type)

        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(queryset, request)
        serializer = NotificationSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)
    except Exception as e:
        logger.error(
            f"Error listing notifications for user {request.user.email}: {str(e)}"
        )
        return Response(
            {"detail": "Xabarnomalarni ro'yxatlashda xatolik yuz berdi"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def notification_detail(request, notification_id):
    """
    Retrieve details of a specific notification
    """
    try:
        notification = get_object_or_404(
            Notification, id=notification_id, user=request.user
        )
        serializer = NotificationSerializer(notification)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Error retrieving notification {notification_id}: {str(e)}")
        return Response(
            {"detail": "Xabarnoma ma'lumotlarini olishda xatolik yuz berdi"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, notification_id):
    """
    Mark a notification as read
    """
    try:
        notification = get_object_or_404(
            Notification, id=notification_id, user=request.user
        )
        notification.mark_as_read()
        logger.info(
            f"Notification {notification_id} marked as read for user {request.user.email}"
        )
        return Response(
            {"detail": "Xabarnoma o'qilgan deb belgilandi"}, status=status.HTTP_200_OK
        )
    except Exception as e:
        logger.error(f"Error marking notification {notification_id} as read: {str(e)}")
        return Response(
            {"detail": "Xabarnomani o'qilgan deb belgilashda xatolik yuz berdi"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated])
def notification_preferences(request):
    """
    Retrieve or update notification preferences for the authenticated user
    """
    try:
        preferences, created = NotificationPreference.objects.get_or_create(
            user=request.user
        )

        if request.method == "GET":
            serializer = NotificationPreferenceSerializer(preferences)
            return Response(serializer.data, status=status.HTTP_200_OK)

        elif request.method == "PUT":
            serializer = NotificationPreferenceSerializer(
                preferences, data=request.data, partial=True
            )
            if serializer.is_valid():
                serializer.save()
                logger.info(
                    f"Notification preferences updated for user {request.user.email}"
                )
                return Response(serializer.data, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(
            f"Error processing notification preferences for user {request.user.email}: {str(e)}"
        )
        return Response(
            {"detail": "Xabarnoma sozlamalarini qayta ishlashda xatolik yuz berdi"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsStaff])
def email_log_list(request):
    """
    List email logs (admin only)
    """
    try:
        queryset = EmailLog.objects.all().order_by("-created_at")
        email = request.query_params.get("recipient_email")
        status = request.query_params.get("status")

        if email:
            queryset = queryset.filter(recipient_email=email)
        if status:
            queryset = queryset.filter(status=status)

        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(queryset, request)
        serializer = EmailLogSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)
    except Exception as e:
        logger.error(f"Error listing email logs: {str(e)}")
        return Response(
            {"detail": "Email jurnallarini ro'yxatlashda xatolik yuz berdi"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
