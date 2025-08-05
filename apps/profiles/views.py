# apps/profiles/views.py

from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.contrib.auth import get_user_model
from django.db.models import Q, Avg
from django_filters.rest_framework import DjangoFilterBackend
from .models import ClientProfile, GuideProfile, GuideLanguage, Portfolio, Favorite
from .serializers import (
    ClientProfileSerializer,
    GuideProfileSerializer,
    GuideProfileUpdateSerializer,
    GuideLanguageSerializer,
    GuideLanguageCreateSerializer,
    PortfolioSerializer,
    PortfolioCreateSerializer,
    FavoriteSerializer,
    GuideSearchSerializer,
)
from apps.common.models import City, Service, Language
import logging

User = get_user_model()
logger = logging.getLogger(__name__)


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


@api_view(["GET", "PUT", "PATCH"])
@permission_classes([permissions.IsAuthenticated])
def current_user_profile(request):
    """
    Get or update current user's profile
    """
    user = request.user

    if request.method == "GET":
        try:
            if user.role == "Guide":
                profile = GuideProfile.objects.get(user=user)
                serializer = GuideProfileSerializer(profile)
            else:
                profile = ClientProfile.objects.get(user=user)
                serializer = ClientProfileSerializer(profile)

            return Response(serializer.data)

        except (GuideProfile.DoesNotExist, ClientProfile.DoesNotExist):
            return Response(
                {"detail": "Profil topilmadi."}, status=status.HTTP_404_NOT_FOUND
            )

    elif request.method in ["PUT", "PATCH"]:
        try:
            if user.role == "Guide":
                profile = GuideProfile.objects.get(user=user)
                serializer = GuideProfileUpdateSerializer(
                    profile, data=request.data, partial=(request.method == "PATCH")
                )
            else:
                profile = ClientProfile.objects.get(user=user)
                serializer = ClientProfileSerializer(
                    profile, data=request.data, partial=(request.method == "PATCH")
                )

            if serializer.is_valid():
                serializer.save()
                logger.info(f"Profile updated for user {user.email}")
                return Response(serializer.data)

            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        except (GuideProfile.DoesNotExist, ClientProfile.DoesNotExist):
            return Response(
                {"detail": "Profil topilmadi."}, status=status.HTTP_404_NOT_FOUND
            )


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def user_profile_detail(request, user_id):
    """
    Get specific user's profile (public view)
    """
    try:
        user = User.objects.get(id=user_id, is_active=True)

        if user.role == "Guide":
            try:
                profile = GuideProfile.objects.get(user=user)
                serializer = GuideProfileSerializer(profile)
                return Response(serializer.data)
            except GuideProfile.DoesNotExist:
                return Response(
                    {"detail": "Gid profili topilmadi."},
                    status=status.HTTP_404_NOT_FOUND,
                )
        else:
            # For client profiles, return limited public info
            from apps.accounts.serializers import UserSerializer

            serializer = UserSerializer(user)
            return Response({"user": serializer.data, "type": "client"})

    except User.DoesNotExist:
        return Response(
            {"detail": "Foydalanuvchi topilmadi."}, status=status.HTTP_404_NOT_FOUND
        )


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def guide_search(request):
    """
    Search and filter guides
    """
    # Get query parameters
    location = request.GET.get("location")
    service = request.GET.get("service")
    min_rating = request.GET.get("min_rating")
    max_price = request.GET.get("max_price")
    language = request.GET.get("language")
    availability = request.GET.get("availability")
    experience = request.GET.get("experience")
    search = request.GET.get("search")

    # Base queryset
    queryset = (
        GuideProfile.objects.filter(user__is_active=True, user__role="Guide")
        .select_related("user")
        .prefetch_related("operating_cities", "services", "languages")
    )

    # Apply filters
    if location:
        queryset = queryset.filter(
            Q(operating_cities__name__icontains=location)
            | Q(user__country__icontains=location)
            | Q(user__city__icontains=location)
        )

    if service:
        queryset = queryset.filter(services__name__icontains=service)

    if min_rating:
        try:
            min_rating = float(min_rating)
            queryset = queryset.filter(average_rating__gte=min_rating)
        except (ValueError, TypeError):
            pass

    if max_price:
        try:
            max_price = float(max_price)
            queryset = queryset.filter(
                Q(daily_rate__lte=max_price) | Q(daily_rate__isnull=True)
            )
        except (ValueError, TypeError):
            pass

    if language:
        queryset = queryset.filter(languages__language__name__icontains=language)

    if availability == "true":
        queryset = queryset.filter(is_available=True)

    if experience:
        queryset = queryset.filter(experience_years=experience)

    if search:
        queryset = queryset.filter(
            Q(user__first_name__icontains=search)
            | Q(user__last_name__icontains=search)
            | Q(user__bio__icontains=search)
            | Q(services__name__icontains=search)
        )

    # Remove duplicates and order
    queryset = queryset.distinct().order_by("-average_rating", "-total_tours")

    # Paginate results
    paginator = StandardResultsSetPagination()
    page = paginator.paginate_queryset(queryset, request)

    if page is not None:
        serializer = GuideSearchSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    serializer = GuideSearchSerializer(queryset, many=True)
    return Response(serializer.data)


