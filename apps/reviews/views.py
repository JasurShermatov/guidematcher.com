# apps/reviews/views.py
from rest_framework import viewsets, mixins, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter, SearchFilter

from apps.reviews.models import Review, ReviewResponse, ReviewHelpful
from apps.reviews.serializers import (
    ReviewSerializer,
    ReviewCreateSerializer,
    ReviewResponseSerializer,
    ReviewHelpfulSerializer,
)
from apps.reviews.permissions import IsClientOwner, IsProviderOwner
from apps.common.permissions import IsVerifiedUser  # avval yaratilgan
from apps.reviews.filters import ReviewFilter


# ───────────────────────────────────────── Review
class ReviewViewSet(viewsets.ModelViewSet):
    """
    list   – hamma ko‘rishi mumkin (faqat published)
    create – faqat verified CLIENT
    update/delete – faqat review egasi
    """

    queryset = Review.objects.select_related("client", "customer", "booking")
    filter_backends = [DjangoFilterBackend, OrderingFilter, SearchFilter]
    filterset_class = ReviewFilter
    ordering_fields = ["created_at", "overall_rating"]
    search_fields = ["title", "comment"]

    def get_serializer_class(self):
        if self.action == "create":
            return ReviewCreateSerializer
        return ReviewSerializer

    def get_permissions(self):
        if self.action in ["update", "partial_update", "destroy"]:
            perms = [IsAuthenticated(), IsClientOwner()]
        elif self.action == "create":
            perms = [IsAuthenticated(), IsVerifiedUser()]
        else:
            perms = [IsAuthenticated()]
        return perms

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action in ["list", "retrieve"]:
            return qs.filter(is_published=True)
        return qs

    # ---------- extra actions ----------
    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def helpful(self, request, pk=None):
        """/reviews/{id}/helpful/ – ‘foydali’ ovoz berish"""
        review = self.get_object()
        _, created = ReviewHelpful.objects.get_or_create(
            review=review, user=request.user
        )
        if not created:
            return Response(
                {"detail": "Allaqachon ovoz berdingiz."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            {"detail": "Rahmat! Fikr foydali deb belgilandi."},
            status=status.HTTP_201_CREATED,
        )


# ───────────────────────────────────────── ReviewResponse
class ReviewResponseViewSet(
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """
    Provider review’ga javob yozadi yoki tahrirlaydi.
    – create: ReviewResponse yo‘q bo‘lsa
    – update: faqat egasi
    """

    queryset = ReviewResponse.objects.select_related("review", "review__customer__user")
    serializer_class = ReviewResponseSerializer
    permission_classes = [IsAuthenticated, IsProviderOwner]

    def perform_create(self, serializer):
        review = serializer.validated_data["review"]
        if hasattr(review, "response"):
            raise serializers.ValidationError(
                "Bu review uchun javob allaqachon mavjud."
            )
        serializer.save()


# ───────────────────────────────────────── Helpful (optional, agar alohida endpoint xohlasangiz)
class ReviewHelpfulViewSet(
    mixins.CreateModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet
):
    queryset = ReviewHelpful.objects.all()
    serializer_class = ReviewHelpfulSerializer
    permission_classes = [IsAuthenticated]

    def perform_destroy(self, instance):
        if instance.user != self.request.user:
            raise PermissionDenied("O‘zingizning ovozingizni o‘chira olasiz.")
        super().perform_destroy(instance)
