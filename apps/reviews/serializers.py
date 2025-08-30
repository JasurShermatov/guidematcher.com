from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from apps.profiles.models import CustomerProfile
from apps.reviews.models import ReviewResponse, ReviewReaction
from apps.users.models import User
from .models import Review


class UserShortSerializer(serializers.ModelSerializer):
    """Minimal foydalanuvchi ma'lumotlari (frontend uchun yetarli)."""

    class Meta:
        model = User
        fields = ["id", "first_name", "last_name"]


class CustomerShortSerializer(serializers.ModelSerializer):
    # modelda yo‘q bo‘lgani uchun explicit tarzda ta’riflaymiz
    business_name = serializers.CharField(source="user.full_name", read_only=True)

    class Meta:
        model = CustomerProfile
        fields = ["id", "business_name", "average_rating", "total_reviews"]


class ReviewReactionSerializer(serializers.ModelSerializer):
    """
    Review ostidagi LIKE / DISLIKE reaksiyalar.
    Frontend hover/bosganda izohlarni chiqarishi uchun `comment` ham yuboriladi.
    """

    user = UserShortSerializer(read_only=True)

    class Meta:
        model = ReviewReaction
        fields = ["id", "reaction_type", "comment", "created_at", "user"]
        read_only_fields = ["id", "created_at", "user"]

    def validate(self, attrs):
        """
        DISLIKE bo‘lsa — comment majburiy.
        LIKE bo‘lsa — comment optional.
        """
        if attrs.get(
            "reaction_type"
        ) == ReviewReaction.ReactionType.DISLIKE and not attrs.get("comment"):
            raise serializers.ValidationError(
                {"comment": _("Comment is required when reaction is 'dislike'.")}
            )
        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            validated_data["user"] = request.user
        return super().create(validated_data)


class ReviewResponseSerializer(serializers.ModelSerializer):
    """Review ga provider tomonidan berilgan javob."""

    class Meta:
        model = ReviewResponse
        fields = ["id", "response_text", "is_published", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class ReviewSerializer(serializers.ModelSerializer):
    """
    Full review serializer with nested relations:
    - Client info
    - Customer short info
    - Reaction counts
    - List of reactions (for hover in frontend)
    - Provider response
    """

    client = UserShortSerializer(read_only=True)
    customer = CustomerShortSerializer(read_only=True)

    reactions = ReviewReactionSerializer(many=True, read_only=True)
    response = ReviewResponseSerializer(read_only=True)

    class Meta:
        model = Review
        fields = [
            "id",
            "booking",
            "client",
            "customer",
            "overall_rating",
            "communication_rating",
            "service_rating",
            "punctuality_rating",
            "value_rating",
            "title",
            "comment",
            "is_published",
            "is_featured",
            "created_at",
            "updated_at",
            # Denormalized counters
            "like_count",
            "dislike_count",
            # Nested
            "reactions",
            "response",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "client",
            "customer",
            "like_count",
            "dislike_count",
            "reactions",
            "response",
        ]


class ReviewCreateSerializer(serializers.ModelSerializer):
    """
    Review yaratish uchun serializer.
    Client va Customer backend’da avtomatik set qilinadi (request.user va booking’dan).
    """

    class Meta:
        model = Review
        fields = [
            "overall_rating",
            "communication_rating",
            "service_rating",
            "punctuality_rating",
            "value_rating",
            "title",
            "comment",
        ]

    def create(self, validated_data):
        request = self.context.get("request")
        booking = self.context.get("booking")  # view’dan keladi
        if not booking:
            raise serializers.ValidationError({"booking": _("Booking is required.")})

        validated_data["booking"] = booking
        validated_data["client"] = request.user
        validated_data["customer"] = booking.customer  # booking orqali provider

        return super().create(validated_data)
