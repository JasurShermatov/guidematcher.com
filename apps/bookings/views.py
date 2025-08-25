# apps/bookings/views.py - YANGILANGAN

from django.db.models import Q
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.bookings.models import Booking
from apps.bookings.permissions import IsAuthenticatedAndOwnerOrReadOnly
from apps.bookings.serializers import (
    BookingSerializer,
    BookingChatCreateSerializer,
    BookingUpdateDatesSerializer,
    CustomerSearchSerializer,
    CustomerProfileSerializer,
)
from apps.chat.models import Conversation, Message
from apps.profiles.models import CustomerProfile


@extend_schema(tags=["Bookings"])
class BookingViewSet(viewsets.ModelViewSet):
    """
    Booking API - To'liq funksional
    """

    serializer_class = BookingSerializer
    permission_classes = [IsAuthenticatedAndOwnerOrReadOnly]

    def get_queryset(self):
        """User bookinglarini filterlash"""
        user = self.request.user

        # Query params
        status_filter = self.request.query_params.get("status")
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")

        queryset = Booking.objects.none()

        # Client bookings
        if hasattr(user, "clientprofile"):
            queryset = Booking.objects.filter(client_profile=user.clientprofile)
        # Customer bookings
        elif hasattr(user, "customerprofile"):
            queryset = Booking.objects.filter(customer_profile=user.customerprofile)

        # Filters
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if date_from:
            queryset = queryset.filter(start_date__gte=date_from)
        if date_to:
            queryset = queryset.filter(end_date__lte=date_to)

        return queryset.select_related(
            "client_profile__user", "customer_profile__user", "conversation"
        )

    def perform_create(self, serializer):
        """Booking yaratish va chat yaratish"""
        user = self.request.user
        client_profile = getattr(user, "clientprofile", None)
        instance = serializer.save(client_profile=client_profile)

        # Conversation yaratish
        if instance.client_profile:
            conversation, created = Conversation.objects.get_or_create_chat(
                user1=instance.client_profile.user, user2=instance.customer_profile.user
            )
            instance.conversation = conversation
            instance.save(update_fields=["conversation"])

            # Initial message
            Message.objects.create(
                conversation=conversation,
                sender=instance.client_profile.user,
                content=f"New booking request: {instance.title or 'Travel booking'} from {instance.start_date} to {instance.end_date}",
            )

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def accept(self, request, pk=None):
        """
        Customer booking ni qabul qiladi va vaqtni belgilaydi
        """
        booking = self.get_object()

        # Faqat customer qabul qila oladi
        if booking.customer_profile.user != request.user:
            return Response(
                {"error": "Only customer can accept booking"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Vaqtlarni tekshirish
        serializer = BookingUpdateDatesSerializer(
            data=request.data, context={"booking": booking}
        )
        serializer.is_valid(raise_exception=True)

        # Booking ni yangilash
        booking.status = Booking.BookingStatus.ACCEPTED
        booking.start_date = serializer.validated_data["start_date"]
        booking.end_date = serializer.validated_data["end_date"]
        booking.accepted_at = timezone.now()
        booking.save()

        # Chat ga xabar
        if booking.conversation:
            Message.objects.create(
                conversation=booking.conversation,
                sender=request.user,
                content=f"✅ Booking accepted! Dates confirmed: {booking.start_date} to {booking.end_date}",
            )

        return Response(
            BookingSerializer(booking, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def update_dates(self, request, pk=None):
        """
        Booking vaqtini o'zgartirish
        """
        booking = self.get_object()

        if not booking.can_update:
            return Response(
                {"error": "Cannot update this booking"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = BookingUpdateDatesSerializer(
            data=request.data, context={"booking": booking}
        )
        serializer.is_valid(raise_exception=True)

        # Vaqtlarni yangilash
        booking.update_dates(
            serializer.validated_data["start_date"],
            serializer.validated_data["end_date"],
        )

        # Chat ga xabar
        if booking.conversation:
            Message.objects.create(
                conversation=booking.conversation,
                sender=request.user,
                content=f"📅 Booking dates updated: {booking.start_date} to {booking.end_date} (Previous: {booking.previous_start_date} to {booking.previous_end_date})",
            )

        return Response(
            BookingSerializer(booking, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def cancel(self, request, pk=None):
        """
        Bookingni bekor qilish - tasdiqlash bilan
        """
        booking = self.get_object()

        if not booking.can_cancel:
            return Response(
                {"error": "Cannot cancel this booking"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Tasdiqlash so'rash
        confirm = request.data.get("confirm", False)
        if not confirm:
            return Response(
                {"message": "Please confirm cancellation", "require_confirm": True},
                status=status.HTTP_200_OK,
            )

        # Bekor qilish
        booking.status = Booking.BookingStatus.CANCELLED
        booking.cancelled_at = timezone.now()
        booking.save()

        # Chat ga xabar
        if booking.conversation:
            Message.objects.create(
                conversation=booking.conversation,
                sender=request.user,
                content=f"❌ Booking cancelled by {request.user.full_name}",
            )

        return Response(
            {"status": "cancelled", "message": "Booking has been cancelled"},
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated])
    def create_from_chat(self, request):
        """
        Chat orqali booking yaratish
        """
        serializer = BookingChatCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Booking yaratish
        booking = Booking.objects.create(
            client_profile=request.user.client_profile,
            customer_profile=serializer.validated_data["customer_profile"],
            start_date=serializer.validated_data["start_date"],
            end_date=serializer.validated_data["end_date"],
            country=serializer.validated_data["country"],
            city=serializer.validated_data.get("city", ""),
            title=serializer.validated_data.get("title", ""),
            description=serializer.validated_data.get("description", ""),
            location=serializer.validated_data.get("location", ""),
            proposed_rate=serializer.validated_data.get("proposed_rate"),
            created_via_chat=True,
            status=Booking.BookingStatus.PENDING,
        )

        # Conversation bog'lash
        conversation, _ = Conversation.objects.get_or_create_chat(
            user1=request.user, user2=booking.customer_profile.user
        )
        booking.conversation = conversation
        booking.save()

        # Chat xabar
        Message.objects.create(
            conversation=conversation,
            sender=request.user,
            content=f"📋 New booking request created: {booking.title or 'Travel'} ({booking.start_date} to {booking.end_date})",
        )

        return Response(
            BookingSerializer(booking, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["get"])
    def search_customers(self, request):
        """
        Customer qidirish - 2 xil usul:
        1. Faqat country bo'yicha (boshqalari optional)
        2. To'liq filter (vaqt, shahar, service)
        """
        serializer = CustomerSearchSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        queryset = CustomerProfile.objects.filter(
            is_available=True, user__is_active=True
        )

        # Majburiy: Country filter
        queryset = queryset.filter(country__icontains=data["country"])

        # Optional: City filter
        if data.get("city"):
            queryset = queryset.filter(city__icontains=data["city"])

        # Optional: Service type
        if data.get("service_type"):
            queryset = queryset.filter(service_areas__icontains=data["service_type"])

        # Optional: Rating filter
        if data.get("min_rating"):
            queryset = queryset.filter(average_rating__gte=data["min_rating"])

        # Optional: Vaqt bo'yicha filter (bo'sh customerlar)
        if data.get("start_date") and data.get("end_date"):
            # Band bo'lgan customerlarni chiqarib tashlash
            busy_customers = []
            for customer in queryset:
                if not Booking.objects.is_customer_available(
                    customer, data["start_date"], data["end_date"]
                ):
                    busy_customers.append(customer.id)

            queryset = queryset.exclude(id__in=busy_customers)

        # Pagination
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = CustomerProfileSerializer(
                page, many=True, context={"request": request}
            )
            return self.get_paginated_response(serializer.data)

        serializer = CustomerProfileSerializer(
            queryset, many=True, context={"request": request}
        )
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def my_schedule(self, request):
        """
        Customer uchun: o'zining band kunlari kalendari
        """
        if not hasattr(request.user, "customerprofile"):
            return Response(
                {"error": "Only customers can view schedule"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Query params
        month = request.query_params.get("month")  # YYYY-MM format
        year = request.query_params.get("year")

        bookings = Booking.objects.filter(
            customer_profile=request.user.customerprofile,
            status__in=[Booking.BookingStatus.ACCEPTED, Booking.BookingStatus.PENDING],
        )

        if month:
            bookings = bookings.filter(
                start_date__month=month.split("-")[1],
                start_date__year=month.split("-")[0],
            )
        elif year:
            bookings = bookings.filter(start_date__year=year)

        # Band kunlar
        busy_dates = Booking.objects.get_customer_busy_dates(
            request.user.customerprofile
        )

        return Response(
            {
                "bookings": BookingSerializer(
                    bookings, many=True, context={"request": request}
                ).data,
                "busy_dates": busy_dates,
                "total_bookings": bookings.count(),
            }
        )
