# apps/bookings/views.py
from drf_spectacular.utils import extend_schema
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.bookings.models import Booking
from apps.bookings.permissions import IsAuthenticatedAndOwnerOrReadOnly
from apps.bookings.serializers import BookingSerializer
from apps.chat.models import Conversation


@extend_schema(tags=["Bookings"])
class BookingViewSet(viewsets.ModelViewSet):
    """
    Booking API:
    - list: login qilgan user uchun barcha bookinglarni ko'rsatadi
    - create: client offer qildi / self-booking
    - retrieve: bitta bookingni ko'rsatadi
    - update: status update, cancel, accepted
    - chat: front-end chat icon bosilganda conversation id olish
    """

    serializer_class = BookingSerializer
    permission_classes = [IsAuthenticatedAndOwnerOrReadOnly]

    def get_queryset(self):
        """
        Client va Customer bookinglarini filterlash:
        - Customer band kunlari booked filter orqali chiqariladi
        - Front-endga mos formatda
        """
        user = self.request.user
        # client profile bor bo'lsa client bookinglarini
        if hasattr(user, "clientprofile"):
            return Booking.objects.filter(client_profile=user.clientprofile)
        # customer profile bor bo'lsa customer bookinglarini
        if hasattr(user, "customerprofile"):
            return Booking.objects.filter(customer_profile=user.customerprofile)
        return Booking.objects.none()

    def perform_create(self, serializer):
        """
        Booking yaratish:
        - client bo'lsa client_profile bilan bog'lash
        - conversation yaratish (agar mavjud bo'lmasa)
        """
        user = self.request.user
        client_profile = getattr(user, "clientprofile", None)
        instance = serializer.save(client_profile=client_profile)

        # conversation yaratish client <-> customer
        if instance.client_profile:
            conversation, created = Conversation.objects.get_or_create_chat(
                user1=instance.client_profile.user, user2=instance.customer_profile.user
            )
            instance.conversation = conversation
            instance.save(update_fields=["conversation"])

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def accept(self, request, pk=None):
        """
        Client va Customer kelishuvini tasdiqlash
        POST request orqali status ACCEPTED qilinadi
        """
        booking = self.get_object()
        booking.status = Booking.BookingStatus.ACCEPTED
        booking.save(update_fields=["status"])
        return Response({"status": "accepted"}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def cancel(self, request, pk=None):
        """
        Bookingni bekor qilish
        POST request orqali status CANCELLED qilinadi
        """
        booking = self.get_object()
        if booking.can_cancel:
            booking.status = Booking.BookingStatus.CANCELLED
            booking.save(update_fields=["status"])
            return Response({"status": "cancelled"}, status=status.HTTP_200_OK)
        return Response(
            {"error": "Cannot cancel this booking"}, status=status.HTTP_400_BAD_REQUEST
        )
