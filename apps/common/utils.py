# apps/common/utils.py

import random
import string
import hashlib
from datetime import timedelta
from django.utils import timezone
from django.utils.text import slugify
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags
import requests


def generate_random_code(length=6, digits_only=True):
    """Generate random code for verification"""
    if digits_only:
        return "".join(random.choices(string.digits, k=length))
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=length))


def generate_unique_slug(model_class, base_slug, instance=None):
    """Generate unique slug for a model"""
    slug = slugify(base_slug)
    unique_slug = slug
    num = 1

    while (
        model_class.objects.filter(slug=unique_slug)
        .exclude(pk=instance.pk if instance else None)
        .exists()
    ):
        unique_slug = f"{slug}-{num}"
        num += 1

    return unique_slug


def get_client_ip(request):
    """Get client IP address from request"""
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        ip = x_forwarded_for.split(",")[0]
    else:
        ip = request.META.get("REMOTE_ADDR")
    return ip


def get_user_agent(request):
    """Get user agent from request"""
    return request.META.get("HTTP_USER_AGENT", "")


def mask_email(email):
    """Mask email address for privacy"""
    username, domain = email.split("@")
    if len(username) <= 2:
        masked_username = username[0] + "*"
    else:
        masked_username = username[0] + "*" * (len(username) - 2) + username[-1]
    return f"{masked_username}@{domain}"


def mask_phone(phone):
    """Mask phone number for privacy"""
    if len(phone) <= 6:
        return "*" * len(phone)
    return phone[:3] + "*" * (len(phone) - 6) + phone[-3:]


def calculate_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two coordinates in kilometers"""
    from math import radians, sin, cos, sqrt, atan2

    R = 6371  # Earth's radius in kilometers

    lat1 = radians(float(lat1))
    lon1 = radians(float(lon1))
    lat2 = radians(float(lat2))
    lon2 = radians(float(lon2))

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))

    return R * c


def send_email_notification(
    recipient_email, subject, template_name, context, from_email=None
):
    """Send email notification using template"""
    if not from_email:
        from_email = settings.DEFAULT_FROM_EMAIL

    # Render HTML and text content
    html_content = render_to_string(template_name, context)
    text_content = strip_tags(html_content)

    # Send email
    send_mail(
        subject=subject,
        message=text_content,
        from_email=from_email,
        recipient_list=[recipient_email],
        html_message=html_content,
        fail_silently=False,
    )


def resize_image(image_field, max_width=1200, max_height=1200):
    """Resize image to maximum dimensions while maintaining aspect ratio"""
    from PIL import Image
    from io import BytesIO
    from django.core.files.uploadedfile import InMemoryUploadedFile

    img = Image.open(image_field)

    # Convert RGBA to RGB if necessary
    if img.mode == "RGBA":
        rgb_img = Image.new("RGB", img.size, (255, 255, 255))
        rgb_img.paste(img, mask=img.split()[3])
        img = rgb_img

    # Calculate new dimensions
    img.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)

    # Save to BytesIO
    output = BytesIO()
    img.save(output, format="JPEG", quality=85, optimize=True)
    output.seek(0)

    # Create new InMemoryUploadedFile
    return InMemoryUploadedFile(
        output,
        "ImageField",
        f"{image_field.name.split('.')[0]}.jpg",
        "image/jpeg",
        output.getbuffer().nbytes,
        None,
    )


def get_currency_exchange_rate(from_currency, to_currency="USD"):
    """Get currency exchange rate (placeholder - implement with real API)"""
    # This is a placeholder. In production, use a real currency API
    # like exchangerate-api.com, fixer.io, etc.
    exchange_rates = {
        "USD": 1.0,
        "EUR": 0.85,
        "GBP": 0.73,
        "UZS": 12400.0,
        "RUB": 90.0,
    }

    if from_currency == to_currency:
        return 1.0

    # Convert to USD first, then to target currency
    from_rate = exchange_rates.get(from_currency, 1.0)
    to_rate = exchange_rates.get(to_currency, 1.0)

    return to_rate / from_rate


def format_currency(amount, currency="USD"):
    """Format currency for display"""
    currency_symbols = {
        "USD": "$",
        "EUR": "€",
        "GBP": "£",
        "UZS": "so'm",
        "RUB": "₽",
    }

    symbol = currency_symbols.get(currency, currency)

    if currency in ["USD", "EUR", "GBP"]:
        return f"{symbol}{amount:,.2f}"
    else:
        return f"{amount:,.0f} {symbol}"


def generate_verification_url(user, token):
    """Generate email verification URL"""
    from django.urls import reverse
    from django.contrib.sites.models import Site

    current_site = Site.objects.get_current()
    path = reverse("auth:verify-email", kwargs={"token": token})

    return f"https://{current_site.domain}{path}"


def create_thumbnail(image_field, size=(300, 300)):
    """Create thumbnail from image"""
    from PIL import Image
    from io import BytesIO
    from django.core.files.base import ContentFile

    img = Image.open(image_field)
    img.thumbnail(size, Image.Resampling.LANCZOS)

    thumb_io = BytesIO()
    img.save(thumb_io, format="JPEG", quality=85)

    thumbnail = ContentFile(thumb_io.getvalue())
    return thumbnail


def get_date_range_filter(period):
    """Get date range for filtering"""
    today = timezone.now().date()

    if period == "today":
        start_date = today
        end_date = today
    elif period == "yesterday":
        start_date = today - timedelta(days=1)
        end_date = today - timedelta(days=1)
    elif period == "this_week":
        start_date = today - timedelta(days=today.weekday())
        end_date = today
    elif period == "last_week":
        start_date = today - timedelta(days=today.weekday() + 7)
        end_date = today - timedelta(days=today.weekday() + 1)
    elif period == "this_month":
        start_date = today.replace(day=1)
        end_date = today
    elif period == "last_month":
        first_day_this_month = today.replace(day=1)
        last_day_last_month = first_day_this_month - timedelta(days=1)
        start_date = last_day_last_month.replace(day=1)
        end_date = last_day_last_month
    elif period == "this_year":
        start_date = today.replace(month=1, day=1)
        end_date = today
    else:
        start_date = None
        end_date = None

    return start_date, end_date


def sanitize_filename(filename):
    """Sanitize filename for safe storage"""
    import re

    # Remove any path components
    filename = os.path.basename(filename)

    # Replace spaces with underscores
    filename = filename.replace(" ", "_")

    # Remove any non-alphanumeric characters except dots, hyphens, and underscores
    filename = re.sub(r"[^\w\.-]", "", filename)

    # Ensure filename is not empty
    if not filename:
        filename = "unnamed_file"

    return filename
