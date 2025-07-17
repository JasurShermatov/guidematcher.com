# apps/common/admin.py
from django.contrib import admin
from django.utils.translation import gettext_lazy as _

# Faqat built-in filterdan foydalanamiz (rangefilter yo'q)
from django.contrib.admin import DateFieldListFilter

from .models import Country, City, Language, ServiceType


# ── umumiy admin actions ─────────────────────────────────────────────
@admin.action(description=_("Mark selected items as active"))
def make_active(modeladmin, request, queryset):
    queryset.update(is_active=True)


@admin.action(description=_("Mark selected items as inactive"))
def make_inactive(modeladmin, request, queryset):
    queryset.update(is_active=False)


# ── Country ─────────────────────────────────────────────────────────
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
    list_filter = (
        "is_active",
        ("created_at", DateFieldListFilter),
    )
    search_fields = ("code", "name")
    readonly_fields = ("id", "created_at", "updated_at")
    ordering = ("name",)
    list_per_page = 50
    actions = [make_active, make_inactive]

    fieldsets = (
        (_("Basic Info"), {"fields": ("code", "name", "flag", "is_active")}),
        (
            _("System Meta"),
            {
                "classes": ("collapse",),
                "fields": ("id", "created_at", "updated_at"),
            },
        ),
    )

    def save_model(self, request, obj, form, change):
        if obj.code:
            obj.code = obj.code.upper()
        super().save_model(request, obj, form, change)


# ── City ────────────────────────────────────────────────────────────
@admin.register(City)
class CityAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "country", "is_active", "created_at", "updated_at")
    list_filter = (
        "country",
        "is_active",
        ("created_at", DateFieldListFilter),
    )
    search_fields = ("name", "country__name", "country__code")
    autocomplete_fields = ["country"]
    readonly_fields = ("id", "created_at", "updated_at")
    ordering = ("name",)
    list_per_page = 50
    actions = [make_active, make_inactive]

    fieldsets = (
        (_("Basic Info"), {"fields": ("name", "country", "is_active")}),
        (
            _("System Meta"),
            {
                "classes": ("collapse",),
                "fields": ("id", "created_at", "updated_at"),
            },
        ),
    )

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related("country")


# ── Language ───────────────────────────────────────────────────────
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
    list_filter = (
        "is_active",
        ("created_at", DateFieldListFilter),
    )
    search_fields = ("code", "name", "native_name")
    readonly_fields = ("id", "created_at", "updated_at")
    ordering = ("name",)
    list_per_page = 50
    actions = [make_active, make_inactive]

    fieldsets = (
        (_("Basic Info"), {"fields": ("code", "name", "native_name", "is_active")}),
        (
            _("System Meta"),
            {
                "classes": ("collapse",),
                "fields": ("id", "created_at", "updated_at"),
            },
        ),
    )

    def save_model(self, request, obj, form, change):
        if obj.code:
            obj.code = obj.code.lower()
        super().save_model(request, obj, form, change)


# ── ServiceType ─────────────────────────────────────────────────────
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
    list_filter = (
        "is_active",
        ("created_at", DateFieldListFilter),
    )
    search_fields = ("name", "description")
    readonly_fields = ("id", "created_at", "updated_at")
    ordering = ("order", "name")
    list_per_page = 50
    actions = [make_active, make_inactive]

    fieldsets = (
        (
            _("Basic Info"),
            {"fields": ("name", "description", "icon", "is_active", "order")},
        ),
        (
            _("System Meta"),
            {
                "classes": ("collapse",),
                "fields": ("id", "created_at", "updated_at"),
            },
        ),
    )
