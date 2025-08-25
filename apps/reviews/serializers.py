#  apps/reviews/serializers.py


from django.utils import timezone
from rest_framework import serializers

from apps.profiles.models import CustomerProfile
from apps.users.models import User
from .models import Review


class ClientSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = ["id", "full_name", "first_name", "last_name", "avatar"]
        read_only_fields = fields


class CustomerSerializer(serializers.ModelSerializer):

    name = serializers.CharField(source="user.full_name", read_only=True)

    class Meta:
        model = CustomerProfile
        fields = ["id", "name", "average_rating", "total_reviews"]
        read_only_fields = fields


class ReviewListSerializer(serializers.ModelSerializer):

    client = ClientSerializer(read_only=True)
    customer = CustomerSerializer(read_only=True)
    days_ago = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = [
            "id",
            "rating",
            "comment",
            "client",
            "customer",
            "created_at",
            "edited_at",
            "days_ago",
        ]
        read_only_fields = fields

    def get_days_ago(self, obj):
        delta = timezone.now() - obj.created_at
        return delta.days


class ReviewDetailSerializer(ReviewListSerializer):

    booking_info = serializers.SerializerMethodField()

    class Meta(ReviewListSerializer.Meta):
        fields = ReviewListSerializer.Meta.fields + ["booking_info", "is_published"]

    def get_booking_info(self, obj):
        booking = obj.booking
        return {
            "id": booking.id,
            "title": booking.title,
            "start_date": booking.start_date,
            "end_date": booking.end_date,
            "location": f"{booking.city}, {booking.country}",
        }


class ReviewCreateUpdateSerializer(serializers.ModelSerializer):

    class Meta:
        model = Review
        fields = ["rating", "comment"]

    def validate(self, attrs):
        if not attrs.get("rating") and not attrs.get("comment"):
            raise serializers.ValidationError(
                _("Please provide either a rating or comment")
            )
        return attrs

    def create(self, validated_data):
        booking = self.context["booking"]

        return Review.objects.create(
            booking=booking,
            client=self.context["request"].user,
            customer=booking.customer_profile,
            **validated_data,
        )


class MyReviewSerializer(serializers.ModelSerializer):

    customer_name = serializers.CharField(
        source="customer.user.full_name", read_only=True
    )
    booking_title = serializers.CharField(source="booking.title", read_only=True)
    can_edit = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = [
            "id",
            "rating",
            "comment",
            "customer_name",
            "booking_title",
            "created_at",
            "edited_at",
            "is_published",
            "can_edit",
        ]
        read_only_fields = ["id", "created_at", "edited_at", "is_published"]

    def get_can_edit(self, obj):
        if not obj.is_published:
            return False
        days_passed = (timezone.now() - obj.created_at).days
        return days_passed <= 7
