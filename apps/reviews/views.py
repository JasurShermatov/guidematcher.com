#  apps/reviews/views.py

from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema, OpenApiParameter
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from apps.bookings.models import Booking
from apps.profiles.models import CustomerProfile
from .models import Review
from .permissions import IsReviewOwner
from .serializers import (
    ReviewListSerializer,
    ReviewDetailSerializer,
    ReviewCreateUpdateSerializer,
    MyReviewSerializer,
)


@extend_schema(tags=["Reviews"])
class ReviewViewSet(viewsets.ModelViewSet):

    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["customer", "rating", "is_published"]
    ordering_fields = ["created_at", "rating"]
    ordering = ["-created_at"]

    def get_queryset(self):
        base_qs = Review.objects.select_related("client", "customer__user", "booking")

        if self.action == "list" and not self.request.user.is_authenticated:
            return base_qs.filter(is_published=True)

        customer_id = self.request.query_params.get("customer")
        if customer_id and self.action == "list":
            return base_qs.filter(customer_id=customer_id, is_published=True)

        return base_qs

    def get_serializer_class(self):
        if self.action == "list":
            return ReviewListSerializer
        elif self.action == "retrieve":
            return ReviewDetailSerializer
        elif self.action in ["create", "update", "partial_update"]:
            return ReviewCreateUpdateSerializer
        return ReviewListSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [AllowAny()]
        elif self.action == "create":
            return [IsAuthenticated()]
        else:
            return [IsAuthenticated(), IsReviewOwner()]

    @extend_schema(
        summary="Create review for completed booking",
        description="Client creates review after booking is completed. Rating and comment are both optional but at least one required.",
        parameters=[
            OpenApiParameter(
                "booking_id",
                int,
                OpenApiParameter.QUERY,
                required=True,
                description="ID of completed booking",
            )
        ],
    )
    @transaction.atomic
    def create(self, request, *args, **kwargs):

        booking_id = request.query_params.get("booking_id")
        if not booking_id:
            return Response(
                {"error": "booking_id is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        booking = get_object_or_404(
            Booking.objects.select_related("customer_profile__user"), id=booking_id
        )

        if booking.client_profile.user != request.user:
            return Response(
                {"error": "You can only review your own bookings"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if booking.status != Booking.BookingStatus.COMPLETED:
            return Response(
                {"error": "Can only review completed bookings"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if hasattr(booking, "review"):
            return Response(
                {"error": "This booking already has a review"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(
            data=request.data, context={"request": request, "booking": booking}
        )
        serializer.is_valid(raise_exception=True)
        review = serializer.save()

        return Response(
            ReviewDetailSerializer(review).data, status=status.HTTP_201_CREATED
        )

    @extend_schema(
        summary="Update review",
        description="Client can edit their review within 7 days of creation",
    )
    def update(self, request, *args, **kwargs):

        review = self.get_object()

        days_passed = (timezone.now() - review.created_at).days
        if days_passed > 7:
            return Response(
                {"error": "Reviews can only be edited within 7 days"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return super().update(request, *args, **kwargs)

    @extend_schema(
        summary="Get customer reviews",
        description="Get all reviews for specific customer (for portfolio)",
        parameters=[
            OpenApiParameter(
                "customer",
                int,
                OpenApiParameter.QUERY,
                description="Customer profile ID",
            )
        ],
    )
    @action(detail=False, methods=["get"], url_path="customer/(?P<customer_id>[^/.]+)")
    def customer_reviews(self, request, customer_id=None):

        customer = get_object_or_404(CustomerProfile, id=customer_id)

        reviews = Review.objects.for_customer(customer)

        stats = reviews.aggregate(
            total=models.Count("id"),
            avg_rating=models.Avg("rating"),
            five_stars=models.Count("id", filter=models.Q(rating=5)),
            four_stars=models.Count("id", filter=models.Q(rating=4)),
            three_stars=models.Count("id", filter=models.Q(rating=3)),
            two_stars=models.Count("id", filter=models.Q(rating=2)),
            one_star=models.Count("id", filter=models.Q(rating=1)),
        )

        page = self.paginate_queryset(reviews)
        serializer = ReviewListSerializer(page, many=True)

        response = self.get_paginated_response(serializer.data)
        response.data["statistics"] = {
            "total_reviews": stats["total"],
            "average_rating": round(stats["avg_rating"] or 0, 1),
            "rating_distribution": {
                5: stats["five_stars"],
                4: stats["four_stars"],
                3: stats["three_stars"],
                2: stats["two_stars"],
                1: stats["one_star"],
            },
        }

        return response

    @extend_schema(
        summary="My reviews", description="Get all reviews written by current user"
    )
    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def my_reviews(self, request):

        reviews = Review.objects.by_client(request.user)

        page = self.paginate_queryset(reviews)
        serializer = MyReviewSerializer(page, many=True)

        return self.get_paginated_response(serializer.data)

    @extend_schema(
        summary="Check if booking can be reviewed",
        description="Check if specific booking is eligible for review",
    )
    @action(
        detail=False,
        methods=["get"],
        url_path="can-review/(?P<booking_id>[^/.]+)",
        permission_classes=[IsAuthenticated],
    )
    def can_review(self, request, booking_id=None):

        try:
            booking = Booking.objects.get(id=booking_id)
        except Booking.DoesNotExist:
            return Response({"can_review": False, "reason": "Booking not found"})

        if booking.client_profile.user != request.user:
            return Response({"can_review": False, "reason": "Not your booking"})

        if booking.status != Booking.BookingStatus.COMPLETED:
            return Response({"can_review": False, "reason": "Booking not completed"})

        if hasattr(booking, "review"):
            return Response(
                {
                    "can_review": False,
                    "reason": "Already reviewed",
                    "review_id": booking.review.id,
                }
            )

        return Response(
            {
                "can_review": True,
                "booking": {
                    "id": booking.id,
                    "title": booking.title,
                    "customer": booking.customer_profile.user.full_name,
                },
            }
        )
