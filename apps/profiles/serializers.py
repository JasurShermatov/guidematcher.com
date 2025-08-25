# apps/profiles/serializers.py - REVIEW INTEGRATION QOSHILGAN

from rest_framework import serializers
from django.db.models import Avg, Count, Q
from apps.users.serializers import UserShortSerializer
from .models import (
    ClientProfile,
    CustomerProfile,
    Portfolio,
    VerificationDocument,
    Availability,
)
from apps.common.models import Language, ServiceType
from apps.reviews.models import Review  # YANGI IMPORT


class ClientProfileCreateUpdateSerializer(serializers.ModelSerializer):

    languages = serializers.PrimaryKeyRelatedField(
        queryset=Language.objects.all(), many=True, required=False
    )

    class Meta:
        model = ClientProfile
        fields = ["date_of_birth", "preferred_contact", "languages"]

    def update(self, instance, validated_data):
        languages = validated_data.pop("languages", None)
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        if languages is not None:
            instance.languages.set(languages)
        return instance


class ClientProfileSerializer(serializers.ModelSerializer):
    user = UserShortSerializer(read_only=True)
    full_name = serializers.CharField(source="user.full_name", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    profile_id = serializers.IntegerField(source="id", read_only=True)

    class Meta:
        model = ClientProfile
        fields = [
            "id",
            "user",
            "full_name",
            "email",
            "profile_id",
            "date_of_birth",
            "preferred_contact",
            "languages",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "user",
            "full_name",
            "email",
            "created_at",
            "updated_at",
        ]


class ClientProfileShortSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="user.full_name", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = ClientProfile
        fields = ["id", "full_name", "email", "preferred_contact"]


class ReviewForCustomerSerializer(serializers.ModelSerializer):

    client_name = serializers.CharField(source="client.full_name", read_only=True)
    client_avatar = serializers.ImageField(source="client.avatar", read_only=True)
    days_ago = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = [
            "id",
            "rating",
            "comment",
            "client_name",
            "client_avatar",
            "created_at",
            "days_ago",
        ]

    def get_days_ago(self, obj):
        from django.utils import timezone

        delta = timezone.now() - obj.created_at
        if delta.days == 0:
            return "Today"
        elif delta.days == 1:
            return "Yesterday"
        elif delta.days < 7:
            return f"{delta.days} days ago"
        elif delta.days < 30:
            weeks = delta.days // 7
            return f"{weeks} week{'s' if weeks > 1 else ''} ago"
        else:
            months = delta.days // 30
            return f"{months} month{'s' if months > 1 else ''} ago"


class CustomerProfileCreateUpdateSerializer(serializers.ModelSerializer):
    languages = serializers.PrimaryKeyRelatedField(
        queryset=Language.objects.all(), many=True, required=False
    )
    service_types = serializers.PrimaryKeyRelatedField(
        queryset=ServiceType.objects.all(), many=True, required=False
    )

    class Meta:
        model = CustomerProfile
        fields = [
            "professional_bio",
            "years_of_experience",
            "service_types",
            "city",
            "service_areas",
            "hourly_rate",
            "daily_rate",
            "currency",
            "languages",
            "is_available",
        ]

    def validate_years_of_experience(self, value):
        if value < 0:
            raise serializers.ValidationError("Years of experience cannot be negative.")
        return value

    def validate_hourly_rate(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Hourly rate cannot be negative.")
        return value

    def validate_daily_rate(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Daily rate cannot be negative.")
        return value

    def update(self, instance, validated_data):
        languages = validated_data.pop("languages", None)
        service_types = validated_data.pop("service_types", None)
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        if languages is not None:
            instance.languages.set(languages)
        if service_types is not None:
            instance.service_types.set(service_types)
        return instance


class CustomerProfileSerializer(serializers.ModelSerializer):

    user = UserShortSerializer(read_only=True)
    full_name = serializers.CharField(source="user.full_name", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    profile_id = serializers.IntegerField(source="id", read_only=True)
    city_name = serializers.CharField(source="city.name", read_only=True)
    country_name = serializers.CharField(source="city.country.name", read_only=True)

    recent_reviews = serializers.SerializerMethodField()
    review_statistics = serializers.SerializerMethodField()

    class Meta:
        model = CustomerProfile
        fields = [
            "id",
            "user",
            "full_name",
            "email",
            "profile_id",
            "country_name",
            "professional_bio",
            "years_of_experience",
            "service_types",
            "city",
            "city_name",
            "service_areas",
            "hourly_rate",
            "daily_rate",
            "currency",
            "languages",
            "verification_status",
            "verification_date",
            "total_bookings",
            "total_reviews",
            "average_rating",
            "is_available",
            "is_verified",
            "created_at",
            "updated_at",
            "recent_reviews",
            "review_statistics",
        ]
        read_only_fields = [
            "id",
            "user",
            "full_name",
            "email",
            "country_name",
            "city_name",
            "verification_status",
            "verification_date",
            "total_bookings",
            "total_reviews",
            "average_rating",
            "is_verified",
            "created_at",
            "updated_at",
            "recent_reviews",
            "review_statistics",
        ]

    def get_recent_reviews(self, obj):
        reviews = (
            Review.objects.filter(customer=obj, is_published=True)
            .exclude(Q(rating__isnull=True) & Q(comment=""))
            .order_by("-created_at")[:5]
        )

        return ReviewForCustomerSerializer(reviews, many=True).data

    def get_review_statistics(self, obj):
        reviews = Review.objects.filter(
            customer=obj, is_published=True, rating__isnull=False
        )

        distribution = {}
        for i in range(1, 6):
            count = reviews.filter(rating=i).count()
            distribution[str(i)] = count

        total = sum(distribution.values())

        if total > 0:
            percentages = {
                k: round((v / total) * 100, 1) for k, v in distribution.items()
            }
        else:
            percentages = {str(i): 0 for i in range(1, 6)}

        return {
            "total_reviews": total,
            "average_rating": float(obj.average_rating) if obj.average_rating else 0,
            "rating_distribution": distribution,
            "rating_percentages": percentages,
            "with_comments": reviews.exclude(comment="").count(),
        }


class CustomerProfileShortSerializer(serializers.ModelSerializer):

    user = UserShortSerializer(read_only=True)
    city_name = serializers.CharField(source="city.name", read_only=True)

    class Meta:
        model = CustomerProfile
        fields = [
            "id",
            "user",
            "city_name",
            "average_rating",
            "is_verified",
            "hourly_rate",
            "is_available",
        ]
        read_only_fields = ["id", "user", "city_name", "average_rating", "is_verified"]


class CustomerPortfolioPublicSerializer(serializers.ModelSerializer):

    user_info = serializers.SerializerMethodField()
    portfolio_items = serializers.SerializerMethodField()
    all_reviews = serializers.SerializerMethodField()
    review_statistics = serializers.SerializerMethodField()

    class Meta:
        model = CustomerProfile
        fields = [
            "id",
            "user_info",
            "professional_bio",
            "years_of_experience",
            "service_types",
            "languages",
            "city",
            "service_areas",
            "hourly_rate",
            "daily_rate",
            "currency",
            "is_available",
            "is_verified",
            "average_rating",
            "total_reviews",
            "total_bookings",
            "portfolio_items",
            "all_reviews",
            "review_statistics",
        ]

    def get_user_info(self, obj):
        return {
            "id": obj.user.id,
            "full_name": obj.user.full_name,
            "avatar": obj.user.avatar.url if obj.user.avatar else None,
            "bio": obj.user.bio,
            "created_at": obj.user.created_at,
        }

    def get_portfolio_items(self, obj):
        from .serializers import PortfolioSerializer

        items = obj.portfolio_set.all().order_by("order")
        return PortfolioSerializer(items, many=True).data

    def get_all_reviews(self, obj):

        request = self.context.get("request")
        limit = 10
        if request:
            limit = request.query_params.get("review_limit", 10)
            try:
                limit = int(limit)
            except:
                limit = 10

        reviews = (
            Review.objects.filter(customer=obj, is_published=True)
            .exclude(Q(rating__isnull=True) & Q(comment=""))
            .order_by("-created_at")[:limit]
        )

        return ReviewForCustomerSerializer(reviews, many=True).data

    def get_review_statistics(self, obj):
        reviews = Review.objects.filter(
            customer=obj, is_published=True, rating__isnull=False
        )

        distribution = {}
        for i in range(1, 6):
            count = reviews.filter(rating=i).count()
            distribution[str(i)] = count

        total = sum(distribution.values())

        if total > 0:
            percentages = {
                k: round((v / total) * 100, 1) for k, v in distribution.items()
            }

            most_common = max(distribution, key=distribution.get)
        else:
            percentages = {str(i): 0 for i in range(1, 6)}
            most_common = None

        return {
            "total_reviews": total,
            "average_rating": float(obj.average_rating) if obj.average_rating else 0,
            "rating_distribution": distribution,
            "rating_percentages": percentages,
            "most_common_rating": most_common,
            "reviews_with_comments": reviews.exclude(comment="").count(),
            "recommendation_rate": (
                round(
                    (distribution.get("5", 0) + distribution.get("4", 0)) / total * 100,
                    1,
                )
                if total > 0
                else 0
            ),
        }


class PortfolioSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(
        source="customer.user.full_name", read_only=True
    )

    class Meta:
        model = Portfolio
        fields = [
            "id",
            "customer",
            "customer_name",
            "image",
            "title",
            "description",
            "order",
            "created_at",
        ]
        read_only_fields = ["id", "customer", "customer_name", "created_at"]


class VerificationDocumentSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(
        source="customer.user.full_name", read_only=True
    )
    verified_by_name = serializers.CharField(
        source="verified_by.full_name", read_only=True
    )

    class Meta:
        model = VerificationDocument
        fields = [
            "id",
            "customer",
            "customer_name",
            "document_type",
            "file",
            "description",
            "is_verified",
            "verified_by",
            "verified_by_name",
            "verified_at",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "customer",
            "customer_name",
            "is_verified",
            "verified_by",
            "verified_by_name",
            "verified_at",
            "created_at",
        ]


class AvailabilitySerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(
        source="customer.user.full_name", read_only=True
    )

    class Meta:
        model = Availability
        fields = [
            "id",
            "customer",
            "customer_name",
            "date",
            "is_available",
            "start_time",
            "end_time",
            "note",
            "created_at",
        ]
        read_only_fields = ["id", "customer", "customer_name", "created_at"]

    def validate_date(self, value):
        user = self.context["request"].user
        try:
            customer = user.customerprofile
        except CustomerProfile.DoesNotExist:
            raise serializers.ValidationError("You don't have a customer profile yet.")
        if Availability.objects.filter(customer=customer, date=value).exists():
            raise serializers.ValidationError(
                f"Availability for {value} already exists."
            )
        return value

    def create(self, validated_data):
        user = self.context["request"].user
        customer = user.customerprofile
        validated_data["customer"] = customer
        return super().create(validated_data)