@api_view(["GET", "POST"])
@permission_classes([permissions.IsAuthenticated])
def guide_languages(request):
    """
    Get or add guide languages
    """
    if request.user.role != "Guide":
        return Response(
            {"detail": "Faqat gidlar tillarni qo'sha oladi."},
            status=status.HTTP_403_FORBIDDEN,
        )

    if request.method == "GET":
        languages = GuideLanguage.objects.filter(guide=request.user)
        serializer = GuideLanguageSerializer(languages, many=True)
        return Response(serializer.data)

    elif request.method == "POST":
        serializer = GuideLanguageCreateSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["PUT", "DELETE"])
@permission_classes([permissions.IsAuthenticated])
def guide_language_detail(request, language_id):
    """
    Update or delete guide language
    """
    try:
        language = GuideLanguage.objects.get(id=language_id, guide=request.user)
    except GuideLanguage.DoesNotExist:
        return Response({"detail": "Til topilmadi."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "PUT":
        serializer = GuideLanguageSerializer(language, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == "DELETE":
        language.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET", "POST"])
@permission_classes([permissions.IsAuthenticated])
def portfolio(request):
    """
    Get or add portfolio items
    """
    if request.user.role != "Guide":
        return Response(
            {"detail": "Faqat gidlar portfolio qo'sha oladi."},
            status=status.HTTP_403_FORBIDDEN,
        )

    if request.method == "GET":
        items = Portfolio.objects.filter(guide=request.user).order_by(
            "order", "created_at"
        )
        serializer = PortfolioSerializer(items, many=True)
        return Response(serializer.data)

    elif request.method == "POST":
        serializer = PortfolioCreateSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET", "PUT", "DELETE"])
@permission_classes([permissions.IsAuthenticated])
def portfolio_detail(request, item_id):
    """
    Get, update or delete portfolio item
    """
    try:
        item = Portfolio.objects.get(id=item_id, guide=request.user)
    except Portfolio.DoesNotExist:
        return Response(
            {"detail": "Portfolio elementi topilmadi."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if request.method == "GET":
        serializer = PortfolioSerializer(item)
        return Response(serializer.data)

    elif request.method == "PUT":
        serializer = PortfolioSerializer(item, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == "DELETE":
        item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET", "POST"])
@permission_classes([permissions.IsAuthenticated])
def favorites(request):
    """
    Get or add favorites
    """
    if request.method == "GET":
        favorites = Favorite.objects.filter(user=request.user).order_by("-created_at")
        serializer = FavoriteSerializer(favorites, many=True)
        return Response(serializer.data)

    elif request.method == "POST":
        serializer = FavoriteSerializer(data=request.data)
        if serializer.is_valid():
            # Check if already exists
            guide_id = serializer.validated_data.get("guide")
            city_id = serializer.validated_data.get("city")

            if guide_id:
                existing = Favorite.objects.filter(
                    user=request.user, guide=guide_id
                ).exists()
            else:
                existing = Favorite.objects.filter(
                    user=request.user, city=city_id
                ).exists()

            if existing:
                return Response(
                    {"detail": "Bu element allaqachon sevimlilarda."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Create favorite
            favorite = serializer.save(user=request.user)
            return Response(
                FavoriteSerializer(favorite).data, status=status.HTTP_201_CREATED
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["DELETE"])
@permission_classes([permissions.IsAuthenticated])
def favorite_detail(request, favorite_id):
    """
    Remove from favorites
    """
    try:
        favorite = Favorite.objects.get(id=favorite_id, user=request.user)
        favorite.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    except Favorite.DoesNotExist:
        return Response(
            {"detail": "Sevimli topilmadi."}, status=status.HTTP_404_NOT_FOUND
        )


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def popular_destinations(request):
    """
    Get popular destinations with guide counts
    """
    from django.db.models import Count

    popular_cities = (
        City.objects.filter(is_popular=True, is_active=True)
        .annotate(guide_count=Count("guideprofile__operating_cities", distinct=True))
        .filter(guide_count__gt=0)
        .order_by("-guide_count")[:10]
    )

    data = []
    for city in popular_cities:
        data.append(
            {
                "id": city.id,
                "name": f"{city.name}, {city.country.name}",
                "country": city.country.name,
                "guide_count": city.guide_count,
                "latitude": str(city.latitude) if city.latitude else None,
                "longitude": str(city.longitude) if city.longitude else None,
            }
        )

    return Response(data)
