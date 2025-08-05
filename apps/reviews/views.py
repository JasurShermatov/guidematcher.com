from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.db.models import Q
from .models import Review, ReviewHelpful, ReviewReport
from .serializers import (
    ReviewSerializer,
    ReviewCreateSerializer,
    ReviewResponseSerializer,
    ReviewHelpfulSerializer,
    ReviewReportSerializer,
    ReviewReportResolveSerializer,
)
from .permissions import (
    IsReviewOwnerOrStaff,
    IsReviewGuideOrStaff,
    CanReportReview,
    IsReportOwnerOrStaff,
)
from .filters import ReviewFilter
from apps.common.permissions import IsAuthenticated, IsStaff
from apps.common.pagination import StandardResultsSetPagination
from apps.notifications.services import NotificationService
from apps.chat.consumers import send_chat_notification
from asgiref.sync import async_to_sync
import logging

User = get_user_model()
logger = logging.getLogger(__name__)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def review_list_create(request):
    """
    List reviews or create a new review
    """
    if request.method == "GET":
        try:
            reviews = Review.objects.all()
            filterset = ReviewFilter(request.GET, queryset=reviews)
            if not filterset.is_valid():
                return Response(filterset.errors, status=status.HTTP_400_BAD_REQUEST)
            reviews = filterset.qs.select_related("reviewer", "guide", "booking")
            paginator = StandardResultsSetPagination()
            page = paginator.paginate_queryset(reviews, request)
            serializer = ReviewSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)
        except Exception as e:
            logger.error(f"Error listing reviews for {request.user.email}: {str(e)}")
            return Response(
                {"detail": "Sharhlarni ro'yxatini olishda xatolik yuz berdi."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    elif request.method == "POST":
        try:
            serializer = ReviewCreateSerializer(
                data=request.data, context={"request": request}
            )
            if serializer.is_valid():
                review = serializer.save()
                # Notify guide
                notification = NotificationService.create_notification(
                    user=review.guide,
                    notification_type="new_review",
                    title="Yangi sharh qoldirildi",
                    message=f"{review.reviewer.full_name} sizga {review.rating}★ sharh qoldirdi: {review.comment}",
                    priority="high",
                    action_url=f"/reviews/{review.id}/",
                    action_text="Sharhni ko'rish",
                )
                if notification:
                    if NotificationService.should_send_email(
                        review.guide, "new_review"
                    ):
                        from apps.notifications.tasks import send_email_notification

                        send_email_notification.delay(notification.id)
                    if NotificationService.should_send_push(review.guide, "new_review"):
                        async_to_sync(send_chat_notification)(
                            review.guide.id,
                            {
                                "type": "review_notification",
                                "review_id": str(review.id),
                                "message": f"Yangi sharh: {review.comment}",
                                "action_url": f"/reviews/{review.id}/",
                            },
                        )
                logger.info(f"Review {review.id} created by {request.user.email}")
                return Response(
                    ReviewSerializer(review).data, status=status.HTTP_201_CREATED
                )
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error creating review for {request.user.email}: {str(e)}")
            return Response(
                {"detail": "Sharh yaratishda xatolik yuz berdi."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated, IsReviewOwnerOrStaff])
def review_detail(request, review_id):
    """
    Retrieve or update a review
    """
    review = get_object_or_404(Review, id=review_id)

    if request.method == "GET":
        try:
            serializer = ReviewSerializer(review)
            return Response(serializer.data)
        except Exception as e:
            logger.error(
                f"Error retrieving review {review_id} for {request.user.email}: {str(e)}"
            )
            return Response(
                {"detail": "Sharhni olishda xatolik yuz berdi."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    elif request.method == "PUT":
        try:
            if review.is_verified:
                return Response(
                    {"detail": "Tasdiqlangan sharhni tahrirlash mumkin emas."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            serializer = ReviewSerializer(review, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                logger.info(f"Review {review_id} updated by {request.user.email}")
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(
                f"Error updating review {review_id} for {request.user.email}: {str(e)}"
            )
            return Response(
                {"detail": "Sharhni yangilashda xatolik yuz berdi."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsReviewGuideOrStaff])
def review_respond(request, review_id):
    """
    Add or update a guide's response to a review
    """
    review = get_object_or_404(Review, id=review_id)
    try:
        serializer = ReviewResponseSerializer(
            review, data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            review = serializer.save()
            # Notify reviewer
            notification = NotificationService.create_notification(
                user=review.reviewer,
                notification_type="review_response",
                title="Sharhga javob qoldirildi",
                message=f"{review.guide.full_name} sizning sharhingizga javob qoldirdi: {review.guide_response}",
                priority="medium",
                action_url=f"/reviews/{review.id}/",
                action_text="Sharhni ko'rish",
            )
            if notification:
                if NotificationService.should_send_email(
                    review.reviewer, "review_response"
                ):
                    from apps.notifications.tasks import send_email_notification

                    send_email_notification.delay(notification.id)
                if NotificationService.should_send_push(
                    review.reviewer, "review_response"
                ):
                    async_to_sync(send_chat_notification)(
                        review.reviewer.id,
                        {
                            "type": "review_notification",
                            "review_id": str(review.id),
                            "message": f"Sharhga javob: {review.guide_response}",
                            "action_url": f"/reviews/{review.id}/",
                        },
                    )
            logger.info(
                f"Guide response added to review {review_id} by {request.user.email}"
            )
            return Response(ReviewSerializer(review).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(
            f"Error adding response to review {review_id} for {request.user.email}: {str(e)}"
        )
        return Response(
            {"detail": "Sharhga javob qoldirishda xatolik yuz berdi."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated, CanReportReview])
def review_report(request, review_id):
    """
    Report a review
    """
    review = get_object_or_404(Review, id=review_id)
    try:
        serializer = ReviewReportSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            report = ReviewReport.objects.create(
                review=review, reporter=request.user, **serializer.validated_data
            )
            # Notify admins
            admins = User.objects.filter(is_staff=True)
            for admin in admins:
                notification = NotificationService.create_notification(
                    user=admin,
                    notification_type="review_report",
                    title="Yangi sharh shikoyati",
                    message=f"{request.user.full_name} sharh #{review.id} bo'yicha shikoyat qildi: {report.reason}",
                    priority="high",
                    action_url=f"/reviews/reports/{report.id}/",
                    action_text="Shikoyatni ko'rish",
                )
                if notification:
                    if NotificationService.should_send_email(admin, "review_report"):
                        from apps.notifications.tasks import send_email_notification

                        send_email_notification.delay(notification.id)
                    if NotificationService.should_send_push(admin, "review_report"):
                        async_to_sync(send_chat_notification)(
                            admin.id,
                            {
                                "type": "review_report_notification",
                                "report_id": str(report.id),
                                "message": f"Yangi shikoyat: {report.reason}",
                                "action_url": f"/reviews/reports/{report.id}/",
                            },
                        )
            logger.info(f"Review {review_id} reported by {request.user.email}")
            return Response(
                ReviewReportSerializer(report).data, status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(
            f"Error reporting review {review_id} for {request.user.email}: {str(e)}"
        )
        return Response(
            {"detail": "Sharh shikoyat qilishda xatolik yuz berdi."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsStaff])
def review_report_resolve(request, report_id):
    """
    Resolve a review report (admin only)
    """
    report = get_object_or_404(ReviewReport, id=report_id)
    try:
        serializer = ReviewReportResolveSerializer(
            report, data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            report = serializer.save()
            # Notify reporter and review owner
            for user in [report.reporter, report.review.reviewer]:
                notification = NotificationService.create_notification(
                    user=user,
                    notification_type="report_resolved",
                    title="Sharh shikoyati hal qilindi",
                    message=f"Sharh #{report.review.id} bo'yicha shikoyat hal qilindi: {report.details}",
                    priority="high",
                    action_url=f"/reviews/{report.review.id}/",
                    action_text="Sharhni ko'rish",
                )
                if notification:
                    if NotificationService.should_send_email(user, "report_resolved"):
                        from apps.notifications.tasks import send_email_notification

                        send_email_notification.delay(notification.id)
                    if NotificationService.should_send_push(user, "report_resolved"):
                        async_to_sync(send_chat_notification)(
                            user.id,
                            {
                                "type": "review_report_notification",
                                "report_id": str(report.id),
                                "message": f"Shikoyat hal qilindi: {report.details}",
                                "action_url": f"/reviews/{report.review.id}/",
                            },
                        )
            logger.info(f"Review report {report_id} resolved by {request.user.email}")
            return Response(ReviewReportSerializer(report).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(
            f"Error resolving review report {report_id} for {request.user.email}: {str(e)}"
        )
        return Response(
            {"detail": "Shikoyatni hal qilishda xatolik yuz berdi."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def review_helpful(request, review_id):
    """
    Mark a review as helpful or not helpful
    """
    review = get_object_or_404(Review, id=review_id)
    try:
        serializer = ReviewHelpfulSerializer(
            data=request.data, context={"request": request, "review": review}
        )
        if serializer.is_valid():
            helpful, created = ReviewHelpful.objects.update_or_create(
                review=review,
                user=request.user,
                defaults={"is_helpful": serializer.validated_data["is_helpful"]},
            )
            status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
            logger.info(
                f"Helpful vote for review {review_id} by {request.user.email}: {helpful.is_helpful}"
            )
            return Response(ReviewHelpfulSerializer(helpful).data, status=status_code)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(
            f"Error marking review {review_id} helpful for {request.user.email}: {str(e)}"
        )
        return Response(
            {"detail": "Sharhni foydali deb belgilashda xatolik yuz berdi."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
