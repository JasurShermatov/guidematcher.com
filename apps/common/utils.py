# apps/common/utils.py

import re
import logging
from django.utils.text import slugify
from .models import Country, City

logger = logging.getLogger(__name__)


def sanitize_string(value):
    """
    Sanitize a string by removing special characters and normalizing spaces
    """
    if not value:
        return value
    try:
        # Remove special characters, keep alphanumeric and spaces
        cleaned = re.sub(r"[^\w\s-]", "", value)
        # Normalize spaces and convert to lowercase
        cleaned = " ".join(cleaned.split()).lower()
        return cleaned
    except Exception as e:
        logger.error(f"Error sanitizing string: {str(e)}")
        return value


def format_location(city, country):
    """
    Format city and country into a consistent string
    """
    try:
        return f"{city.name}, {country.name}" if city and country else ""
    except Exception as e:
        logger.error(f"Error formatting location: {str(e)}")
        return ""


def get_popular_cities(limit=10):
    """
    Get a list of popular cities
    """
    try:
        return City.objects.filter(is_popular=True, is_active=True).select_related(
            "country"
        )[:limit]
    except Exception as e:
        logger.error(f"Error getting popular cities: {str(e)}")
        return City.objects.none()


def get_country_by_code(code):
    """
    Get country by ISO code
    """
    try:
        return Country.objects.get(code=code, is_active=True)
    except Country.DoesNotExist:
        logger.warning(f"Country with code {code} not found")
        return None
    except Exception as e:
        logger.error(f"Error getting country by code: {str(e)}")
        return None
