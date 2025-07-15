# apps/users/apps.py
from django.apps import AppConfig


class UsersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.users"

    def ready(self):
        # Signalsni import qilsak, ular ro‘yxatdan o‘tadi
        from . import signals  # noqa
