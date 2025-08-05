from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, EmailVerification, LoginAttempt


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """
    Admin configuration for the User model
    """

    list_display = (
        "email",
        "first_name",
        "last_name",
        "role",
        "is_active",
        "is_verified",
        "is_staff",
        "date_joined",
    )
    list_filter = ("role", "is_active", "is_verified", "is_staff", "date_joined")
    search_fields = ("email", "first_name", "last_name")
    ordering = ("-date_joined",)
    readonly_fields = (
        "created_at",
        "updated_at",
        "date_joined",
        "last_login_ip",
        "failed_login_attempts",
    )
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        (
            "Personal Info",
            {
                "fields": (
                    "first_name",
                    "last_name",
                    "role",
                    "country",
                    "city",
                    "phone",
                    "profile_picture",
                    "bio",
                )
            },
        ),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_verified",
                    "is_staff",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        (
            "Important dates",
            {"fields": ("last_login", "date_joined", "created_at", "updated_at")},
        ),
        (
            "Security",
            {"fields": ("last_login_ip", "failed_login_attempts", "last_failed_login")},
        ),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "password1",
                    "password2",
                    "first_name",
                    "last_name",
                    "role",
                ),
            },
        ),
    )
    list_per_page = 20

    class Media:
        css = {"all": ("css/admin/users.css",)}  # Optional custom CSS


@admin.register(EmailVerification)
class EmailVerificationAdmin(admin.ModelAdmin):
    """
    Admin configuration for the EmailVerification model
    """

    list_display = ("user", "token", "is_used", "expires_at", "created_at")
    list_filter = ("is_used", "created_at")
    search_fields = ("user__email", "token")
    ordering = ("-created_at",)
    readonly_fields = ("created_at", "updated_at", "expires_at")
    list_per_page = 20

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("user")


@admin.register(LoginAttempt)
class LoginAttemptAdmin(admin.ModelAdmin):
    """
    Admin configuration for the LoginAttempt model
    """

    list_display = ("email", "ip_address", "success", "created_at")
    list_filter = ("success", "created_at")
    search_fields = ("email", "ip_address")
    ordering = ("-created_at",)
    readonly_fields = ("created_at", "updated_at")
    list_per_page = 20
