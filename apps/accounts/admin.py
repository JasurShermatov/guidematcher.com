from django.contrib import admin
from .models import EmailVerification

@admin.register(EmailVerification)
class EmailVerificationAdmin(admin.ModelAdmin):
    list_display = ("email", "code", "created_at", "expires_at", "verified", "is_expired_display")
    list_filter = ("verified", "created_at", "expires_at")
    search_fields = ("email", "code")
    readonly_fields = ("created_at", "is_expired_display")

    def is_expired_display(self, obj):
        return obj.is_expired()
    is_expired_display.short_description = "Is Expired"
    is_expired_display.boolean = True