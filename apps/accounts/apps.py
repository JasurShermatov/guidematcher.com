# apps/accounts/apps.py
from datetime import timezone, timedelta

from django.apps import AppConfig
from django.db.models.signals import post_save, post_delete
from django.utils.translation import gettext_lazy as _


class AccountsConfig(AppConfig):
    """
    Configuration for the accounts application
    """

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.accounts"
    verbose_name = _("Account Management")

    def ready(self):
        """
        Initialize app when Django starts
        """
        # Import signal handlers
        from . import signals

        # Register custom signals
        self.register_signals()

        # Setup periodic tasks
        self.setup_periodic_tasks()

        # Initialize app-specific configurations
        self.initialize_app_config()

    def register_signals(self):
        """
        Register signal handlers for the accounts app
        """
        from django.contrib.auth import get_user_model
        from .signals import (
            user_registration_complete,
            verification_code_created,
            password_reset_requested,
            login_session_created,
            cleanup_expired_data,
        )
        from .models import VerificationCode, LoginSession

        User = get_user_model()

        # Connect signals
        post_save.connect(
            user_registration_complete,
            sender=User,
            dispatch_uid="user_registration_complete",
        )

        post_save.connect(
            verification_code_created,
            sender=VerificationCode,
            dispatch_uid="verification_code_created",
        )

        post_save.connect(
            login_session_created,
            sender=LoginSession,
            dispatch_uid="login_session_created",
        )

        # Setup periodic cleanup
        from django.core.management import call_command
        import logging

        logger = logging.getLogger(__name__)
        logger.info("Accounts app signals registered successfully")

    def setup_periodic_tasks(self):
        """
        Setup periodic tasks for accounts app
        """
        try:
            from celery import Celery
            from celery.schedules import crontab

            app = Celery("travmatch")

            # Schedule cleanup tasks
            app.conf.beat_schedule.update(
                {
                    "cleanup-expired-verification-codes": {
                        "task": "apps.accounts.tasks.cleanup_expired_codes",
                        "schedule": crontab(minute=0),  # Every hour
                    },
                    "cleanup-old-login-sessions": {
                        "task": "apps.accounts.tasks.cleanup_old_sessions",
                        "schedule": crontab(hour=2, minute=0),  # Daily at 2 AM
                    },
                    "cleanup-old-password-reset-attempts": {
                        "task": "apps.accounts.tasks.cleanup_old_reset_attempts",
                        "schedule": crontab(hour=3, minute=0),  # Daily at 3 AM
                    },
                    "send-account-activity-report": {
                        "task": "apps.accounts.tasks.send_daily_activity_report",
                        "schedule": crontab(hour=8, minute=0),  # Daily at 8 AM
                    },
                }
            )

        except ImportError:
            # Celery not available, skip periodic tasks setup
            import logging

            logger = logging.getLogger(__name__)
            logger.warning("Celery not available, periodic tasks not scheduled")

    def initialize_app_config(self):
        """
        Initialize app-specific configurations
        """
        import logging
        from django.conf import settings

        logger = logging.getLogger(__name__)

        # Validate required settings
        required_settings = [
            "ACCOUNTS_VERIFICATION_CODE_TTL_SECONDS",
            "ACCOUNTS_VERIFICATION_CODE_LENGTH",
            "DEFAULT_FROM_EMAIL",
        ]

        missing_settings = []
        for setting in required_settings:
            if not hasattr(settings, setting):
                missing_settings.append(setting)

        if missing_settings:
            logger.warning(
                f"Missing required settings for accounts app: {missing_settings}"
            )

        # Set default values for missing settings
        if not hasattr(settings, "ACCOUNTS_VERIFICATION_CODE_TTL_SECONDS"):
            settings.ACCOUNTS_VERIFICATION_CODE_TTL_SECONDS = 300  # 5 minutes

        if not hasattr(settings, "ACCOUNTS_VERIFICATION_CODE_LENGTH"):
            settings.ACCOUNTS_VERIFICATION_CODE_LENGTH = 6

        if not hasattr(settings, "ACCOUNTS_MAX_LOGIN_ATTEMPTS"):
            settings.ACCOUNTS_MAX_LOGIN_ATTEMPTS = 5

        if not hasattr(settings, "ACCOUNTS_LOCKOUT_DURATION_MINUTES"):
            settings.ACCOUNTS_LOCKOUT_DURATION_MINUTES = 30

        # Initialize rate limiting configurations
        self._setup_rate_limiting()

        logger.info("Accounts app initialized successfully")

    def _setup_rate_limiting(self):
        """
        Setup rate limiting configurations
        """
        from django.core.cache import cache
        from django.conf import settings

        # Rate limiting settings
        rate_limits = {
            "verification_code_requests": {
                "per_email": 5,  # 5 requests per hour per email
                "per_ip": 20,  # 20 requests per hour per IP
                "window": 3600,  # 1 hour
            },
            "password_reset_requests": {
                "per_email": 3,  # 3 requests per hour per email
                "per_ip": 10,  # 10 requests per hour per IP
                "window": 3600,  # 1 hour
            },
            "login_attempts": {
                "per_email": 5,  # 5 attempts per 30 minutes per email
                "per_ip": 15,  # 15 attempts per 30 minutes per IP
                "window": 1800,  # 30 minutes
            },
        }

        # Store rate limits in cache for access by views
        cache.set("accounts_rate_limits", rate_limits, timeout=None)

    @staticmethod
    def get_app_info():
        """
        Get application information and statistics
        """
        from .models import VerificationCode, PasswordResetAttempt, LoginSession
        from django.utils import timezone
        from datetime import timedelta

        now = timezone.now()
        today = now.date()
        week_ago = now - timedelta(days=7)

        info = {
            "app_name": "Account Management",
            "version": "1.0.0",
            "description": "Handles user registration, authentication, and session management",
            "features": [
                "Email verification with codes",
                "Password reset functionality",
                "JWT token authentication",
                "Session tracking",
                "Rate limiting",
                "Security monitoring",
            ],
            "statistics": {
                "verification_codes_today": VerificationCode.objects.filter(
                    created_at__date=today
                ).count(),
                "password_resets_week": PasswordResetAttempt.objects.filter(
                    created_at__gte=week_ago
                ).count(),
                "active_sessions": LoginSession.objects.filter(is_active=True).count(),
                "total_users": None,  # Will be set by calling code
            },
            "endpoints": [
                "/api/v1/accounts/request-code/",
                "/api/v1/accounts/register/",
                "/api/v1/accounts/login/",
                "/api/v1/accounts/logout/",
                "/api/v1/accounts/password-reset/",
                "/api/v1/accounts/password-reset-confirm/",
                "/api/v1/accounts/refresh/",
            ],
        }

        return info

    @staticmethod
    def validate_configuration():
        """
        Validate app configuration and dependencies
        """
        from django.conf import settings
        from django.core.exceptions import ImproperlyConfigured
        import logging

        logger = logging.getLogger(__name__)
        errors = []
        warnings = []

        # Check email configuration
        if not hasattr(settings, "EMAIL_BACKEND"):
            errors.append("EMAIL_BACKEND setting is required")

        if not hasattr(settings, "DEFAULT_FROM_EMAIL"):
            errors.append("DEFAULT_FROM_EMAIL setting is required")

        # Check JWT configuration
        if not hasattr(settings, "SIMPLE_JWT"):
            warnings.append("SIMPLE_JWT settings not configured")

        # Check cache configuration
        if not hasattr(settings, "CACHES"):
            warnings.append(
                "CACHES setting not configured - rate limiting may not work"
            )

        # Check Celery configuration
        if not hasattr(settings, "CELERY_BROKER_URL"):
            warnings.append(
                "CELERY_BROKER_URL not configured - background tasks disabled"
            )

        # Log results
        if errors:
            error_msg = f"Accounts app configuration errors: {errors}"
            logger.error(error_msg)
            raise ImproperlyConfigured(error_msg)

        if warnings:
            logger.warning(f"Accounts app configuration warnings: {warnings}")

        logger.info("Accounts app configuration validation passed")

        return {"errors": errors, "warnings": warnings}


