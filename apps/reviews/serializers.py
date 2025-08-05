from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Review, ReviewHelpful, ReviewReport
from apps.users.serializers import UserSerializer
from apps.bookings.models import Booking

User = get_user_model()


class ReviewSerializer(serializers.ModelSerializer):
    """
    Serializer for reviews
    """

    reviewer = UserSerializer(read_only=True)
    guide = UserSerializer(read_only=True)
    booking_id = serializers.UUIDField(source="booking.id", read_only=True)
    helpful_count = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = [
            "id",
            "booking",
            "booking_id",
            "reviewer",
            "guide",
            "rating",
            "title",
            "comment",
            "communication_rating",
            "professionalism_rating",
            "knowledge_rating",
            "value_rating",
            "is_verified",
            "is_featured",
            "guide_response",
            "guide_responded_at",
            "helpful_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "reviewer",
            "guide",
            "is_verified",
            "is_featured",
            "guide_responded_at",
            "created_at",
            "updated_at",
            "helpful_count",
        ]

    def get_helpful_count(self, obj):
        """
        Get count of helpful votes
        """
        return obj.helpful_votes.filter(is_helpful=True).count()


class ReviewCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating reviews
    """

    booking = serializers.PrimaryKeyRelatedField(queryset=Booking.objects.all())

    class Meta:
        model = Review
        fields = [
            "booking",
            "rating",
            "title",
            "comment",
            "communication_rating",
            "professionalism_rating",
            "knowledge_rating",
            "value_rating",
        ]

    def validate(self, attrs):
        """
        Validate review creation
        """
        booking = attrs.get("booking")
        request = self.context["request"]

        # Ensure user is the client of the booking
        if booking.client != request.user:
            raise serializers.ValidationError(
                {"booking": "Siz ushbu bronlashning mijozi emassiz."}
            )

        # Ensure booking is completed
        if booking.status != "completed":
            raise serializers.ValidationError(
                {
                    "booking": "Faqat tugallangan bronlashlar uchun sharh qoldirilishi mumkin."
                }
            )

        # Check if review already exists
        if Review.objects.filter(booking=booking).exists():
            raise serializers.ValidationError(
                {"booking": "Ushbu bronlash uchun allaqachon sharh mavjud."}
            )

        return attrs

    def create(self, validated_data):
        """
        Create a review
        """
        booking = validated_data["booking"]
        review = Review.objects.create(
            reviewer=self.context["request"].user, guide=booking.guide, **validated_data
        )
        return review


class ReviewResponseSerializer(serializers.ModelSerializer):
    """
    Serializer for guide responses to reviews
    """

    class Meta:
        model = Review
        fields = ["guide_response"]

    def validate(self, attrs):
        """
        Validate guide response
        """
        if not attrs.get("guide_response"):
            raise serializers.ValidationError(
                {"guide_response": "Javob bo'sh bo'lmasligi kerak."}
            )
        return attrs

    def update(self, instance, validated_data):
        """
        Update review with guide response
        """
        instance.guide_response = validated_data["guide_response"]
        from django.utils import timezone

        instance.guide_responded_at = timezone.now()
        instance.save()
        return instance


class ReviewHelpfulSerializer(serializers.ModelSerializer):
    """
    Serializer for marking reviews as helpful
    """

    class Meta:
        model = ReviewHelpful
        fields = ["is_helpful"]

    def validate(self, attrs):
        """
        Validate helpful vote
        """
        review = self.context["review"]
        user = self.context["request"].user
        if user == review.reviewer:
            raise serializers.ValidationError(
                {
                    "non_field_errors": "Siz o'zingizning sharhingizni foydali deb belgilay olmaysiz."
                }
            )
        if user == review.guide:
            raise serializers.ValidationError(
                {
                    "non_field_errors": "Siz o'zingizga qoldirilgan sharhni foydali deb belgilay olmaysiz."
                }
            )
        return attrs


class ReviewReportSerializer(serializers.ModelSerializer):
    """
    Serializer for reporting reviews
    """

    class Meta:
        model = ReviewReport
        fields = ["reason", "details"]


class ReviewReportResolveSerializer(serializers.ModelSerializer):
    """
    Serializer for resolving review reports
    """

    class Meta:
        model = ReviewReport
        fields = ["is_resolved", "details"]

    def validate(self, attrs):
        """
        Validate report resolution
        """
        if attrs.get("is_resolved") and not attrs.get("details"):
            raise serializers.ValidationError(
                {"details": "Yechim tafsilotlari talab qilinadi."}
            )
        return attrs

    def update(self, instance, validated_data):
        """
        Update report with resolution details
        """
        instance.is_resolved = validated_data["is_resolved"]
        instance.details = validated_data.get("details", instance.details)
        instance.resolved_by = self.context["request"].user
        from django.utils import timezone

        instance.resolved_at = timezone.now() if validated_data["is_resolved"] else None
        instance.save()
        return instance
