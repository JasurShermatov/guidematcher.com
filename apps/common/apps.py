# apps/common/apps.py

from django.apps import AppConfig


class CommonConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.common"
    verbose_name = "Common"

    def ready(self):
        try:
            import apps.common.signals  # Import signals if any exist
        except ImportError:
            pass