# Utility functions for app management
def get_app_health():
    """
    Check the health status of the accounts app
    """
    from django.db import connection
    from django.core.cache import cache
    import logging

    logger = logging.getLogger(__name__)
    health_status = {
        "status": "healthy",
        "checks": {},
        "timestamp": timezone.now().isoformat(),
    }

    try:
        # Database connectivity check
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        health_status["checks"]["database"] = "ok"
    except Exception as e:
        health_status["checks"]["database"] = f"error: {str(e)}"
        health_status["status"] = "unhealthy"

    try:
        # Cache connectivity check
        cache.set("health_check", "ok", timeout=1)
        cache.get("health_check")
        health_status["checks"]["cache"] = "ok"
    except Exception as e:
        health_status["checks"]["cache"] = f"error: {str(e)}"
        health_status["status"] = "degraded"

    try:
        # Email configuration check
        from django.core.mail import get_connection

        connection = get_connection()
        health_status["checks"]["email"] = "configured"
    except Exception as e:
        health_status["checks"]["email"] = f"error: {str(e)}"
        health_status["status"] = "degraded"

    return health_status


def reset_app_state():
    """
    Reset app state (useful for testing)
    """
    from django.core.cache import cache
    from .models import VerificationCode, PasswordResetAttempt
    import logging

    logger = logging.getLogger(__name__)

    try:
        # Clear expired verification codes
        expired_codes = VerificationCode.objects.filter(expires_at__lt=timezone.now())
        count = expired_codes.count()
        expired_codes.delete()

        # Clear old password reset attempts
        old_attempts = PasswordResetAttempt.objects.filter(
            created_at__lt=timezone.now() - timedelta(days=1)
        )
        attempt_count = old_attempts.count()
        old_attempts.delete()

        # Clear rate limiting cache
        cache.clear()

        logger.info(
            f"App state reset: {count} expired codes, "
            f"{attempt_count} old attempts cleared"
        )

        return {
            "expired_codes_cleared": count,
            "old_attempts_cleared": attempt_count,
            "cache_cleared": True,
        }

    except Exception as e:
        logger.error(f"Error resetting app state: {str(e)}")
        raise
