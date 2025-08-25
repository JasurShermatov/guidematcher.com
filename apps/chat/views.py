# ============================================
# 3. apps/chat/views.py - PROFESSIONAL VERSION
# ============================================

from django.db import transaction
from django.db.models import Prefetch
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import extend_schema
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
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        other_user = User.objects.get(
            email=serializer.validated_data["user_email"], is_active=True
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

        # Mark conversation as updated
        message.conversation.updated_at = timezone.now()
        message.conversation.save(update_fields=["updated_at"])

        return message


# Booking integration endpoints
@extend_schema(tags=["Chat", "Booking"])
@api_view(["POST"])
@permission_classes([IsAuthenticated])
@transaction.atomic
def accept_booking_in_chat(request, conversation_id: int, booking_id: int):
    """Customer accepts booking and sets dates"""
    conversation = get_object_or_404(
        Conversation.objects.get_user_conversations(request.user), id=conversation_id
    )

    booking = get_object_or_404(
        Booking.objects.filter(conversation=conversation), id=booking_id
    )

    # Validate customer
    if not hasattr(request.user, "customerprofile"):
        return Response(
            {"error": "Only customers can accept bookings"},
            status=status.HTTP_403_FORBIDDEN,
        )

    if booking.customer_profile != request.user.customerprofile:
        return Response(
            {"error": "You cannot accept this booking"},
            status=status.HTTP_403_FORBIDDEN,
        )

    if booking.status != "pending":
        return Response(
            {"error": "Booking is not pending"}, status=status.HTTP_400_BAD_REQUEST
        )

    # Validate dates
    serializer = BookingAcceptSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    # Check availability
    from apps.bookings.models import Booking as BookingModel

    if not BookingModel.objects.is_customer_available(
        booking.customer_profile,
        serializer.validated_data["start_date"],
        serializer.validated_data["end_date"],
    ):
        return Response(
            {"error": "You are not available for these dates"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Update booking
    booking.start_date = serializer.validated_data["start_date"]
    booking.end_date = serializer.validated_data["end_date"]
    booking.status = "accepted"
    booking.accepted_at = timezone.now()
    booking.save()

    # Send system message
    Message.objects.create(
        conversation=conversation,
        sender=request.user,
        content=f"✅ Booking accepted!\nDates: {booking.start_date} to {booking.end_date}",
        message_type="booking",
    )

    return Response(
        {
            "status": "success",
            "booking": BookingShortSerializer(
                booking, context={"request": request}
            ).data,
        }
    )


@extend_schema(tags=["Chat", "Booking"])
@api_view(["POST"])
@permission_classes([IsAuthenticated])
@transaction.atomic
def update_booking_dates(request, conversation_id: int, booking_id: int):
    """Update booking dates"""
    conversation = get_object_or_404(
        Conversation.objects.get_user_conversations(request.user), id=conversation_id
    )

    booking = get_object_or_404(
        Booking.objects.filter(conversation=conversation), id=booking_id
    )
