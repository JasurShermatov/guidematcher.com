# apps/profiles/apps.py
from django.apps import AppConfig


class ProfilesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.profiles"

    def ready(self):
        try:
            import apps.profiles.signals  # Signal import

            print("✅ Profiles signals yuklandi")  # Debug uchun
        except Exception as e:
            print(f"❌ Signal yuklashda xatolik: {e}")  # Nuqta o'chirildi
