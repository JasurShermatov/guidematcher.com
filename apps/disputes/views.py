from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.db.models import Q
from .models import Dispute
from .serializers import (
    DisputeSerializer,
    DisputeCreateSerializer,
    DisputeResolveSerializer,
)
from apps.common.permissions import IsAuthenticated, IsStaff
from apps.common.pagination import StandardResultsSetPagination
from apps.notifications.services import NotificationService
from apps.chat.consumers import send_chat_notification
from apps.profiles.models import GuideProfile
from asgiref.sync import async_to_sync
import logging

User = get_user_model()
logger = logging.getLogger(__name__)


class IsDisputeParticipantOrStaff(permissions.BasePermission):
    """
    Allows access to dispute participants or staff
    """

    def has_object_permission(self, request, view, obj):
        return request.user.is_authenticated and (
            request.user.is_staff
            or obj.client == request.user
            or obj.guide == request.user
        )


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def dispute_list_create(request):
    """
    List disputes for the authenticated user or create a new dispute
    """
    if request.method == "GET":
        try:
            if request.user.is_staff:
                disputes = Dispute.objects.all()
            else:
                disputes = Dispute.objects.filter(
                    Q(client=request.user) | Q(guide=request.user)
                )
            disputes = disputes.select_related(
                "booking", "client", "guide", "resolver", "chat_room"
            ).prefetch_related("booking__services")
            paginator = StandardResultsSetPagination()
            page = paginator.paginate_queryset(disputes, request)
            serializer = DisputeSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)
        except Exception as e:
            logger.error(f"Error listing disputes for {request.user.email}: {str(e)}")
            return Response(
                {"detail": "Nizolarni ro'yxatini olishda xatolik yuz berdi."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    elif request.method == "POST":
        try:
            serializer = DisputeCreateSerializer(
                data=request.data, context={"request": request}
            )
            if serializer.is_valid():
                booking = serializer.validated_data["booking"]
                # Check if guide is available
                try:
                    guide_profile = GuideProfile.objects.get(user=booking.guide)
                    if not guide_profile.is_available:
                        return Response(
                            {"detail": "Gid hozirda mavjud emas."},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                except GuideProfile.DoesNotExist:
                    logger.error(f"Guide profile not found for {booking.guide.email}")
                    return Response(
                        {"detail": "Gid profili topilmadi."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                dispute = serializer.save()
                # Send notification to the other participant
                recipient = (
                    dispute.guide if dispute.initiator == "client" else dispute.client
                )
                notification = NotificationService.create_notification(
                    user=recipient,
                    notification_type="dispute_created",
                    title="Yangi nizo ochildi",
                    message=f"{request.user.full_name} {dispute.booking.id} raqamli bronlash bo'yicha nizo ochdi: {dispute.reason}",
                    priority="high",
                    action_url=f"/disputes/{dispute.id}/",
                    action_text="Nizoni ko'rish",
                )
                if notification:
                    if NotificationService.should_send_email(
                        recipient, "dispute_created"
                    ):
                        from apps.notifications.tasks import send_email_notification

                        send_email_notification.delay(notification.id)
                    if NotificationService.should_send_push(
                        recipient, "dispute_created"
                    ):
                        async_to_sync(send_chat_notification)(
                            recipient.id,
                            {
                                "type": "dispute_notification",
                                "dispute_id": str(dispute.id),
                                "message": f"Yangi nizo ochildi: {dispute.reason}",
                                "action_url": f"/disputes/{dispute.id}/",
                            },
                        )
                logger.info(f"Dispute {dispute.id} created by {request.user.email}")
                return Response(
                    DisputeSerializer(dispute).data, status=status.HTTP_201_CREATED
                )
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error creating dispute for {request.user.email}: {str(e)}")
            return Response(
                {"detail": "Nizo yaratishda xatolik yuz berdi."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated, IsDisputeParticipantOrStaff])
def dispute_detail(request, dispute_id):
    """
    Retrieve or update dispute details
    """
    dispute = get_object_or_404(Dispute, id=dispute_id)

    if request.method == "GET":
        try:
            serializer = DisputeSerializer(dispute)
            return Response(serializer.data)
        except Exception as e:
            logger.error(
                f"Error retrieving dispute {dispute_id} for {request.user.email}: {str(e)}"
            )
            return Response(
                {"detail": "Nizoni olishda xatolik yuz berdi."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    elif request.method == "PUT":
        try:
            if not request.user.is_staff and dispute.status in ["resolved", "closed"]:
                return Response(
                    {
                        "detail": "Faqat administratorlar yopilgan nizoni yangilay oladi."
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )
            serializer = DisputeSerializer(dispute, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                logger.info(f"Dispute {dispute_id} updated by {request.user.email}")
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(
                f"Error updating dispute {dispute_id} for {request.user.email}: {str(e)}"
            )
            return Response(
                {"detail": "Nizoni yangilashda xatolik yuz berdi."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsStaff])
def dispute_resolve(request, dispute_id):
    """
    Resolve a dispute (admin only)
    """
    dispute = get_object_or_404(Dispute, id=dispute_id)
    try:
        if dispute.status in ["resolved", "closed"]:
            return Response(
                {"detail": "Nizo allaqachon hal qilingan yoki yopilgan."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = DisputeResolveSerializer(
            dispute, data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            dispute = serializer.save()
            # Notify both participants
            for user in [dispute.client, dispute.guide]:
                notification = NotificationService.create_notification(
                    user=user,
                    notification_type="dispute_resolved",
                    title="Nizo hal qilindi",
                    message=f"{dispute.id} raqamli nizo hal qilindi: {dispute.resolution_details}",
                    priority="high",
                    action_url=f"/disputes/{dispute.id}/",
                    action_text="Nizoni ko'rish",
                )
                if notification:
                    if NotificationService.should_send_email(user, "dispute_resolved"):
                        from apps.notifications.tasks import send_email_notification

                        send_email_notification.delay(notification.id)
                    if NotificationService.should_send_push(user, "dispute_resolved"):
                        async_to_sync(send_chat_notification)(
                            user.id,
                            {
                                "type": "dispute_notification",
                                "dispute_id": str(dispute.id),
                                "message": f"Nizo hal qilindi: {dispute.resolution_details}",
                                "action_url": f"/disputes/{dispute.id}/",
                            },
                        )
            logger.info(f"Dispute {dispute_id} resolved by {request.user.email}")
            return Response(DisputeSerializer(dispute).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(
            f"Error resolving dispute {dispute_id} for {request.user.email}: {str(e)}"
        )
        return Response(
            {"detail": "Nizoni hal qilishda xatolik yuz berdi."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
