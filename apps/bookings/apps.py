# apps/bookings/apps.py

from django.apps import AppConfig


class BookingsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.bookings"
    verbose_name = "Bookings"

    def ready(self):
        try:
            import apps.bookings.signals  # Import signals if any exist
        except ImportError:
            pass
