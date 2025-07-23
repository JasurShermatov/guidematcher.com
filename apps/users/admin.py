# apps/users/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from django.contrib.admin import SimpleListFilter
from .models import User


class RoleFilter(SimpleListFilter):
    """Custom role filter for admin"""
    title = "User Role"
    parameter_name = "role"


    def lookups(self, request, model_admin):
        return User.UserRole.choices

    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(role=self.value())
        return queryset


class CountryFilter(SimpleListFilter):
    """Custom country filter for admin"""

    title = "Country"
    parameter_name = "country"

    def lookups(self, request, model_admin):
        countries = (
            User.objects.exclude(country__isnull=True)
            .values_list("country__id", "country__name")
            .distinct()
        )
        return countries

    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(country__id=self.value())
        return queryset


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Optimized User Admin - Senior Developer Level"""

    # ═══ DISPLAY CONFIGURATION ═══
    list_display = (
        "get_user_info",
        "get_role_badge",
        "get_status_badges",
        "country_name",
        "date_joined_short",
        "get_actions",
    )

    list_display_links = ("get_user_info",)

    search_fields = ("email", "first_name", "last_name", "full_name", "country_name")

    list_filter = (
        RoleFilter,
        "is_active",
        "is_verified",
        "is_staff",
        CountryFilter,
        "date_joined",
    )

    list_per_page = 25
    ordering = ("-date_joined",)

    # ═══ FORM CONFIGURATION ═══
    fieldsets = (
        (
            "👤 Identity",
            {
                "fields": (
                    "email",
                    "password",
                    ("first_name", "last_name"),
                    "full_name",
                ),
                "classes": ("wide",),
            },
        ),
        (
            "🌍 Location",
            {
                "fields": (
                    "country",
                    "country_name",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            "👔 Profile",
            {
                "fields": (
                    "avatar",
                    "get_avatar_preview",
                    "bio",
                ),
                "classes": ("wide",),
            },
        ),
        (
            "🔐 Permissions & Role",
            {
                "fields": (
                    "role",
                    ("is_active", "is_staff", "is_verified"),
                    "is_superuser",
                    "groups",
                    "user_permissions",
                ),
                "classes": ("wide",),
            },
        ),
        (
            "📅 Important Dates",
            {
                "fields": (
                    "date_joined",
                    "last_login",
                    "last_login_ip",
                ),
                "classes": ("collapse",),
            },
        ),
    )

    add_fieldsets = (
        (
            "➕ Create New User",
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    ("first_name", "last_name"),
                    "password1",
                    "password2",
                    "role",
                    ("is_active", "is_staff", "is_verified"),
                    "country",
                ),
            },
        ),
    )

    readonly_fields = (
        "full_name",
        "country_name",
        "date_joined",
        "last_login",
        "get_avatar_preview",
    )

    # ═══ CUSTOM DISPLAY METHODS ═══
    @admin.display(description="User Info", ordering="email")
    def get_user_info(self, obj):
        """Display user info with avatar"""
        avatar_html = ""
        if obj.avatar:
            avatar_html = f'<img src="{obj.avatar.url}" style="width:30px;height:30px;border-radius:50%;margin-right:10px;">'

        return format_html(
            '{}<div><strong>{}</strong><br><small style="color:#666;">{}</small></div>',
            mark_safe(avatar_html),
            obj.full_name or "No name",
            obj.email,
        )

    @admin.display(description="Role", ordering="role")
    def get_role_badge(self, obj):
        """Display role with colored badge"""
        colors = {
            "client": "#28a745",  # Green
            "customer": "#007bff",  # Blue
            "admin": "#ffc107",  # Yellow
            "superadmin": "#dc3545",  # Red
        }

        color = colors.get(obj.role, "#6c757d")
        return format_html(
            '<span style="background:{}; color:white; padding:3px 8px; border-radius:12px; font-size:11px; font-weight:bold;">{}</span>',
            color,
            obj.get_role_display(),
        )

    @admin.display(description="Status")
    def get_status_badges(self, obj):
        """Display status badges"""
        badges = []

        if obj.is_active:
            badges.append(
                '<span style="background:#28a745;color:white;padding:2px 6px;border-radius:8px;font-size:10px;">Active</span>'
            )
        else:
            badges.append(
                '<span style="background:#dc3545;color:white;padding:2px 6px;border-radius:8px;font-size:10px;">Inactive</span>'
            )

        if obj.is_verified:
            badges.append(
                '<span style="background:#007bff;color:white;padding:2px 6px;border-radius:8px;font-size:10px;">✓ Verified</span>'
            )
        else:
            badges.append(
                '<span style="background:#ffc107;color:black;padding:2px 6px;border-radius:8px;font-size:10px;">⚠ Unverified</span>'
            )

        if obj.is_staff:
            badges.append(
                '<span style="background:#6f42c1;color:white;padding:2px 6px;border-radius:8px;font-size:10px;">Staff</span>'
            )

        return format_html(" ".join(badges))

    @admin.display(description="Joined", ordering="date_joined")
    def date_joined_short(self, obj):
        """Short date format"""
        return obj.date_joined.strftime("%d.%m.%Y")

    @admin.display(description="Actions")
    def get_actions(self, obj):
        """Quick action buttons"""
        actions = []

        # View profile button
        profile_url = reverse("admin:users_user_change", args=[obj.pk])
        actions.append(
            f'<a href="{profile_url}" style="background:#007bff;color:white;padding:3px 8px;border-radius:4px;text-decoration:none;font-size:11px;">Edit</a>'
        )

        # Login attempts button
        attempts_url = (
            reverse("admin:users_loginattempt_changelist")
            + f"?login_identifier={obj.email}"
        )
        actions.append(
            f'<a href="{attempts_url}" style="background:#6c757d;color:white;padding:3px 8px;border-radius:4px;text-decoration:none;font-size:11px;">Attempts</a>'
        )

        # Toggle active button
        if obj.is_active:
            actions.append(
                '<span style="background:#28a745;color:white;padding:3px 8px;border-radius:4px;font-size:11px;">✓ Active</span>'
            )
        else:
            actions.append(
                '<span style="background:#dc3545;color:white;padding:3px 8px;border-radius:4px;font-size:11px;">⚠ Disabled</span>'
            )

        return format_html(" ".join(actions))

    @admin.display(description="Avatar Preview")
    def get_avatar_preview(self, obj):
        """Avatar preview in form"""
        if obj.avatar:
            return format_html(
                '<img src="{}" style="max-width:150px;max-height:150px;border-radius:8px;">',
                obj.avatar.url,
            )
        return "No avatar uploaded"

    # ═══ CUSTOM ACTIONS ═══
    @admin.action(description="✓ Activate selected users")
    def make_active(self, request, queryset):
        count = queryset.update(is_active=True)
        self.message_user(request, f"{count} users activated successfully.")

    @admin.action(description="✗ Deactivate selected users")
    def make_inactive(self, request, queryset):
        count = queryset.update(is_active=False)
        self.message_user(request, f"{count} users deactivated successfully.")

    @admin.action(description="✓ Verify selected users")
    def verify_users(self, request, queryset):
        count = queryset.update(is_verified=True)
        self.message_user(request, f"{count} users verified successfully.")

    @admin.action(description="🔄 Update denormalized fields")
    def update_denormalized(self, request, queryset):
        count = 0
        for user in queryset:
            user.save()  # Triggers denormalization in save method
            count += 1
        self.message_user(request, f"Denormalized fields updated for {count} users.")

    actions = [make_active, make_inactive, verify_users, update_denormalized]

    # ═══ CUSTOM QUERYSET ═══
    def get_queryset(self, request):
        """Optimize queryset with select_related"""
        return super().get_queryset(request).select_related("country")

    # ═══ PERMISSION CONTROL ═══
    def has_delete_permission(self, request, obj=None):
        """Only superadmins can delete users"""
        if obj and obj.is_superadmin:
            return request.user.is_superuser
        return super().has_delete_permission(request, obj)

    # ═══ CUSTOM DISPLAY METHODS ═══
    @admin.display(description="Login Info", ordering="login_identifier")

    def get_login_info(self, obj):
        """Display login identifier with user link"""
        try:
            # Try to find user
            user = None
            if obj.login_type == "email":
                user = User.objects.filter(email=obj.login_identifier).first()
            else:
                user = User.objects.filter(phone=obj.login_identifier).first()

            if user:
                user_url = reverse("admin:users_user_change", args=[user.pk])

                return format_html(
                    '<a href="{}" style="text-decoration:none;"><strong>{}</strong></a><br><small style="color:#666;">{}</small>',
                    user_url,
                    obj.login_identifier,
                    user.full_name,
                )
            else:
                return format_html(
                    '<strong>{}</strong><br><small style="color:#999;">User not found</small>',
                    obj.login_identifier,
                )
        except:
            return obj.login_identifier

    @admin.display(description="Type", ordering="login_type")
    def get_login_type_badge(self, obj):
        """Login type badge"""
        colors = {"email": "#007bff", "phone": "#28a745"}
        color = colors.get(obj.login_type, "#6c757d")
        icon = "📧" if obj.login_type == "email" else "📱"

        return format_html(
            '{} <span style="background:{};color:white;padding:2px 6px;border-radius:8px;font-size:11px;">{}</span>',
            icon,
            color,
            obj.login_type.title(),
        )

    @admin.display(description="Result", ordering="is_successful")
    def get_success_badge(self, obj):
        """Success/failure badge"""
        if obj.is_successful:
            return format_html(
                '<span style="background:#28a745;color:white;padding:3px 8px;border-radius:8px;font-size:11px;">✓ Success</span>'
            )
        else:
            return format_html(
                '<span style="background:#dc3545;color:white;padding:3px 8px;border-radius:8px;font-size:11px;">✗ Failed</span>'
            )

    @admin.display(description="Date", ordering="created_at")
    def created_at_short(self, obj):
        """Short datetime format"""
        return obj.created_at.strftime("%d.%m %H:%M")

    @admin.display(description="Location")
    def get_location_info(self, obj):
        """IP location info (basic)"""
        # Simple IP classification
        if obj.ip_address:

            if obj.ip_address.startswith("127.") or obj.ip_address.startswith(
                "192.168."
            ):
                location = "🏠 Local"
            elif obj.ip_address.startswith("10."):
                location = "🏢 Internal"
            else:
                location = "🌐 External"

            return format_html(
                '{}<br><small style="color:#666;">{}</small>', location, obj.ip_address
            )
        return "Unknown"

    # ═══ CUSTOM ACTIONS ═══
    @admin.action(description="🧹 Clean old attempts (90+ days)")
    def clean_old_attempts(self, request, queryset):
        from django.utils import timezone
        from datetime import timedelta

        cutoff_date = timezone.now() - timedelta(days=90)
        count, _ = LoginAttempt.objects.filter(created_at__lt=cutoff_date).delete()


        self.message_user(request, f"Cleaned {count} old login attempts.")

    @admin.action(description="📊 Export security report")
    def export_security_report(self, request, queryset):
        # This could be extended to generate CSV/PDF reports
        failed_count = queryset.filter(is_successful=False).count()
        success_count = queryset.filter(is_successful=True).count()

        self.message_user(
            request,

            f"Report: {success_count} successful, {failed_count} failed attempts in selection.",

        )

    actions = [clean_old_attempts, export_security_report]

    # ═══ CUSTOM VIEWS ═══
    def changelist_view(self, request, extra_context=None):
        """Add security stats to changelist"""
        extra_context = extra_context or {}

        # Security statistics
        from django.utils import timezone
        from datetime import timedelta

        today = timezone.now().date()
        week_ago = today - timedelta(days=7)

        extra_context["security_stats"] = {
            "today_attempts": LoginAttempt.objects.filter(
                created_at__date=today
            ).count(),
            "today_failed": LoginAttempt.objects.filter(
                created_at__date=today, is_successful=False
            ).count(),
            "week_attempts": LoginAttempt.objects.filter(
                created_at__date__gte=week_ago
            ).count(),
        }

        return super().changelist_view(request, extra_context)


# ═══ ADMIN SITE CUSTOMIZATION ═══
admin.site.site_header = "Tourism Platform Admin"
admin.site.site_title = "Tourism Admin"
admin.site.index_title = "Dashboard"

