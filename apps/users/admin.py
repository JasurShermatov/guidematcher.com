# apps/users/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe



class RoleFilter(SimpleListFilter):
    """Custom role filter for admin"""
    title = 'User Role'
    parameter_name = 'role'

    def lookups(self, request, model_admin):
        return User.UserRole.choices

    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(role=self.value())
        return queryset


class CountryFilter(SimpleListFilter):
    """Custom country filter for admin"""
    title = 'Country'
    parameter_name = 'country'

    def lookups(self, request, model_admin):
        countries = User.objects.exclude(country__isnull=True).values_list(
            'country__id', 'country__name'
        ).distinct()
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


    # ═══ CUSTOM DISPLAY METHODS ═══
    @admin.display(description="User Info", ordering="email")
    def get_user_info(self, obj):
        """Display user info with avatar"""
        avatar_html = ""
        if obj.avatar:
            avatar_html = f'<img src="{obj.avatar.url}" style="width:30px;height:30px;border-radius:50%;margin-right:10px;">'

            ]
    def get_login_info(self, obj):
        """Display login identifier with user link"""
        try:
            # Try to find user
            user = None

                user = User.objects.filter(email=obj.login_identifier).first()
            else:
                user = User.objects.filter(phone=obj.login_identifier).first()

            if user:

                return format_html(
                    '<a href="{}" style="text-decoration:none;"><strong>{}</strong></a><br><small style="color:#666;">{}</small>',
                    user_url,
                    obj.login_identifier,

                )
            else:
                return format_html(
                    '<strong>{}</strong><br><small style="color:#999;">User not found</small>',

                )
        except:
            return obj.login_identifier



        return format_html(
            '{} <span style="background:{};color:white;padding:2px 6px;border-radius:8px;font-size:11px;">{}</span>',
            icon,
            color,

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


    def get_location_info(self, obj):
        """IP location info (basic)"""
        # Simple IP classification
        if obj.ip_address:

    def clean_old_attempts(self, request, queryset):
        from django.utils import timezone
        from datetime import timedelta

        cutoff_date = timezone.now() - timedelta(days=90)
        count, _ = LoginAttempt.objects.filter(created_at__lt=cutoff_date).delete()

    def export_security_report(self, request, queryset):
        # This could be extended to generate CSV/PDF reports
        failed_count = queryset.filter(is_successful=False).count()
        success_count = queryset.filter(is_successful=True).count()

        self.message_user(
            request,

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


                created_at__date__gte=week_ago
            ).count(),
        }

        return super().changelist_view(request, extra_context)


# ═══ ADMIN SITE CUSTOMIZATION ═══
admin.site.site_header = "Tourism Platform Admin"
admin.site.site_title = "Tourism Admin"

