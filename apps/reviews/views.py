# apps/reviews/views.py
from typing import Optional

from django.db import transaction
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import (
    extend_schema,
    extend_schema_view,
    OpenApiParameter,
    OpenApiExample,
    OpenApiResponse,
)
from rest_framework import viewsets, mixins, status, serializers
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.common.permissions import IsVerifiedUser
from apps.reviews.models import Review, ReviewResponse, ReviewReaction

from apps.reviews.permissions import IsClientOwner, IsProviderOwner
from apps.reviews.serializers import (
    ReviewSerializer,
    ReviewCreateSerializer,
    ReviewResponseSerializer,
    ReviewReactionSerializer,
)


def _get_booking_from_request(request) -> Optional[int]:

    bid = request.query_params.get("booking_id") or request.data.get("booking_id")
    try:
        return int(bid) if bid is not None else None
    except (TypeError, ValueError):
        return None


@extend_schema_view(
    list=extend_schema(
        tags=["reviews"],
        summary="Public reviews list",
        description=(
            "Publik ko‘rinadigan review’lar ro‘yxati (is_published=True). "
            "Filterlar: customer, client, overall_rating va h.k. "
            "Owner (client) o‘zining unpublished review’larini faqat retrieve orqali ko‘rishi mumkin."
        ),
        parameters=[
            OpenApiParameter(
                "customer",
                int,
                OpenApiParameter.QUERY,
                description="CustomerProfile ID bo‘yicha filtrlash",
            ),
            OpenApiParameter(
                "client",
                int,
                OpenApiParameter.QUERY,
                description="Client (User) ID bo‘yicha filtrlash",
            ),
            OpenApiParameter(
                "overall_rating",
                int,
                OpenApiParameter.QUERY,
                description="Aniq baho bo‘yicha filtrlash",
            ),
            OpenApiParameter(
                "search",
                str,
                OpenApiParameter.QUERY,
                description="Title/Comment bo‘yicha qidirish",
            ),
            OpenApiParameter(
                "ordering",
                str,
                OpenApiParameter.QUERY,
                description="Saralash: created_at, overall_rating, like_count, dislike_count",
            ),
        ],
        responses={200: ReviewSerializer},
    ),
    retrieve=extend_schema(
        tags=["reviews"],
        summary="Get single review",
        description=(
            "Bitta reviewni qaytaradi. Agar review unpublished bo‘lsa, faqat review egasi (client) ko‘ra oladi."
        ),
        responses={
            200: ReviewSerializer,
            404: OpenApiResponse(description="Not found"),
        },
    ),
    create=extend_schema(
        tags=["reviews"],
        summary="Create review (client)",
        description=(
            "Yangi review yaratadi. `booking_id` query/body orqali keladi. "
            "Server booking’dan customer’ni aniqlab, client=request.user qilib set qiladi. "
            "Booking uchun oldin review yo‘qligi va booking statusi COMPLETED ekanligi validatsiya qilinadi (serializer/view darajasida)."
        ),
        request=ReviewCreateSerializer,
        responses={
            201: ReviewSerializer,
            400: OpenApiResponse(description="Validation error"),
        },
        examples=[
            OpenApiExample(
                "Create example (body)",
                value={
                    "booking_id": 123,
                    "overall_rating": 5,
                    "title": "Zo'r ish!",
                    "comment": "Ustasi juda muloyim va aniq vaqtida keldi.",
                    "communication_rating": 5,
                    "service_rating": 5,
                    "punctuality_rating": 5,
                    "value_rating": 5,
                },
            ),
        ],
    ),
    update=extend_schema(
        tags=["reviews"],
        summary="Update review (owner)",
        responses={200: ReviewSerializer},
    ),
    partial_update=extend_schema(
        tags=["reviews"],
        summary="Partial update review (owner)",
        responses={200: ReviewSerializer},
    ),
    destroy=extend_schema(
        tags=["reviews"],
        summary="Delete review (owner)",
        responses={204: OpenApiResponse(description="Deleted")},
    ),
)
class ReviewViewSet(viewsets.ModelViewSet):

    permission_classes = [IsAuthenticated]  # dynamic adjustments in get_permissions
    filter_backends = [DjangoFilterBackend, OrderingFilter, SearchFilter]
    filterset_fields = ["customer", "client", "overall_rating", "is_published"]
    ordering_fields = ["created_at", "overall_rating", "like_count", "dislike_count"]
    search_fields = ["title", "comment"]

    def get_queryset(self):
        base = Review.objects.select_related(
            "client", "customer", "customer__user", "booking", "response"
        ).prefetch_related("reactions__user")

        if self.action in ["list"]:
            return base.filter(is_published=True)

        # For other actions, return all; permissions and object-level checks handle visibility.
        return base

    def get_serializer_class(self):
        if self.action == "create":
            return ReviewCreateSerializer
        # default
        return ReviewSerializer

    def get_permissions(self):
        if self.action in ["create"]:
            perms = [IsAuthenticated(), IsVerifiedUser()]
        elif self.action in ["update", "partial_update", "destroy"]:
            perms = [IsAuthenticated(), IsClientOwner()]
        else:
            perms = [IsAuthenticated()]
        return perms

    def perform_auth_check_retrieve(self, obj: Review):

        if not obj.is_published and obj.client_id != self.request.user.id:
            self.permission_denied(self.request, message="Review is not published.")

    def retrieve(self, request, *args, **kwargs):
        obj = self.get_object()
        self.perform_auth_check_retrieve(obj)
        serializer = self.get_serializer(obj)
        return Response(serializer.data)

    # apps/reviews/views.py
    # ReviewViewSet ichidagi create funksiyasini o‘zgartirish
    @transaction.atomic
    def create(self, request, *args, **kwargs):
        booking_id = _get_booking_from_request(request)
        if not booking_id:
            return Response(
                {
                    "error": "booking_id is required in the request body or query params."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        from apps.bookings.models import Booking

        booking = get_object_or_404(
            Booking.objects.select_related("customer", "client"), pk=booking_id
        )

        if booking.client_id != request.user.id:
            return Response(
                {"error": "You can only review your own bookings."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if booking.status != "completed":
            return Response(
                {"error": "Booking must be completed to write a review."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if Review.objects.filter(booking=booking).exists():
            return Response(
                {"error": "A review for this booking already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(
            data=request.data, context={"request": request, "booking": booking}
        )
        serializer.is_valid(raise_exception=True)
        review = serializer.save()
        out = ReviewSerializer(review, context={"request": request}).data
        return Response(out, status=status.HTTP_201_CREATED)

    # -----------------------
    # Reactions (like/dislike)
    # -----------------------

    @extend_schema(
        tags=["reviews → reactions"],
        summary="Set/Update reaction (like/dislike) with optional comment",
        description=(
            "Review uchun foydalanuvchining reaktsiyasini o‘rnatadi (idempotent). "
            "Agar oldin reaktsiya bo‘lsa: turi o‘zgarsa — update bo‘ladi, "
            "turi o‘zgarmasa — comment yangilanadi. DISLIKE bo‘lsa comment majburiy."
        ),
        request=ReviewReactionSerializer,
        responses={
            200: ReviewReactionSerializer,
            201: ReviewReactionSerializer,
            400: OpenApiResponse(description="Validation error"),
        },
        examples=[
            OpenApiExample(
                "Like",
                value={"reaction_type": "like", "comment": "Ustasi ajoyib ishladi!"},
            ),
            OpenApiExample(
                "Dislike",
                value={
                    "reaction_type": "dislike",
                    "comment": "Kechikdi va aloqa sust.",
                },
            ),
        ],
    )
    @action(
        detail=True,
        methods=["post"],
        url_path="react",
        permission_classes=[IsAuthenticated],
    )
    @transaction.atomic
    def react(self, request, pk=None):
        """
        Idempotent reaction setter:
        - If no reaction exists -> create.
        - If exists with different type -> update type and optional comment.
        - If exists with same type -> only update comment (optional).
        Returns 201 on create, 200 on update.
        """
        review: Review = self.get_object()

        # Public only? Yo‘q: reaction public reviewda ma’no kasb etadi, lekin unpublished bo‘lsa ham
        # owner hamda platforma siyosatiga qarab ruxsat berish mumkin. Hozircha ruxsat beramiz.
        payload = request.data.copy()
        payload["review"] = review.id  # serializer uchun link

        # mavjud reaktsiyani olib ko‘ramiz
        existing = ReviewReaction.objects.filter(
            review=review, user=request.user
        ).first()

        if existing:
            # Partial update semantics
            serializer = ReviewReactionSerializer(
                existing, data=payload, partial=True, context={"request": request}
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)

        # create
        serializer = ReviewReactionSerializer(
            data=payload, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        obj = serializer.save(review=review)
        return Response(
            ReviewReactionSerializer(obj).data, status=status.HTTP_201_CREATED
        )

    @extend_schema(
        tags=["reviews → reactions"],
        summary="Remove my reaction from review",
        description="Foydalanuvchining o‘z reaktsiyasini o‘chiradi (like/dislike).",
        responses={204: OpenApiResponse(description="Removed")},
    )
    @action(
        detail=True,
        methods=["delete"],
        url_path="react",
        permission_classes=[IsAuthenticated],
    )
    @transaction.atomic
    def unreact(self, request, pk=None):
        review: Review = self.get_object()
        obj = ReviewReaction.objects.filter(review=review, user=request.user).first()
        if not obj:
            return Response(
                {"detail": "No reaction to remove."}, status=status.HTTP_400_BAD_REQUEST
            )
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @extend_schema(
        tags=["reviews → reactions"],
        summary="List reactions for a review",
        description=(
            "Berilgan review uchun reaktsiyalar ro‘yxati. `type=like|dislike` filter mavjud. "
            "Frontend hover/bosganda izohlarni ko‘rsatish uchun ishlatiladi."
        ),
        parameters=[
            OpenApiParameter(
                "type",
                str,
                OpenApiParameter.QUERY,
                enum=["like", "dislike"],
                description="Reaction type",
            ),
        ],
        responses={200: ReviewReactionSerializer(many=True)},
    )
    @action(
        detail=True,
        methods=["get"],
        url_path="reactions",
        permission_classes=[IsAuthenticated],
    )
    def reactions(self, request, pk=None):
        review: Review = self.get_object()
        rtype = request.query_params.get("type")
        qs = review.reactions.select_related("user").all()
        if rtype in {"like", "dislike"}:
            qs = qs.filter(reaction_type=rtype)
        page = self.paginate_queryset(qs)
        ser = ReviewReactionSerializer(page or qs, many=True)
        return (
            self.get_paginated_response(ser.data)
            if page is not None
            else Response(ser.data)
        )

    @extend_schema(
        tags=["reviews → reactions"],
        summary="Get reaction summary",
        description="Like/Dislike count va oxirgi 5 ta comment (har bir turdan 5 tadan) ni qaytaradi.",
        responses={
            200: OpenApiResponse(
                response=dict,
                description="{'like_count': int, 'dislike_count': int, 'latest_likes': [...], 'latest_dislikes': [...]}",
            )
        },
    )
    @action(
        detail=True,
        methods=["get"],
        url_path="reactions/summary",
        permission_classes=[IsAuthenticated],
    )
    def reactions_summary(self, request, pk=None):
        review: Review = self.get_object()

        latest_likes = list(
            review.reactions.filter(reaction_type=ReviewReaction.ReactionType.LIKE)
            .exclude(comment="")
            .select_related("user")
            .order_by("-created_at")
            .values(
                "id", "comment", "created_at", "user__first_name", "user__last_name"
            )[:5]
        )
        latest_dislikes = list(
            review.reactions.filter(reaction_type=ReviewReaction.ReactionType.DISLIKE)
            .exclude(comment="")
            .select_related("user")
            .order_by("-created_at")
            .values(
                "id", "comment", "created_at", "user__first_name", "user__last_name"
            )[:5]
        )
        return Response(
            {
                "like_count": review.like_count,
                "dislike_count": review.dislike_count,
                "latest_likes": latest_likes,
                "latest_dislikes": latest_dislikes,
            }
        )


# -----------------------------------------------------------------------------
# ReviewResponse ViewSet (provider’s response)
# -----------------------------------------------------------------------------


@extend_schema_view(
    create=extend_schema(
        tags=["reviews → response"],
        summary="Create provider response",
        description="Provider (owner) review’ga rasmiy javob yozadi. Har review uchun 1 ta javob.",
        request=ReviewResponseSerializer,
        responses={
            201: ReviewResponseSerializer,
            400: OpenApiResponse(description="Already exists or validation error"),
        },
        examples=[
            OpenApiExample(
                "Example",
                value={"response_text": "Rahmat, yana xizmat ko‘rsatishdan mamnunmiz!"},
            )
        ],
    ),
    retrieve=extend_schema(
        tags=["reviews → response"],
        summary="Get provider response",
        responses={200: ReviewResponseSerializer},
    ),
    update=extend_schema(
        tags=["reviews → response"],
        summary="Update provider response",
        responses={200: ReviewResponseSerializer},
    ),
    partial_update=extend_schema(
        tags=["reviews → response"],
        summary="Partial update provider response",
        responses={200: ReviewResponseSerializer},
    ),
    destroy=extend_schema(
        tags=["reviews → response"],
        summary="Delete provider response",
        responses={204: OpenApiResponse(description="Deleted")},
    ),
)
class ReviewResponseViewSet(
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """
    Provider javobi uchun CRUD (review egasi bo‘lgan provider).
    """

    queryset = ReviewResponse.objects.select_related("review", "review__customer__user")
    serializer_class = ReviewResponseSerializer
    permission_classes = [IsAuthenticated, IsProviderOwner]

    def perform_create(self, serializer):
        review_id = self.request.query_params.get("review_id") or self.request.data.get(
            "review_id"
        )
        if not review_id:
            raise serializers.ValidationError({"review_id": "This field is required."})
        review = get_object_or_404(
            Review.objects.select_related("customer", "customer__user"), pk=review_id
        )
        # IsProviderOwner permission hozirgi userni tekshiradi (review.customer.user == request.user)
        if hasattr(review, "response"):
            from rest_framework import serializers as drf_serializers

            raise drf_serializers.ValidationError(
                "Response already exists for this review."
            )
        serializer.save(review=review)


# -----------------------------------------------------------------------------
# Extra endpoint: My reviews (client dashboard)
# -----------------------------------------------------------------------------


@extend_schema(
    tags=["reviews"],
    summary="My reviews (as client)",
    description="Kirish qilgan foydalanuvchining client sifatida yozgan barcha review’lari (published/unpublished).",
    responses={200: ReviewSerializer(many=True)},
)
class MyReviewsViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ReviewSerializer
    filter_backends = [OrderingFilter]
    ordering_fields = ["created_at"]

    def get_queryset(self):
        return (
            Review.objects.filter(client=self.request.user)
            .select_related(
                "client", "customer", "customer__user", "booking", "response"
            )
            .prefetch_related("reactions__user")
            .order_by("-created_at")
        )
