# apps/profiles/serializers.py - FIXED VERSION

from django.db.models import Count, Q
from rest_framework import serializers

from apps.common.models import Language, ServiceType
from apps.reviews.models import Review
from apps.users.serializers import UserShortSerializer
from .models import (
    ClientProfile,
    CustomerProfile,
    Portfolio,
    VerificationDocument,
    Availability,
)


# Client Serializers
class ClientProfileCreateUpdateSerializer(serializers.ModelSerializer):
    languages = serializers.PrimaryKeyRelatedField(
        queryset=Language.objects.all(), many=True, required=False
    )

    class Meta:
        model = ClientProfile
        fields = ["date_of_birth", "preferred_contact", "languages"]

    def update(self, instance, validated_data):
        languages = validated_data.pop("languages", None)
        instance = super().update(instance, validated_data)
        if languages is not None:
            instance.languages.set(languages)
        return instance


class ClientProfileSerializer(serializers.ModelSerializer):
    user = UserShortSerializer(read_only=True)
    full_name = serializers.CharField(source="user.full_name", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = ClientProfile
        fields = [
            "id",
            "user",
            "full_name",
            "email",
            "date_of_birth",
            "preferred_contact",
            "languages",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "user", "created_at", "updated_at"]


# Review Serializer - FIXED
class ReviewForCustomerSerializer(serializers.ModelSerializer):
    # FIX: client_profile instead of client
    client_name = serializers.SerializerMethodField()
    client_avatar = serializers.SerializerMethodField()
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

    def get_client_name(self, obj):
        if obj.client_profile and obj.client_profile.user:
            return obj.client_profile.user.full_name
        return "Anonymous"

    def get_client_avatar(self, obj):
        if obj.client_profile and obj.client_profile.user.avatar:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.client_profile.user.avatar.url)
        return None

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
        elif delta.days < 365:
            months = delta.days // 30
            return f"{months} month{'s' if months > 1 else ''} ago"
        else:
            years = delta.days // 365
            return f"{years} year{'s' if years > 1 else ''} ago"


# Customer Serializers
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
            "country",  # Added country field
            "service_areas",
            "hourly_rate",
            "daily_rate",
            "currency",
            "languages",
            "is_available",
        ]

    def validate_years_of_experience(self, value):
        if value < 0:
            raise serializers.ValidationError("Years cannot be negative")
        if value > 50:
            raise serializers.ValidationError("Years cannot exceed 50")
        return value

    def validate(self, data):
        # Validate rates
        if data.get("hourly_rate") and data.get("daily_rate"):
            if data["hourly_rate"] * 8 < data["daily_rate"]:
                raise serializers.ValidationError(
                    "Daily rate seems too high compared to hourly rate"
                )
        return data


class CustomerProfileSerializer(serializers.ModelSerializer):
    user = UserShortSerializer(read_only=True)
    full_name = serializers.CharField(source="user.full_name", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)

    # FIX: Country handling
    country_display = serializers.SerializerMethodField()
    city_name = serializers.CharField(
        source="city.name", read_only=True, allow_null=True
    )

    recent_reviews = serializers.SerializerMethodField()
    review_statistics = serializers.SerializerMethodField()

    class Meta:
        model = CustomerProfile
        fields = [
            "id",
            "user",
            "full_name",
            "email",
            "country",
            "country_display",
            "city",
            "city_name",
            "professional_bio",
            "years_of_experience",
            "service_types",
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
            "verification_status",
            "verification_date",
            "total_bookings",
            "total_reviews",
            "average_rating",
            "is_verified",
            "created_at",
            "updated_at",
        ]

    def get_country_display(self, obj):
        if obj.country:
            return {
                "code": str(obj.country.code),
                "name": str(obj.country.name),
            }
        return None

    def get_recent_reviews(self, obj):
        reviews = (
            Review.objects.filter(customer=obj, is_published=True)
            .exclude(rating__isnull=True, comment="")
            .select_related("client_profile__user")
            .order_by("-created_at")[:5]
        )

        return ReviewForCustomerSerializer(
            reviews, many=True, context=self.context
        ).data

    def get_review_statistics(self, obj):
        # OPTIMIZED: Single query with aggregation
        stats = Review.objects.filter(
            customer=obj, is_published=True, rating__isnull=False
        ).aggregate(
            total=Count("id"),
            rating_1=Count("id", filter=Q(rating=1)),
            rating_2=Count("id", filter=Q(rating=2)),
            rating_3=Count("id", filter=Q(rating=3)),
            rating_4=Count("id", filter=Q(rating=4)),
            rating_5=Count("id", filter=Q(rating=5)),
            with_comments=Count("id", filter=~Q(comment="")),
        )

        total = stats["total"]
        distribution = {str(i): stats[f"rating_{i}"] for i in range(1, 6)}

        if total > 0:
            percentages = {
                k: round((v / total) * 100, 1) for k, v in distribution.items()
            }
            recommendation_rate = round(
                ((distribution["4"] + distribution["5"]) / total) * 100, 1
            )
        else:
            percentages = {str(i): 0 for i in range(1, 6)}
            recommendation_rate = 0

        return {
            "total_reviews": total,
            "average_rating": float(obj.average_rating or 0),
            "rating_distribution": distribution,
            "rating_percentages": percentages,
            "with_comments": stats["with_comments"],
            "recommendation_rate": recommendation_rate,
        }


class CustomerPortfolioPublicSerializer(serializers.ModelSerializer):
    user_info = serializers.SerializerMethodField()
    portfolio_items = serializers.SerializerMethodField()
    all_reviews = serializers.SerializerMethodField()
    review_statistics = serializers.SerializerMethodField()
    country_display = serializers.SerializerMethodField()

    class Meta:
        model = CustomerProfile
        fields = [
            "id",
            "user_info",
            "professional_bio",
            "years_of_experience",
            "service_types",
            "languages",
            "country",
            "country_display",
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
            "avatar": (
                self.context["request"].build_absolute_uri(obj.user.avatar.url)
                if obj.user.avatar
                else None
            ),
            "bio": obj.user.bio,
            "member_since": obj.user.created_at.year,
        }

    def get_country_display(self, obj):
        if obj.country:
            return {
                "code": str(obj.country.code),
                "name": str(obj.country.name),
            }
        return None

    def get_portfolio_items(self, obj):
        # FIX: Direct serialization without circular import
        items = obj.portfolio_set.all().order_by("order", "-created_at")
        return [
            {
                "id": item.id,
                "image": (
                    self.context["request"].build_absolute_uri(item.image.url)
                    if item.image
                    else None
                ),
                "title": item.title,
                "description": item.description,
                "order": item.order,
            }
            for item in items
        ]

    def get_all_reviews(self, obj):
        limit = min(
            int(self.context["request"].query_params.get("review_limit", 10)), 50
        )

        reviews = (
            Review.objects.filter(customer=obj, is_published=True)
            .exclude(rating__isnull=True, comment="")
            .select_related("client_profile__user")
            .order_by("-created_at")[:limit]
        )

        return ReviewForCustomerSerializer(
            reviews, many=True, context=self.context
        ).data

    def get_review_statistics(self, obj):
        # Reuse optimized method
        return CustomerProfileSerializer.get_review_statistics(self, obj)


# Other serializers remain mostly the same but with fixes
class PortfolioSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(
        source="customer.user.full_name", read_only=True
    )
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Portfolio
        fields = [
            "id",
            "customer",
            "customer_name",
            "image",
            "image_url",
            "title",
            "description",
            "order",
            "created_at",
        ]
        read_only_fields = ["id", "customer", "created_at"]

    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.image.url)
        return None


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
