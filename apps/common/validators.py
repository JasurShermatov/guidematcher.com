# apps/common/validators.py

from django.core.exceptions import ValidationError
import re


def validate_iso_alpha3(code):
    """
    Validate ISO 3166-1 alpha-3 country code (e.g., USA, UZB)
    """
    if not code or not re.match(r"^[A-Z]{3}$", code):
        raise ValidationError(
            "Mamlakat kodi 3 harfdan iborat bo'lishi kerak (ISO 3166-1 alpha-3)."
        )
    return code


def validate_iso_language(code):
    """
    Validate ISO 639-1 language code (e.g., en, uz)
    """
    if not code or not re.match(r"^[a-z]{2}$", code):
        raise ValidationError("Til kodi 2 harfdan iborat bo'lishi kerak (ISO 639-1).")
    return code


def validate_latitude(value):
    """
    Validate latitude (-90 to 90 degrees)
    """
    if value is not None and (value < -90 or value > 90):
        raise ValidationError("Kenglik -90 va 90 daraja orasida bo'lishi kerak.")
    return value


def validate_longitude(value):
    """
    Validate longitude (-180 to 180 degrees)
    """
    if value is not None and (value < -180 or value > 180):
        raise ValidationError("Uzunlik -180 va 180 daraja orasida bo'lishi kerak.")
    return value


def validate_phone_code(code):
    """
    Validate phone code (e.g., +998)
    """
    if code and not re.match(r"^\+\d{1,4}$", code):
        raise ValidationError(
            "Telefon kodi '+' bilan boshlanishi va raqamlardan iborat bo'lishi kerak."
        )
    return code
