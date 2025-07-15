from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from rangefilter.filters import DateRangeFilter

from .models import Country, City, Language, ServiceType


@admin.register(Country)
class CountryAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "code",
        "name",
        "flag",
        "is_active",
        "created_at",
        "updated_at",
    )
    list_filter = ("is_active", ("created_at", DateRangeFilter))
    search_fields = ("code", "name")
    readonly_fields = ("id", "created_at", "updated_at")
    ordering = ("name",)

    fieldsets = (
        (_("Basic Info"), {"fields": ("code", "name", "flag", "is_active")}),
        (
            _("System Meta"),
            {"classes": ("collapse",), "fields": ("id", "created_at", "updated_at")},
        ),
    )


@admin.register(City)
class CityAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "country", "is_active", "created_at", "updated_at")
    list_filter = ("country", "is_active", ("created_at", DateRangeFilter))
    search_fields = ("name", "country__name")
    autocomplete_fields = ["country"]
    readonly_fields = ("id", "created_at", "updated_at")
    ordering = ("name",)

    fieldsets = (
        (_("Basic Info"), {"fields": ("name", "country", "is_active")}),
        (
            _("System Meta"),
            {"classes": ("collapse",), "fields": ("id", "created_at", "updated_at")},
        ),
    )


@admin.register(Language)
class LanguageAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "code",
        "name",
        "native_name",
        "is_active",
        "created_at",
        "updated_at",
    )
    list_filter = ("is_active", ("created_at", DateRangeFilter))
    search_fields = ("code", "name", "native_name")
    readonly_fields = ("id", "created_at", "updated_at")
    ordering = ("name",)

    fieldsets = (
        (_("Basic Info"), {"fields": ("code", "name", "native_name", "is_active")}),
        (
            _("System Meta"),
            {"classes": ("collapse",), "fields": ("id", "created_at", "updated_at")},
        ),
    )


@admin.register(ServiceType)
class ServiceTypeAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "description",
        "icon",
        "is_active",
        "order",
        "created_at",
        "updated_at",
    )
    list_filter = ("is_active", ("created_at", DateRangeFilter))
    search_fields = ("name", "description")
    readonly_fields = ("id", "created_at", "updated_at")
    ordering = ("order", "name")

    fieldsets = (
        (
            _("Basic Info"),
            {"fields": ("name", "description", "icon", "is_active", "order")},
        ),
        (
            _("System Meta"),
            {"classes": ("collapse",), "fields": ("id", "created_at", "updated_at")},
        ),
    )
