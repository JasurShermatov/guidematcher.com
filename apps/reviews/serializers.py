# apps/reviews/serializers.py
from rest_framework import serializers
from django.db import transaction
from apps.reviews.models import Review, ReviewResponse, ReviewHelpful


class ReviewSerializer(serializers.ModelSerializer):
    """Read-only serializer (GET, list/retrieve)"""

    client_full_name = serializers.CharField(
        source="client.get_full_name", read_only=True
    )
    customer_full_name = serializers.CharField(
        source="customer.user.get_full_name", read_only=True
    )

    class Meta:
        model = Review
        fields = "__all__"
        read_only_fields = (
            "id",
            "created_at",
            "updated_at",
            "helpful_count",
            "moderated_by",
            "moderated_at",
            "moderation_note",
        )


class ReviewCreateSerializer(serializers.ModelSerializer):
    """
    – Yangi review qo‘shish (POST)
    – client maydoni avtomatik request.user’dan olinadi
    – customer va booking tekshirishlar transaction ichida
    """

    class Meta:
        model = Review
        exclude = (
            "client",
            "helpful_count",
            "moderated_by",
            "moderated_at",
            "moderation_note",
        )

    def validate(self, attrs):
        booking = attrs["booking"]
        if booking.client != self.context["request"].user:
            raise serializers.ValidationError("Bu bron sizga tegishli emas.")
        if hasattr(booking, "review"):
            raise serializers.ValidationError("Bu bron uchun review allaqachon mavjud.")
        if booking.status != booking.BookingStatus.COMPLETED:
            raise serializers.ValidationError(
                "Review faqat yakunlangan bron uchun yoziladi."
            )
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        validated_data["client"] = self.context["request"].user
        return super().create(validated_data)


class ReviewResponseSerializer(serializers.ModelSerializer):
    """Provider javobi. Bitta review ↔️ bitta response"""

    class Meta:
        model = ReviewResponse
        fields = (
            "id",
            "review",
            "response_text",
            "is_published",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class ReviewHelpfulSerializer(serializers.ModelSerializer):
    """‘Foydali’ ovoz berish"""

    class Meta:
        model = ReviewHelpful
        fields = ("id", "review", "user", "created_at")
        read_only_fields = ("id", "user", "created_at")

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)
