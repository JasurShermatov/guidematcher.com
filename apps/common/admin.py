# apps/common/admin.py

from django.contrib import admin
from .models import Country, City, Service, Language


@admin.register(Country)
class CountryAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "phone_code", "is_active", "created_at")
    list_filter = ("is_active", "created_at")
    search_fields = ("name", "code", "phone_code")
    ordering = ("name",)
    readonly_fields = ("created_at", "updated_at")
    list_per_page = 20

    class Media:
        css = {"all": ("css/admin/common.css",)}  # Optional custom CSS


@admin.register(City)
class CityAdmin(admin.ModelAdmin):
    list_display = ("name", "country", "is_popular", "is_active", "created_at")
    list_filter = ("country", "is_popular", "is_active", "created_at")
    search_fields = ("name", "country__name")
    ordering = ("name",)
    readonly_fields = ("created_at", "updated_at")
    list_per_page = 20

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("country")


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ("name", "icon", "is_active", "created_at")
    list_filter = ("is_active", "created_at")
    search_fields = ("name", "description")
    ordering = ("name",)
    readonly_fields = ("created_at", "updated_at")
    list_per_page = 20


@admin.register(Language)
class LanguageAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "is_active", "created_at")
    list_filter = ("is_active", "created_at")
    search_fields = ("name", "code")
    ordering = ("name",)
    readonly_fields = ("created_at", "updated_at")
    list_per_page = 20
