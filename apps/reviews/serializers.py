from rest_framework import serializers
from django.db import transaction
from apps.reviews.models import Review, ReviewResponse, ReviewHelpful


class ReviewSerializer(serializers.ModelSerializer):
    client = serializers.SerializerMethodField()
    customer = serializers.SerializerMethodField()

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
            "helpful_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = (
            "id",
            "helpful_count",
            "created_at",
            "updated_at",
        )

    def get_client(self, obj):
        return {
            "id": obj.client.id,
            "full_name": obj.client.get_full_name(),
        }

    def get_customer(self, obj):
        return {
            "id": obj.customer.id,
            "full_name": obj.customer.user.get_full_name(),
        }


class ReviewCreateSerializer(serializers.ModelSerializer):
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
        user = self.context["request"].user
        if booking.client != user:
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
    customer = serializers.SerializerMethodField()

    class Meta:
        model = ReviewResponse
        fields = [
            "id",
            "review",
            "customer",
            "response_text",
            "is_published",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ("id", "created_at", "updated_at")

    def get_customer(self, obj):
        return {
            "id": obj.review.customer.id,
            "full_name": obj.review.customer.user.get_full_name(),
        }


class ReviewHelpfulSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()

    class Meta:
        model = ReviewHelpful
        fields = ("id", "review", "user", "created_at")
        read_only_fields = ("id", "user", "created_at")

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)

    def get_user(self, obj):
        return {
            "id": obj.user.id,
            "full_name": obj.user.get_full_name(),
        }
