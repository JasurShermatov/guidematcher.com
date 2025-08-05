# apps/common/views.py

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Country, City, Service, Language
from .serializers import (
    CountrySerializer,
    CitySerializer,
    ServiceSerializer,
    LanguageSerializer,
)
from .pagination import StandardResultsSetPagination
from .permissions import IsAuthenticated
import logging

logger = logging.getLogger(__name__)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def country_list(request):
    """
    List all active countries or filter by name/code
    """
    try:
        queryset = Country.objects.filter(is_active=True)
        name = request.query_params.get("name")
        code = request.query_params.get("code")

        if name:
            queryset = queryset.filter(name__icontains=name)
        if code:
            queryset = queryset.filter(code__iexact=code)

        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(queryset, request)
        serializer = CountrySerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)
    except Exception as e:
        logger.error(f"Error listing countries: {str(e)}")
        return Response(
            {"detail": "Mamlakatlar ro'yxatini olishda xatolik yuz berdi"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def country_detail(request, country_id):
    """
    Retrieve details of a specific country
    """
    try:
        country = get_object_or_404(Country, id=country_id, is_active=True)
        serializer = CountrySerializer(country)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Error retrieving country {country_id}: {str(e)}")
        return Response(
            {"detail": "Mamlakat ma'lumotlarini olishda xatolik yuz berdi"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def city_list(request):
    """
    List all active cities or create a new city
    """
    if request.method == "GET":
        try:
            queryset = City.objects.filter(is_active=True).select_related("country")
            name = request.query_params.get("name")
            country_id = request.query_params.get("country_id")
            is_popular = request.query_params.get("is_popular")

            if name:
                queryset = queryset.filter(name__icontains=name)
            if country_id:
                queryset = queryset.filter(country__id=country_id)
            if is_popular:
                queryset = queryset.filter(is_popular=True)

            paginator = StandardResultsSetPagination()
            page = paginator.paginate_queryset(queryset, request)
            serializer = CitySerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)
        except Exception as e:
            logger.error(f"Error listing cities: {str(e)}")
            return Response(
                {"detail": "Shaharlar ro'yxatini olishda xatolik yuz berdi"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    elif request.method == "POST":
        try:
            serializer = CitySerializer(data=request.data, context={"request": request})
            if serializer.is_valid():
                serializer.save(created_by=request.user, updated_by=request.user)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error creating city: {str(e)}")
            return Response(
                {"detail": "Shahar yaratishda xatolik yuz berdi"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def city_detail(request, city_id):
    """
    Retrieve details of a specific city
    """
    try:
        city = get_object_or_404(City, id=city_id, is_active=True)
        serializer = CitySerializer(city)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Error retrieving city {city_id}: {str(e)}")
        return Response(
            {"detail": "Shahar ma'lumotlarini olishda xatolik yuz berdi"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def service_list(request):
    """
    List all active services or filter by name
    """
    try:
        queryset = Service.objects.filter(is_active=True)
        name = request.query_params.get("name")

        if name:
            queryset = queryset.filter(name__icontains=name)

        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(queryset, request)
        serializer = ServiceSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)
    except Exception as e:
        logger.error(f"Error listing services: {str(e)}")
        return Response(
            {"detail": "Xizmatlar ro'yxatini olishda xatolik yuz berdi"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def service_detail(request, service_id):
    """
    Retrieve details of a specific service
    """
    try:
        service = get_object_or_404(Service, id=service_id, is_active=True)
        serializer = ServiceSerializer(service)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Error retrieving service {service_id}: {str(e)}")
        return Response(
            {"detail": "Xizmat ma'lumotlarini olishda xatolik yuz berdi"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def language_list(request):
    """
    List all active languages or filter by name/code
    """
    try:
        queryset = Language.objects.filter(is_active=True)
        name = request.query_params.get("name")
        code = request.query_params.get("code")

        if name:
            queryset = queryset.filter(name__icontains=name)
        if code:
            queryset = queryset.filter(code__iexact=code)

        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(queryset, request)
        serializer = LanguageSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)
    except Exception as e:
        logger.error(f"Error listing languages: {str(e)}")
        return Response(
            {"detail": "Tillar ro'yxatini olishda xatolik yuz berdi"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def language_detail(request, language_id):
    """
    Retrieve details of a specific language
    """
    try:
        language = get_object_or_404(Language, id=language_id, is_active=True)
        serializer = LanguageSerializer(language)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Error retrieving language {language_id}: {str(e)}")
        return Response(
            {"detail": "Til ma'lumotlarini olishda xatolik yuz berdi"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
