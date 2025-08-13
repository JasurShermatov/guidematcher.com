# apps/common/validators.py
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from django.core.validators import RegexValidator
import magic


def validate_file_size(file, max_size_mb=5):
    file_size = file.size
    max_size = max_size_mb * 1024 * 1024

    if file_size > max_size:
        raise ValidationError(
            _(
                "File size cannot exceed %(max_size)s MB. Current size: %(current_size).2f MB"
            ),
            params={"max_size": max_size_mb, "current_size": file_size / (1024 * 1024)},
        )


def validate_image_file(file):

    validate_file_size(file, max_size_mb=5)

    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    file_mime = magic.from_buffer(file.read(1024), mime=True)
    file.seek(0)

    if file_mime not in allowed_types:
        raise ValidationError(_("Invalid file type. Allowed types: JPEG, PNG, WebP"))


def validate_document_file(file):

    validate_file_size(file, max_size_mb=25)

    allowed_types = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "image/jpeg",
        "image/jpg",
        "image/png",
    ]

    file_mime = magic.from_buffer(file.read(1024), mime=True)
    file.seek(0)

    if file_mime not in allowed_types:
        raise ValidationError(
            _("Invalid file type. Allowed types: PDF, DOC, DOCX, JPEG, PNG")
        )


def validate_phone_number(value):
    phone_regex = RegexValidator(
        regex=r"^\+?1?\d{9,15}$",
        message=_(
            "Phone number must be entered in the format: '+999999999'. Up to 15 digits allowed."
        ),
    )
    phone_regex(value)


def validate_username(value):
    username_regex = RegexValidator(
        regex=r"^[\w.@+-]+$",
        message=_(
            "Username may only contain letters, numbers, and @/./+/-/_ characters."
        ),
    )
    username_regex(value)


def validate_positive_decimal(value):
    if value < 0:
        raise ValidationError(_("Value must be positive"), params={"value": value})


def validate_rating(value):
    if value < 1 or value > 5:
        raise ValidationError(
            _("Rating must be between 1 and 5"), params={"value": value}
        )


def validate_future_date(value):
    from django.utils import timezone

    if value < timezone.now().date():
        raise ValidationError(_("Date cannot be in the past"), params={"value": value})


def validate_age(date_of_birth):
    from datetime import date

    today = date.today()
    age = (
        today.year
        - date_of_birth.year
        - ((today.month, today.day) < (date_of_birth.month, date_of_birth.day))
    )

    if age < 18:
        raise ValidationError(_("You must be at least 18 years old"))


def validate_password_strength(password):
    if len(password) < 8:
        raise ValidationError(_("Password must be at least 8 characters long"))

    if not any(char.isdigit() for char in password):
        raise ValidationError(_("Password must contain at least one digit"))

    if not any(char.isupper() for char in password):
        raise ValidationError(_("Password must contain at least one uppercase letter"))

    if not any(char.islower() for char in password):
        raise ValidationError(_("Password must contain at least one lowercase letter"))


def validate_coordinates(latitude, longitude):
    if latitude < -90 or latitude > 90:
        raise ValidationError(_("Latitude must be between -90 and 90 degrees"))

    if longitude < -180 or longitude > 180:
        raise ValidationError(_("Longitude must be between -180 and 180 degrees"))
