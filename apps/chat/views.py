from django.core.cache import cache
from django.db import transaction
from django.db.models import Prefetch
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.bookings.models import Booking
from apps.users.models import User
from .models import Conversation, Message
from .serializers import (
    ConversationSerializer,
    MessageSerializer,
    MessageCreateSerializer,
    StartConversationSerializer,
    BookingAcceptSerializer,
    BookingUpdateSerializer,
    BookingCancelSerializer,
    BookingShortSerializer,
)


class ChatPagination(PageNumberPagination):
    """Custom pagination for chat"""

    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 100


@extend_schema(tags=["Chat"])
class ConversationListCreateView(generics.ListCreateAPIView):
    """List conversations or create new one"""

    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    pagination_class = ChatPagination

    def get_queryset(self):
        """Get user conversations with optimized queries"""
        return (
            Conversation.objects.get_user_conversations(self.request.user)
            .select_related("user1", "user2")
            .prefetch_related(
                Prefetch(
                    "messages", queryset=Message.objects.select_related("sender")[:1]
                )
            )
        )

    def get_serializer_class(self):
        if self.request.method == "POST":
            return StartConversationSerializer
        return ConversationSerializer

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """Create or get conversation and send initial message"""
        try:
            serializer = StartConversationSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            # Check if user exists and is active
            try:
                other_user = User.objects.get(
                    email=serializer.validated_data["user_email"], is_active=True
                )
            except User.DoesNotExist:
                return Response(
                    {"error": "User not found or inactive"},
                    status=status.HTTP_404_NOT_FOUND,
                )

            conversation, created = Conversation.objects.get_or_create_chat(
                request.user, other_user
            )

            # Send initial message if provided
            initial_message = serializer.validated_data.get("message")
            if initial_message:
                Message.objects.create(
                    conversation=conversation,
                    sender=request.user,
                    content=initial_message,
                    message_type="text",
                )

            conversation_serializer = ConversationSerializer(
                conversation, context={"request": request}
            )

            return Response(
                conversation_serializer.data,
                status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
            )

        except Exception as e:
            return Response(
                {"error": "Failed to create conversation", "detail": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


@extend_schema(tags=["Chat"])
class ConversationDetailView(generics.RetrieveAPIView):
    """Get single conversation details"""

    serializer_class = ConversationSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get_queryset(self):
        return Conversation.objects.get_user_conversations(self.request.user)


@extend_schema(tags=["Chat"])
class MessageListView(generics.ListAPIView):
    """List messages in conversation"""

    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    pagination_class = ChatPagination

    def get_queryset(self):
        conversation_id = self.kwargs["conversation_id"]
        conversation = get_object_or_404(
            Conversation.objects.get_user_conversations(self.request.user),
            id=conversation_id,
        )

        # Mark messages as read
        Message.objects.filter(conversation=conversation, is_read=False).exclude(
            sender=self.request.user
        ).update(is_read=True, read_at=timezone.now())

        return (
            Message.objects.visible_for_user(self.request.user)
            .filter(conversation=conversation)
            .select_related("sender")
            .order_by("-created_at")
        )


@extend_schema(tags=["Chat"])
class MessageCreateView(generics.CreateAPIView):
    """Send new message"""

    serializer_class = MessageCreateSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def perform_create(self, serializer):
        message = serializer.save(sender=self.request.user)

        # Update conversation timestamp
        message.conversation.updated_at = timezone.now()
        message.conversation.save(update_fields=["updated_at"])

        # Clear cache
        cache_key = f"conv_unread_{message.conversation.id}"
        cache.delete(cache_key)

        # Return message object, don't wrap in Response
        return message


# ========== BOOKING INTEGRATION ENDPOINTS ==========
@extend_schema(
    tags=["Chat", "Booking"],
    request=BookingAcceptSerializer,
    responses={200: BookingShortSerializer},
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
@transaction.atomic
def accept_booking_in_chat(request, conversation_id: int, booking_id: int):
    """Customer accepts booking and sets dates"""
    try:
        # Get booking with lock to prevent race conditions
        booking = get_object_or_404(
            Booking.objects.select_for_update().filter(
                conversation_id=conversation_id, id=booking_id
            )
        )

        # Security checks
        if not hasattr(request.user, "customerprofile"):
            return Response(
                {"error": "Only customers can accept bookings"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if booking.customer_profile.user_id != request.user.id:
            return Response(
                {"error": "You are not authorized for this booking"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if booking.status != Booking.BookingStatus.PENDING:
            return Response(
                {
                    "error": f"Cannot accept booking with status: {booking.get_status_display()}"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate dates
        serializer = BookingAcceptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        start_date = serializer.validated_data["start_date"]
        end_date = serializer.validated_data["end_date"]

        # Check for conflicts
        conflicts = Booking.objects.filter(
            customer_profile=booking.customer_profile,
            status__in=[Booking.BookingStatus.ACCEPTED, Booking.BookingStatus.UPDATED],
            start_date__lte=end_date,
            end_date__gte=start_date,
        ).exclude(id=booking.id)

        if conflicts.exists():
            conflicting_dates = []
            for conf in conflicts[:3]:  # Show max 3 conflicts
                conflicting_dates.append(f"{conf.start_date} - {conf.end_date}")

            return Response(
                {
                    "error": "You have conflicting bookings",
                    "conflicts": conflicting_dates,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Update booking
        booking.start_date = start_date
        booking.end_date = end_date
        booking.status = Booking.BookingStatus.ACCEPTED
        booking.accepted_at = timezone.now()
        booking.save(
            update_fields=[
                "start_date",
                "end_date",
                "status",
                "accepted_at",
                "updated_at",
            ]
        )

        # Create system message
        Message.objects.create(
            conversation_id=conversation_id,
            sender=request.user,
            content=f"✅ Booking accepted!\n📅 Dates: {start_date.strftime('%b %d')} to {end_date.strftime('%b %d, %Y')}",
            message_type="booking",
            metadata={
                "booking_id": booking.id,
                "action": "accepted",
                "dates": {"start": str(start_date), "end": str(end_date)},
            },
        )

        # Ensure serializer context is properly set
        booking_data = BookingShortSerializer(
            booking, context={"request": request}
        ).data

        return Response(
            {
                "status": "success",
                "message": "Booking accepted successfully",
                "booking": booking_data,
            }
        )

    except Exception as e:
        return Response(
            {"error": "Failed to accept booking", "detail": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@extend_schema(
    tags=["Chat", "Booking"],
    request=BookingUpdateSerializer,
    responses={200: BookingShortSerializer},
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
@transaction.atomic
def update_booking_dates(request, conversation_id: int, booking_id: int):
    """Update accepted booking dates - only customer can update"""
    try:
        # Get booking with lock
        booking = get_object_or_404(
            Booking.objects.select_for_update().filter(
                conversation_id=conversation_id, id=booking_id
            )
        )

        # Security checks
        if not hasattr(request.user, "customerprofile"):
            return Response(
                {"error": "Only customers can update bookings"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if booking.customer_profile.user_id != request.user.id:
            return Response(
                {"error": "You are not authorized to update this booking"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if booking.status not in [
            Booking.BookingStatus.ACCEPTED,
            Booking.BookingStatus.UPDATED,
        ]:
            return Response(
                {
                    "error": f"Cannot update booking with status: {booking.get_status_display()}"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate new dates
        serializer = BookingUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_start = serializer.validated_data["start_date"]
        new_end = serializer.validated_data["end_date"]

        # Check if dates actually changed
        if new_start == booking.start_date and new_end == booking.end_date:
            return Response(
                {"error": "No changes detected in dates"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check for conflicts with other bookings
        conflicts = Booking.objects.filter(
            customer_profile=booking.customer_profile,
            status__in=[Booking.BookingStatus.ACCEPTED, Booking.BookingStatus.UPDATED],
            start_date__lte=new_end,
            end_date__gte=new_start,
        ).exclude(id=booking.id)

        if conflicts.exists():
            return Response(
                {"error": "New dates conflict with existing bookings"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Store old dates and update
        old_start = booking.start_date
        old_end = booking.end_date

        booking.update_dates(new_start, new_end)

        # Create system message
        Message.objects.create(
            conversation_id=conversation_id,
            sender=request.user,
            content=(
                f"📝 Booking dates updated!\n"
                f"Old: {old_start.strftime('%b %d')} - {old_end.strftime('%b %d')}\n"
                f"New: {new_start.strftime('%b %d')} - {new_end.strftime('%b %d, %Y')}"
            ),
            message_type="booking",
            metadata={
                "booking_id": booking.id,
                "action": "updated",
                "old_dates": {"start": str(old_start), "end": str(old_end)},
                "new_dates": {"start": str(new_start), "end": str(new_end)},
                "update_count": booking.updated_count,
            },
        )

        # Ensure serializer context is properly set
        booking_data = BookingShortSerializer(
            booking, context={"request": request}
        ).data

        return Response(
            {
                "status": "success",
                "message": "Booking dates updated successfully",
                "booking": booking_data,
            }
        )

    except Exception as e:
        return Response(
            {"error": "Failed to update booking dates", "detail": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@extend_schema(
    tags=["Chat", "Booking"],
    request=BookingCancelSerializer,
    responses={200: OpenApiResponse(description="Booking cancelled")},
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
@transaction.atomic
def cancel_booking_in_chat(request, conversation_id: int, booking_id: int):
    """Cancel booking - both customer and client can cancel"""
    try:
        # Get booking with lock
        booking = get_object_or_404(
            Booking.objects.select_for_update().filter(
                conversation_id=conversation_id, id=booking_id
            )
        )

        # Check permissions
        user = request.user
        can_cancel = False
        canceller_type = None

        if (
            hasattr(user, "customerprofile")
            and booking.customer_profile.user_id == user.id
        ):
            can_cancel = True
            canceller_type = "customer"
        elif (
            hasattr(user, "clientprofile")
            and booking.client_profile
            and booking.client_profile.user_id == user.id
        ):
            can_cancel = True
            canceller_type = "client"

        if not can_cancel:
            return Response(
                {"error": "You are not authorized to cancel this booking"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not booking.can_cancel:
            return Response(
                {
                    "error": f"Cannot cancel booking with status: {booking.get_status_display()}"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate cancellation
        serializer = BookingCancelSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if not serializer.validated_data.get("confirm"):
            return Response(
                {"error": "Cancellation must be confirmed"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Cancel booking
        booking.status = Booking.BookingStatus.CANCELLED
        booking.cancelled_at = timezone.now()
        booking.save(update_fields=["status", "cancelled_at", "updated_at"])

        # Create cancellation message
        reason = serializer.validated_data.get("reason", "")
        reason_text = f"\nReason: {reason}" if reason else ""

        Message.objects.create(
            conversation_id=conversation_id,
            sender=user,
            content=(
                f"❌ Booking cancelled by {canceller_type}\n"
                f"Dates: {booking.start_date} - {booking.end_date}"
                f"{reason_text}"
            ),
            message_type="booking",
            metadata={
                "booking_id": booking.id,
                "action": "cancelled",
                "cancelled_by": canceller_type,
                "reason": reason,
            },
        )

        # Clear customer's busy dates cache
        cache_key = f"customer_busy_{booking.customer_profile_id}"
        cache.delete(cache_key)

        return Response(
            {
                "status": "success",
                "message": "Booking cancelled successfully",
                "booking_id": booking.id,
            }
        )

    except Exception as e:
        return Response(
            {"error": "Failed to cancel booking", "detail": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def unblock_user_view(request, blocked_user_id: int):
    """Unblock a user"""
    try:
        # Add actual unblock logic here
        return Response(
            {"status": "success", "message": f"User {blocked_user_id} unblocked"}
        )
    except Exception as e:
        return Response(
            {"error": "Failed to unblock user", "detail": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def block_user_view(request, user_id: int):
    """Block a user"""
    try:
        # Add actual block logic here
        return Response({"status": "success", "message": f"User {user_id} blocked"})
    except Exception as e:
        return Response(
            {"error": "Failed to block user", "detail": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
