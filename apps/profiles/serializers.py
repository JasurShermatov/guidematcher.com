# apps/profiles/serializers.py

from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import ClientProfile, GuideProfile, GuideLanguage, Portfolio, Favorite
from apps.common.models import City, Service, Language
from apps.accounts.serializers import UserSerializer

User = get_user_model()


class ClientProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for client profile
    """

    user = UserSerializer(read_only=True)

    class Meta:
        model = ClientProfile
        fields = [
            "user",
            "birth_date",
            "gender",
            "emergency_contact",
            "emergency_phone",
            "travel_preferences",
            "dietary_restrictions",
        ]


class GuideLanguageSerializer(serializers.ModelSerializer):
    """
    Serializer for guide languages
    """

    language_name = serializers.CharField(source="language.name", read_only=True)
    language_code = serializers.CharField(source="language.code", read_only=True)

    class Meta:
        model = GuideLanguage
        fields = ["id", "language", "language_name", "language_code", "proficiency"]


class PortfolioSerializer(serializers.ModelSerializer):
    """
    Serializer for guide portfolio
    """

    class Meta:
        model = Portfolio
        fields = ["id", "title", "description", "image_url", "order"]


class GuideProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for guide profile
    """

    user = UserSerializer(read_only=True)
    operating_cities = serializers.StringRelatedField(many=True, read_only=True)
    services = serializers.StringRelatedField(many=True, read_only=True)
    languages = GuideLanguageSerializer(many=True, read_only=True)
    portfolio = PortfolioSerializer(many=True, read_only=True, source="user.portfolio")

    # Additional computed fields
    total_reviews = serializers.SerializerMethodField()
    recent_reviews = serializers.SerializerMethodField()

    class Meta:
        model = GuideProfile
        fields = [
            "user",
            "experience_years",
            "hourly_rate",
            "daily_rate",
            "operating_cities",
            "work_schedule",
            "services",
            "languages",
            "is_verified",
            "verification_date",
            "profile_completion",
            "response_time_hours",
            "is_available",
            "last_active",
            "total_tours",
            "average_rating",
            "portfolio",
            "total_reviews",
            "recent_reviews",
        ]
        read_only_fields = [
            "is_verified",
            "verification_date",
            "total_tours",
            "average_rating",
            "last_active",
        ]

    def get_total_reviews(self, obj):
        """Get total number of reviews"""
        return obj.user.reviews_received.count()

    def get_recent_reviews(self, obj):
        """Get recent reviews for the guide"""
        from apps.reviews.serializers import ReviewSerializer

        recent_reviews = obj.user.reviews_received.filter(is_verified=True).order_by(
            "-created_at"
        )[:3]
        return ReviewSerializer(recent_reviews, many=True).data


class GuideProfileUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating guide profile
    """

    operating_cities = serializers.PrimaryKeyRelatedField(
        queryset=City.objects.all(), many=True, required=False
    )
    services = serializers.PrimaryKeyRelatedField(
        queryset=Service.objects.all(), many=True, required=False
    )

    class Meta:
        model = GuideProfile
        fields = [
            "experience_years",
            "hourly_rate",
            "daily_rate",
            "operating_cities",
            "work_schedule",
            "services",
            "response_time_hours",
            "is_available",
        ]

    def update(self, instance, validated_data):
        """Update guide profile with many-to-many fields"""
        operating_cities = validated_data.pop("operating_cities", None)
        services = validated_data.pop("services", None)

        # Update simple fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update many-to-many fields
        if operating_cities is not None:
            instance.operating_cities.set(operating_cities)
        if services is not None:
            instance.services.set(services)

        # Update profile completion
        instance.profile_completion = self._calculate_completion(instance)
        instance.save(update_fields=["profile_completion"])

        return instance

    def _calculate_completion(self, profile):
        """Calculate profile completion percentage"""
        completion = 0

        # Basic info (40%)
        if profile.user.bio:
            completion += 10
        if profile.user.profile_picture:
            completion += 10
        if profile.experience_years:
            completion += 10
        if profile.hourly_rate or profile.daily_rate:
            completion += 10

        # Location and services (30%)
        if profile.operating_cities.exists():
            completion += 15
        if profile.services.exists():
            completion += 15

        # Languages (20%)
        if profile.languages.exists():
            completion += 20

        # Portfolio (10%)
        if profile.user.portfolio.exists():
            completion += 10

        return min(completion, 100)


class GuideLanguageCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating guide languages
    """

    class Meta:
        model = GuideLanguage
        fields = ["language", "proficiency"]

    def create(self, validated_data):
        """Create guide language with current user"""
        validated_data["guide"] = self.context["request"].user
        return super().create(validated_data)


class PortfolioCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating portfolio items
    """

    class Meta:
        model = Portfolio
        fields = ["title", "description", "image_url", "order"]

    def create(self, validated_data):
        """Create portfolio item with current user"""
        validated_data["guide"] = self.context["request"].user
        return super().create(validated_data)


class FavoriteSerializer(serializers.ModelSerializer):
    """
    Serializer for favorites
    """

    guide_name = serializers.CharField(source="guide.full_name", read_only=True)
    city_name = serializers.CharField(source="city.name", read_only=True)

    class Meta:
        model = Favorite
        fields = ["id", "guide", "guide_name", "city", "city_name", "created_at"]
        read_only_fields = ["created_at"]


class GuideSearchSerializer(serializers.ModelSerializer):
    """
    Serializer for guide search results
    """

    user = UserSerializer(read_only=True)
    operating_cities = serializers.StringRelatedField(many=True, read_only=True)
    services = serializers.StringRelatedField(many=True, read_only=True)
    languages = serializers.SerializerMethodField()

    # Statistics
    total_reviews = serializers.SerializerMethodField()
    response_rate = serializers.SerializerMethodField()

    class Meta:
        model = GuideProfile
        fields = [
            "user",
            "experience_years",
            "hourly_rate",
            "daily_rate",
            "operating_cities",
            "services",
            "languages",
            "is_verified",
            "is_available",
            "total_tours",
            "average_rating",
            "response_time_hours",
            "total_reviews",
            "response_rate",
        ]

    def get_languages(self, obj):
        """Get languages with proficiency"""
        return [
            f"{lang.language.name} ({lang.proficiency})" for lang in obj.languages.all()
        ]

    def get_total_reviews(self, obj):
        """Get total reviews count"""
        return obj.user.reviews_received.filter(is_verified=True).count()

    def get_response_rate(self, obj):
        """Calculate response rate (placeholder - would need actual data)"""
        return 95  # This would be calculated based on actual response data
