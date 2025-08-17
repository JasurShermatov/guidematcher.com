# apps/accounts/admin.py

from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from django.urls import reverse
from django.db.models import Count, Q
from .models import VerificationCode, PasswordResetAttempt, LoginSession


@admin.register(VerificationCode)
class VerificationCodeAdmin(admin.ModelAdmin):
    """
    Admin configuration for VerificationCode model
    """

    list_display = [
        "email",
        "code_display",
        "code_type",
        "status_display",
        "attempts_display",
        "expires_at",
        "created_at",
    ]
    list_filter = ["code_type", "is_used", "expires_at", "created_at", "attempts"]
    search_fields = ["email", "code"]
    readonly_fields = ["code", "created_at", "updated_at", "used_at", "ip_address"]
    ordering = ["-created_at"]

    fieldsets = (
        ("Code Information", {"fields": ("email", "code", "code_type")}),
        ("Status", {"fields": ("is_used", "used_at", "attempts", "max_attempts")}),
        ("Expiration", {"fields": ("expires_at",)}),
        ("Security", {"fields": ("ip_address",), "classes": ("collapse",)}),
        (
            "Timestamps",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def code_display(self, obj):
        """Display code with masking for security"""
        if obj.code:
            return f"{obj.code[:2]}****"
        return "-"

    code_display.short_description = "Code"

    def status_display(self, obj):
        """Display status with color coding"""
        if obj.is_used:
            return format_html(
                '<span style="color: green; font-weight: bold;">✓ Used</span>'
            )
        elif obj.is_expired():
            return format_html(
                '<span style="color: red; font-weight: bold;">✗ Expired</span>'
            )
        elif obj.attempts >= obj.max_attempts:
            return format_html(
                '<span style="color: orange; font-weight: bold;">⚠ Max Attempts</span>'
            )
        else:
            return format_html(
                '<span style="color: blue; font-weight: bold;">⏳ Active</span>'
            )

    status_display.short_description = "Status"

    def attempts_display(self, obj):
        """Display attempts with progress bar style"""
        percentage = (obj.attempts / obj.max_attempts) * 100
        color = "green" if percentage < 50 else "orange" if percentage < 100 else "red"
        return format_html(
            '<div style="width: 100px; background-color: #f0f0f0; border-radius: 3px;">'
            '<div style="width: {}%; background-color: {}; height: 20px; border-radius: 3px; text-align: center; color: white; font-size: 12px; line-height: 20px;">'
            "{}/{}"
            "</div></div>",
            percentage,
            color,
            obj.attempts,
            obj.max_attempts,
        )

    attempts_display.short_description = "Attempts"

    def get_queryset(self, request):
        """Optimize queryset with annotations"""
        return super().get_queryset(request).select_related()

    def has_add_permission(self, request):
        """Disable manual adding of verification codes"""
        return False

    actions = ["cleanup_expired_codes", "mark_as_used"]

    def cleanup_expired_codes(self, request, queryset):
        """Admin action to cleanup expired codes"""
        expired_count = queryset.filter(expires_at__lt=timezone.now()).delete()[0]

        self.message_user(
            request, f"{expired_count} expired verification codes were deleted."
        )

    cleanup_expired_codes.short_description = "Delete expired codes"

    def mark_as_used(self, request, queryset):
        """Admin action to mark codes as used"""
        count = queryset.filter(is_used=False).update(
            is_used=True, used_at=timezone.now()
        )

        self.message_user(request, f"{count} verification codes were marked as used.")

    mark_as_used.short_description = "Mark as used"


@admin.register(PasswordResetAttempt)
class PasswordResetAttemptAdmin(admin.ModelAdmin):
    """
    Admin configuration for PasswordResetAttempt model
    """

    list_display = ["email", "ip_address", "success_display", "created_at", "user_link"]
    list_filter = ["success", "created_at"]
    search_fields = ["email", "ip_address"]
    readonly_fields = ["created_at", "updated_at"]
    ordering = ["-created_at"]

    fieldsets = (
        ("Attempt Information", {"fields": ("email", "ip_address", "success")}),
        (
            "Timestamps",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def success_display(self, obj):
        """Display success status with icons"""
        if obj.success:
            return format_html('<span style="color: green;">✓ Success</span>')
        else:
            return format_html('<span style="color: red;">✗ Failed</span>')

    success_display.short_description = "Success"

    def user_link(self, obj):
        """Link to user admin if user exists"""
        try:
            from django.contrib.auth import get_user_model

            User = get_user_model()
            user = User.objects.get(email=obj.email)
            url = reverse("admin:users_user_change", args=[user.pk])
            return format_html('<a href="{}">View User</a>', url)
        except:
            return "-"

    user_link.short_description = "User"

    def has_add_permission(self, request):
        """Disable manual adding of password reset attempts"""
        return False

    def get_queryset(self, request):
        """Add custom annotations for better performance"""
        return super().get_queryset(request)


@admin.register(LoginSession)
class LoginSessionAdmin(admin.ModelAdmin):
    """
    Admin configuration for LoginSession model
    """

    list_display = [
        "user_link",
        "session_key_display",
        "ip_address",
        "device_info",
        "status_display",
        "created_at",
        "logged_out_at",
    ]
    list_filter = ["is_active", "device_type", "browser", "os", "created_at"]
    search_fields = [
        "user__email",
        "user__first_name",
        "user__last_name",
        "ip_address",
        "session_key",
    ]
    readonly_fields = ["session_key", "user_agent", "created_at", "updated_at"]
    ordering = ["-created_at"]

    fieldsets = (
        ("Session Information", {"fields": ("user", "session_key", "is_active")}),
        ("Connection Details", {"fields": ("ip_address", "user_agent")}),
        (
            "Device Information",
            {"fields": ("device_type", "browser", "os"), "classes": ("collapse",)},
        ),
        (
            "Timestamps",
            {
                "fields": ("created_at", "logged_out_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )

    def user_link(self, obj):
        """Link to user admin"""
        url = reverse("admin:users_user_change", args=[obj.user.pk])
        return format_html('<a href="{}">{}</a>', url, obj.user.email)

    user_link.short_description = "User"

    def session_key_display(self, obj):
        """Display session key with masking"""
        if obj.session_key:
            return f"{obj.session_key[:8]}..."
        return "-"

    session_key_display.short_description = "Session Key"

    def device_info(self, obj):
        """Display device information in a compact format"""
        info_parts = []
        if obj.device_type:
            info_parts.append(obj.device_type)
        if obj.browser:
            info_parts.append(obj.browser)
        if obj.os:
            info_parts.append(obj.os)

        return " | ".join(info_parts) if info_parts else "-"

    device_info.short_description = "Device Info"

    def status_display(self, obj):
        """Display session status with color coding"""
        if obj.is_active:
            return format_html(
                '<span style="color: green; font-weight: bold;">🟢 Active</span>'
            )
        else:
            return format_html(
                '<span style="color: red; font-weight: bold;">🔴 Inactive</span>'
            )

    status_display.short_description = "Status"

    def get_queryset(self, request):
        """Optimize queryset"""
        return super().get_queryset(request).select_related("user")

    actions = ["logout_sessions", "delete_inactive_sessions"]

    def logout_sessions(self, request, queryset):
        """Admin action to logout sessions"""
        count = 0
        for session in queryset.filter(is_active=True):
            session.logout()
            count += 1

        self.message_user(request, f"{count} sessions were logged out.")

    logout_sessions.short_description = "Logout selected sessions"

    def delete_inactive_sessions(self, request, queryset):
        """Admin action to delete inactive sessions"""
        count = queryset.filter(is_active=False).delete()[0]

        self.message_user(request, f"{count} inactive sessions were deleted.")

    delete_inactive_sessions.short_description = "Delete inactive sessions"


# Custom admin site configuration
class AccountsAdminConfig:
    """
    Additional admin configuration for accounts app
    """

    @staticmethod
    def get_admin_stats():
        """Get statistics for admin dashboard"""
        from django.utils import timezone
        from datetime import timedelta

        now = timezone.now()
        today = now.date()
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)

        stats = {
            "verification_codes": {
                "total": VerificationCode.objects.count(),
                "today": VerificationCode.objects.filter(
                    created_at__date=today
                ).count(),
                "week": VerificationCode.objects.filter(
                    created_at__gte=week_ago
                ).count(),
                "active": VerificationCode.objects.filter(
                    is_used=False, expires_at__gt=now
                ).count(),
            },
            "password_resets": {
                "total": PasswordResetAttempt.objects.count(),
                "today": PasswordResetAttempt.objects.filter(
                    created_at__date=today
                ).count(),
                "week": PasswordResetAttempt.objects.filter(
                    created_at__gte=week_ago
                ).count(),
                "success_rate": PasswordResetAttempt.objects.filter(
                    created_at__gte=month_ago
                )
                .aggregate(
                    success_rate=Count("id", filter=Q(success=True))
                    * 100.0
                    / Count("id")
                )
                .get("success_rate", 0)
                or 0,
            },
            "login_sessions": {
                "total": LoginSession.objects.count(),
                "active": LoginSession.objects.filter(is_active=True).count(),
                "today": LoginSession.objects.filter(created_at__date=today).count(),
                "unique_users_today": LoginSession.objects.filter(
                    created_at__date=today
                )
                .values("user")
                .distinct()
                .count(),
            },
        }

        return stats


# Add custom admin views
def admin_dashboard_view(request):
    """Custom admin dashboard view with statistics"""
    from django.shortcuts import render

    stats = AccountsAdminConfig.get_admin_stats()

    context = {
        "title": "Accounts Dashboard",
        "stats": stats,
    }

    return render(request, "admin/accounts/dashboard.html", context)
