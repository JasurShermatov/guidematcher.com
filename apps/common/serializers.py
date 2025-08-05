# apps/common/serializers.py

from rest_framework import serializers
from .models import Country, City, Service, Language


class CountrySerializer(serializers.ModelSerializer):
    """
    Serializer for Country model
    """

    class Meta:
        model = Country
        fields = ["id", "name", "code", "phone_code", "is_active", "created_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class CitySerializer(serializers.ModelSerializer):
    """
    Serializer for City model
    """

    country = CountrySerializer(read_only=True)
    country_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = City
        fields = [
            "id",
            "name",
            "country",
            "country_id",
            "latitude",
            "longitude",
            "is_popular",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_country_id(self, value):
        """
        Validate that the country exists
        """
        if not Country.objects.filter(id=value, is_active=True).exists():
            raise serializers.ValidationError("Mamlakat topilmadi yoki faol emas.")
        return value


class ServiceSerializer(serializers.ModelSerializer):
    """
    Serializer for Service model
    """

    class Meta:
        model = Service
        fields = ["id", "name", "description", "icon", "is_active", "created_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class LanguageSerializer(serializers.ModelSerializer):
    """
    Serializer for Language model
    """

    class Meta:
        model = Language
        fields = ["id", "name", "code", "is_active", "created_at"]
        read_only_fields = ["id", "created_at", "updated_at"]
