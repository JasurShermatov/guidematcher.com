from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Custom User model admin"""

    # User detail view
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        (
            _("Personal info"),
            {
                "fields": (
                    "first_name",
                    "last_name",
                    "full_name",
                    "country",
                    "country_name",
                    "avatar",
                    "bio",
                )
            },
        ),
        (
            _("Permissions"),
            {
                "fields": (
                    "role",
                    "is_active",
                    "is_staff",
                    "is_verified",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        (
            _("Important dates"),
            {"fields": ("date_joined", "last_login", "last_login_ip")},
        ),
    )

    # Add form
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "first_name",
                    "last_name",
                    "password1",
                    "password2",
                    "role",
                    "country",
                    "avatar",
                    "bio",
                    "is_active",
                    "is_verified",
                ),
            },
        ),
    )

    # List view
    list_display = (
        "email",
        "full_name",
        "role",
        "is_active",
        "is_staff",
        "is_verified",
        "is_superuser",
        "date_joined",
        "country_name",
    )
    list_filter = (
        "role",
        "is_active",
        "is_staff",
        "is_verified",
        "is_superuser",
        "country",
    )
    search_fields = (
        "email",
        "first_name",
        "last_name",
        "full_name",
        "country_name",
    )
    ordering = ("-date_joined",)
    filter_horizontal = ("groups", "user_permissions")
    readonly_fields = (
        "full_name",
        "country_name",
        "date_joined",
        "last_login",
        "last_login_ip",
    )
