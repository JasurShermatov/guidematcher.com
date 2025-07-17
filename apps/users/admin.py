from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, LoginAttempt


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        (
            "Personal info",
            {
                "fields": (
                    "first_name",
                    "last_name",
                    "phone",
                    "country",
                    "avatar",
                    "bio",
                )
            },
        ),
        (
            "Permissions",
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
        ("Important dates", {"fields": ("last_login", "date_joined", "last_login_ip")}),
        ("Social Auth", {"fields": ("google_id", "facebook_id", "apple_id")}),
    )
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
                    "is_active",
                    "is_staff",
                    "is_verified",
                    "country",
                ),
            },
        ),
    )
    list_display = (
        "email",
        "first_name",
        "last_name",
        "role",
        "is_active",
        "is_verified",
        "date_joined",
    )
    search_fields = ("email", "first_name", "last_name", "phone")
    list_filter = ("role", "is_active", "is_verified", "country")
    ordering = ("-date_joined",)
    readonly_fields = ("date_joined", "last_login_ip")


@admin.register(LoginAttempt)
class LoginAttemptAdmin(admin.ModelAdmin):
    list_display = (
        "email",
        "ip_address",
        "is_successful",
        "failure_reason",
        "created_at",
    )
    search_fields = ("email", "ip_address", "failure_reason")
    list_filter = ("is_successful",)
    readonly_fields = ("created_at",)
