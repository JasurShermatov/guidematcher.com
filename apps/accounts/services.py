# apps/accounts/services.py

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db.models import Q, Count
from django.utils import timezone
from django.conf import settings
from datetime import timedelta
from .models import VerificationCode, PasswordResetAttempt, LoginSession
import logging
import hashlib
import secrets
import re

User = get_user_model()
logger = logging.getLogger(__name__)


class RateLimitService:
    """
    Service for handling rate limiting across the accounts app
    """

    @staticmethod
    def check_rate_limit(identifier, action, window_minutes=60, max_attempts=5):
        """
        Check if action is rate limited for identifier

        Args:
            identifier: Email or IP address
            action: Action being performed (verification_code, password_reset, etc.)
            window_minutes: Time window in minutes
            max_attempts: Maximum attempts allowed in window

        Returns:
            dict: {'allowed': bool, 'current_count': int, 'window_reset': datetime}
        """
        cache_key = f"rate_limit_{action}_{identifier}"
        window_start = timezone.now() - timedelta(minutes=window_minutes)

        # Get current attempts in window
        attempts = cache.get(cache_key, [])

        # Filter to only include attempts within window
        valid_attempts = [
            attempt for attempt in attempts if attempt > window_start.timestamp()
        ]

        # Check if limit exceeded
        allowed = len(valid_attempts) < max_attempts

        # Calculate when window resets
        if valid_attempts:
            oldest_attempt = min(valid_attempts)
            window_reset = timezone.datetime.fromtimestamp(oldest_attempt) + timedelta(
                minutes=window_minutes
            )
        else:
            window_reset = timezone.now()

        return {
            "allowed": allowed,
            "current_count": len(valid_attempts),
            "max_attempts": max_attempts,
            "window_reset": window_reset,
            "window_minutes": window_minutes,
        }

    @staticmethod
    def record_attempt(identifier, action, window_minutes=60):
        """
        Record an attempt for rate limiting
        """
        cache_key = f"rate_limit_{action}_{identifier}"
        attempts = cache.get(cache_key, [])

        # Add current timestamp
        attempts.append(timezone.now().timestamp())

        # Keep only recent attempts
        window_start = timezone.now() - timedelta(minutes=window_minutes)
        attempts = [
            attempt for attempt in attempts if attempt > window_start.timestamp()
        ]

        # Store back in cache
        cache.set(cache_key, attempts, timeout=window_minutes * 60)

        return len(attempts)

    @staticmethod
    def get_rate_limit_status(identifier, action):
        """
        Get detailed rate limit status
        """
        # Get rate limit configuration
        rate_limits = cache.get("accounts_rate_limits", {})
        config = rate_limits.get(action, {"per_email": 5, "per_ip": 20, "window": 3600})

        window_minutes = config["window"] // 60

        # Determine if identifier is email or IP
        is_email = "@" in identifier
        max_attempts = config["per_email"] if is_email else config["per_ip"]

        return RateLimitService.check_rate_limit(
            identifier, action, window_minutes, max_attempts
        )


class SecurityService:
    """
    Service for security-related operations
    """

    @staticmethod
    def is_suspicious_activity(email=None, ip_address=None, action=None):
        """
        Check if current activity appears suspicious
        """
        suspicious_indicators = []

        if email:
            # Check verification code requests
            recent_codes = VerificationCode.objects.filter(
                email=email, created_at__gte=timezone.now() - timedelta(hours=1)
            ).count()

            if recent_codes > 3:
                suspicious_indicators.append("excessive_verification_requests")

            # Check password reset attempts
            recent_resets = PasswordResetAttempt.objects.filter(
                email=email, created_at__gte=timezone.now() - timedelta(hours=1)
            ).count()

            if recent_resets > 2:
                suspicious_indicators.append("excessive_password_resets")

        if ip_address:
            # Check login attempts from IP
            recent_logins = LoginSession.objects.filter(
                ip_address=ip_address,
                created_at__gte=timezone.now() - timedelta(hours=1),
            ).count()

            if recent_logins > 10:
                suspicious_indicators.append("excessive_logins_from_ip")

            # Check different users from same IP
            different_users = (
                LoginSession.objects.filter(
                    ip_address=ip_address,
                    created_at__gte=timezone.now() - timedelta(hours=1),
                )
                .values("user")
                .distinct()
                .count()
            )

            if different_users > 5:
                suspicious_indicators.append("multiple_users_same_ip")

        return {
            "is_suspicious": len(suspicious_indicators) > 0,
            "indicators": suspicious_indicators,
            "risk_level": (
                "high"
                if len(suspicious_indicators) > 2
                else "medium" if len(suspicious_indicators) > 0 else "low"
            ),
        }

    @staticmethod
    def generate_secure_code(length=6):
        """
        Generate cryptographically secure verification code
        """
        if length <= 0:
            raise ValueError("Code length must be positive")

        # Use secrets for cryptographically secure random numbers
        code = "".join(secrets.choice("0123456789") for _ in range(length))
        return code

    @staticmethod
    def hash_session_key(session_key):
        """
        Create hash of session key for secure storage
        """
        return hashlib.sha256(session_key.encode()).hexdigest()

    @staticmethod
    def validate_password_strength(password):
        """
        Validate password strength beyond Django's default validators
        """
        errors = []

        if len(password) < 8:
            errors.append("Password must be at least 8 characters long")

        if not re.search(r"[A-Z]", password):
            errors.append("Password must contain at least one uppercase letter")

        if not re.search(r"[a-z]", password):
            errors.append("Password must contain at least one lowercase letter")

        if not re.search(r"\d", password):
            errors.append("Password must contain at least one digit")

        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            errors.append("Password must contain at least one special character")

        # Check for common patterns
        common_patterns = [r"123456", r"password", r"qwerty", r"abc123"]

        for pattern in common_patterns:
            if re.search(pattern, password.lower()):
                errors.append("Password contains common patterns")
                break

        return {
            "is_valid": len(errors) == 0,
            "errors": errors,
            "strength": "strong" if len(errors) == 0 else "weak",
        }


class AccountService:
    """
    Service for account-related operations
    """

    @staticmethod
    def create_verification_code(email, code_type="registration", ip_address=None):
        """
        Create verification code with all necessary validations
        """
        try:
            # Check rate limits
            rate_limit = RateLimitService.get_rate_limit_status(
                email, "verification_code_requests"
            )

            if not rate_limit["allowed"]:
                raise ValueError(
                    f"Too many verification code requests. "
                    f"Try again after {rate_limit['window_reset']}"
                )

            # Check for suspicious activity
            security_check = SecurityService.is_suspicious_activity(
                email=email, ip_address=ip_address
            )

            if security_check["risk_level"] == "high":
                logger.warning(
                    f"High risk verification code request for {email} "
                    f"from {ip_address}: {security_check['indicators']}"
                )
                # Still allow, but log for review

            # Generate verification code
            code = SecurityService.generate_secure_code(
                settings.ACCOUNTS_VERIFICATION_CODE_LENGTH
            )

            # Create verification code record
            verification_code = VerificationCode.objects.create(
                email=email,
                code=code,
                code_type=code_type,
                expires_at=timezone.now()
                + timedelta(seconds=settings.ACCOUNTS_VERIFICATION_CODE_TTL_SECONDS),
                ip_address=ip_address,
            )

            # Record attempt for rate limiting
            RateLimitService.record_attempt(email, "verification_code_requests")
            if ip_address:
                RateLimitService.record_attempt(
                    ip_address, "verification_code_requests"
                )

            return verification_code

        except Exception as e:
            logger.error(f"Error creating verification code for {email}: {str(e)}")
            raise

    @staticmethod
    def verify_code(email, code, code_type="registration"):
        """
        Verify a verification code
        """
        try:
            # Find the most recent unused code
            verification_code = (
                VerificationCode.objects.filter(
                    email=email, code_type=code_type, is_used=False
                )
                .order_by("-created_at")
                .first()
            )

            if not verification_code:
                return {"success": False, "error": "No verification code found"}

            # Check if code is valid
            if not verification_code.is_valid():
                if verification_code.is_expired():
                    return {"success": False, "error": "Verification code has expired"}
                elif verification_code.attempts >= verification_code.max_attempts:
                    return {"success": False, "error": "Too many attempts"}

            # Verify the code
            if verification_code.verify(code):
                return {"success": True, "verification_code": verification_code}
            else:
                return {"success": False, "error": "Invalid verification code"}

        except Exception as e:
            logger.error(f"Error verifying code for {email}: {str(e)}")
            return {"success": False, "error": "Verification failed"}

    @staticmethod
    def create_user_session(user, request):
        """
        Create login session with device detection
        """
        try:
            # Extract device information
            user_agent = request.META.get("HTTP_USER_AGENT", "")
            ip_address = AccountService.get_client_ip(request)

            device_info = AccountService.parse_user_agent(user_agent)

            # Create session record
            session = LoginSession.objects.create(
                user=user,
                session_key=request.session.session_key or "anonymous",
                ip_address=ip_address,
                user_agent=user_agent,
                device_type=device_info.get("device_type", "unknown"),
                browser=device_info.get("browser", "unknown"),
                os=device_info.get("os", "unknown"),
            )

            # Cleanup old sessions (keep only last 10)
            old_sessions = LoginSession.objects.filter(user=user).order_by(
                "-created_at"
            )[10:]

            for old_session in old_sessions:
                old_session.logout()

            return session

        except Exception as e:
            logger.error(f"Error creating user session: {str(e)}")
            return None

    @staticmethod
    def get_client_ip(request):
        """
        Get client IP address from request
        """
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            ip = x_forwarded_for.split(",")[0].strip()
        else:
            ip = request.META.get("REMOTE_ADDR")
        return ip

    @staticmethod
    def parse_user_agent(user_agent):
        """
        Parse user agent string to extract device information
        """
        # Simple user agent parsing (in production, use a library like user-agents)
        device_info = {"device_type": "desktop", "browser": "unknown", "os": "unknown"}

        user_agent_lower = user_agent.lower()

        # Detect mobile devices
        mobile_indicators = ["mobile", "android", "iphone", "ipad", "windows phone"]
        if any(indicator in user_agent_lower for indicator in mobile_indicators):
            device_info["device_type"] = "mobile"

        # Detect browsers
        if "chrome" in user_agent_lower:
            device_info["browser"] = "Chrome"
        elif "firefox" in user_agent_lower:
            device_info["browser"] = "Firefox"
        elif "safari" in user_agent_lower:
            device_info["browser"] = "Safari"
        elif "edge" in user_agent_lower:
            device_info["browser"] = "Edge"

        # Detect OS
        if "windows" in user_agent_lower:
            device_info["os"] = "Windows"
        elif "mac" in user_agent_lower:
            device_info["os"] = "macOS"
        elif "linux" in user_agent_lower:
            device_info["os"] = "Linux"
        elif "android" in user_agent_lower:
            device_info["os"] = "Android"
        elif "ios" in user_agent_lower:
            device_info["os"] = "iOS"

        return device_info

    @staticmethod
    def get_account_statistics(user_id=None):
        """
        Get account statistics for user or system-wide
        """
        try:
            stats = {}

            if user_id:
                # User-specific statistics
                user = User.objects.get(id=user_id)

                stats = {
                    "verification_codes_sent": VerificationCode.objects.filter(
                        email=user.email
                    ).count(),
                    "login_sessions": LoginSession.objects.filter(user=user).count(),
                    "active_sessions": LoginSession.objects.filter(
                        user=user, is_active=True
                    ).count(),
                    "last_login": user.last_login,
                    "account_age_days": (timezone.now() - user.date_joined).days,
                }
            else:
                # System-wide statistics
                today = timezone.now().date()
                week_ago = timezone.now() - timedelta(days=7)

                stats = {
                    "total_users": User.objects.count(),
                    "active_users": User.objects.filter(is_active=True).count(),
                    "verified_users": User.objects.filter(is_verified=True).count(),
                    "registrations_today": User.objects.filter(
                        date_joined__date=today
                    ).count(),
                    "registrations_week": User.objects.filter(
                        date_joined__gte=week_ago
                    ).count(),
                    "active_sessions": LoginSession.objects.filter(
                        is_active=True
                    ).count(),
                    "verification_codes_week": VerificationCode.objects.filter(
                        created_at__gte=week_ago
                    ).count(),
                }

            return stats

        except Exception as e:
            logger.error(f"Error getting account statistics: {str(e)}")
            return {}


class NotificationService:
    """
    Service for handling account-related notifications
    """

    @staticmethod
    def send_verification_code_email(email, code, code_type):
        """
        Queue verification code email for sending
        """
        from .tasks import send_verification_email

        try:
            send_verification_email.delay(email, code, code_type)
            return True
        except Exception as e:
            logger.error(f"Error queueing verification email: {str(e)}")
            return False

    @staticmethod
    def send_welcome_email(user_id):
        """
        Queue welcome email for new user
        """
        from .tasks import send_welcome_email

        try:
            send_welcome_email.delay(str(user_id))
            return True
        except Exception as e:
            logger.error(f"Error queueing welcome email: {str(e)}")
            return False

    @staticmethod
    def send_security_alert(alert_type, details):
        """
        Queue security alert email
        """
        from .tasks import send_security_alert_email

        try:
            send_security_alert_email.delay(alert_type, details)
            return True
        except Exception as e:
            logger.error(f"Error queueing security alert: {str(e)}")
            return False


class AnalyticsService:
    """
    Service for account analytics and insights
    """

    @staticmethod
    def get_registration_trends(days=30):
        """
        Get registration trends over specified period
        """
        try:
            from django.db.models import Count
            from django.db.models.functions import TruncDate

            start_date = timezone.now() - timedelta(days=days)

            # Daily registration counts
            daily_registrations = (
                User.objects.filter(date_joined__gte=start_date)
                .annotate(date=TruncDate("date_joined"))
                .values("date")
                .annotate(
                    count=Count("id"),
                    clients=Count("id", filter=Q(role="Client")),
                    guides=Count("id", filter=Q(role="Guide")),
                )
                .order_by("date")
            )

            return list(daily_registrations)

        except Exception as e:
            logger.error(f"Error getting registration trends: {str(e)}")
            return []

    @staticmethod
    def get_user_activity_insights():
        """
        Get insights about user activity patterns
        """
        try:
            from django.db.models import Count, Avg
            from django.db.models.functions import Extract

            # Login patterns by hour of day
            hourly_logins = (
                LoginSession.objects.filter(
                    created_at__gte=timezone.now() - timedelta(days=7)
                )
                .annotate(hour=Extract("created_at__hour"))
                .values("hour")
                .annotate(count=Count("id"))
                .order_by("hour")
            )

            # Device type distribution
            device_distribution = (
                LoginSession.objects.filter(
                    created_at__gte=timezone.now() - timedelta(days=30)
                )
                .values("device_type")
                .annotate(count=Count("id"))
                .order_by("-count")
            )

            # Average session duration (simplified)
            avg_session_duration = LoginSession.objects.filter(
                is_active=False, logged_out_at__isnull=False
            ).aggregate(avg_duration=Avg("logged_out_at") - Avg("created_at"))

            return {
                "hourly_login_pattern": list(hourly_logins),
                "device_distribution": list(device_distribution),
                "avg_session_duration": avg_session_duration.get("avg_duration"),
            }

        except Exception as e:
            logger.error(f"Error getting activity insights: {str(e)}")
            return {}

    @staticmethod
    def get_security_metrics():
        """
        Get security-related metrics
        """
        try:
            week_ago = timezone.now() - timedelta(days=7)

            # Failed login attempts
            failed_logins = PasswordResetAttempt.objects.filter(
                created_at__gte=week_ago, success=False
            ).count()

            # Successful logins
            successful_logins = LoginSession.objects.filter(
                created_at__gte=week_ago
            ).count()

            # Verification code usage
            verification_stats = VerificationCode.objects.filter(
                created_at__gte=week_ago
            ).aggregate(
                total=Count("id"),
                used=Count("id", filter=Q(is_used=True)),
                expired=Count("id", filter=Q(expires_at__lt=timezone.now())),
            )

            # IP diversity (unique IPs)
            unique_ips = (
                LoginSession.objects.filter(created_at__gte=week_ago)
                .values("ip_address")
                .distinct()
                .count()
            )

            return {
                "failed_logins": failed_logins,
                "successful_logins": successful_logins,
                "login_success_rate": (
                    (successful_logins / (successful_logins + failed_logins) * 100)
                    if (successful_logins + failed_logins) > 0
                    else 0
                ),
                "verification_code_stats": verification_stats,
                "unique_login_ips": unique_ips,
            }

        except Exception as e:
            logger.error(f"Error getting security metrics: {str(e)}")
            return {}


class MaintenanceService:
    """
    Service for maintenance and cleanup operations
    """

    @staticmethod
    def cleanup_expired_data():
        """
        Clean up all expired data in accounts app
        """
        try:
            results = {}

            # Cleanup expired verification codes
            expired_codes = VerificationCode.objects.filter(
                expires_at__lt=timezone.now()
            )
            results["expired_codes"] = expired_codes.count()
            expired_codes.delete()

            # Cleanup old password reset attempts (older than 7 days)
            old_attempts = PasswordResetAttempt.objects.filter(
                created_at__lt=timezone.now() - timedelta(days=7)
            )
            results["old_reset_attempts"] = old_attempts.count()
            old_attempts.delete()

            # Cleanup old inactive sessions (older than 30 days)
            old_sessions = LoginSession.objects.filter(
                is_active=False, logged_out_at__lt=timezone.now() - timedelta(days=30)
            )
            results["old_sessions"] = old_sessions.count()
            old_sessions.delete()

            # Clear expired cache entries
            cache.delete_pattern("rate_limit_*")
            cache.delete_pattern("verification_codes_*")

            logger.info(f"Cleanup completed: {results}")
            return results

        except Exception as e:
            logger.error(f"Error during cleanup: {str(e)}")
            return {}

    @staticmethod
    def optimize_performance():
        """
        Optimize performance by updating statistics and indexes
        """
        try:
            from django.db import connection

            optimization_results = {}

            # Update database statistics (PostgreSQL)
            with connection.cursor() as cursor:
                cursor.execute("ANALYZE;")
                optimization_results["database_analyzed"] = True

            # Warm up frequently accessed cache entries
            AccountService.get_account_statistics()
            AnalyticsService.get_security_metrics()

            optimization_results["cache_warmed"] = True

            logger.info("Performance optimization completed")
            return optimization_results

        except Exception as e:
            logger.error(f"Error during performance optimization: {str(e)}")
            return {}

    @staticmethod
    def health_check():
        """
        Perform health check on accounts app
        """
        try:
            health_status = {
                "status": "healthy",
                "checks": {},
                "timestamp": timezone.now().isoformat(),
            }

            # Database connectivity
            try:
                User.objects.count()
                health_status["checks"]["database"] = "ok"
            except Exception as e:
                health_status["checks"]["database"] = f"error: {str(e)}"
                health_status["status"] = "unhealthy"

            # Cache connectivity
            try:
                cache.set("health_check", "ok", timeout=1)
                cache.get("health_check")
                health_status["checks"]["cache"] = "ok"
            except Exception as e:
                health_status["checks"]["cache"] = f"error: {str(e)}"
                health_status["status"] = "degraded"

            # Rate limiting functionality
            try:
                RateLimitService.check_rate_limit("test@example.com", "test_action")
                health_status["checks"]["rate_limiting"] = "ok"
            except Exception as e:
                health_status["checks"]["rate_limiting"] = f"error: {str(e)}"
                health_status["status"] = "degraded"

            # Background tasks (check if Celery is working)
            try:
                from .tasks import cleanup_expired_codes

                task = cleanup_expired_codes.delay()
                health_status["checks"]["background_tasks"] = "ok"
            except Exception as e:
                health_status["checks"]["background_tasks"] = f"error: {str(e)}"
                health_status["status"] = "degraded"

            return health_status

        except Exception as e:
            logger.error(f"Error during health check: {str(e)}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "timestamp": timezone.now().isoformat(),
            }


# Utility functions for the service layer
def get_service_status():
    """
    Get overall status of all account services
    """
    try:
        services_status = {
            "rate_limiting": "ok",
            "security": "ok",
            "account_management": "ok",
            "notifications": "ok",
            "analytics": "ok",
            "maintenance": "ok",
        }

        # Test each service
        try:
            RateLimitService.check_rate_limit("test@example.com", "test")
        except:
            services_status["rate_limiting"] = "error"

        try:
            SecurityService.is_suspicious_activity(email="test@example.com")
        except:
            services_status["security"] = "error"

        try:
            AccountService.get_account_statistics()
        except:
            services_status["account_management"] = "error"

        try:
            AnalyticsService.get_security_metrics()
        except:
            services_status["analytics"] = "error"

        try:
            MaintenanceService.health_check()
        except:
            services_status["maintenance"] = "error"

        overall_status = (
            "healthy"
            if all(status == "ok" for status in services_status.values())
            else "degraded"
        )

        return {
            "overall_status": overall_status,
            "services": services_status,
            "timestamp": timezone.now().isoformat(),
        }

    except Exception as e:
        logger.error(f"Error getting service status: {str(e)}")
        return {
            "overall_status": "unhealthy",
            "error": str(e),
            "timestamp": timezone.now().isoformat(),
        }


def initialize_services():
    """
    Initialize all account services on app startup
    """
    try:
        # Set up rate limiting configuration
        rate_limits = {
            "verification_code_requests": {
                "per_email": 5,
                "per_ip": 20,
                "window": 3600,
            },
            "password_reset_requests": {"per_email": 3, "per_ip": 10, "window": 3600},
            "login_attempts": {"per_email": 5, "per_ip": 15, "window": 1800},
        }

        cache.set("accounts_rate_limits", rate_limits, timeout=None)

        # Initialize analytics cache
        AccountService.get_account_statistics()

        # Run initial cleanup
        MaintenanceService.cleanup_expired_data()

        logger.info("Account services initialized successfully")
        return True

    except Exception as e:
        logger.error(f"Error initializing account services: {str(e)}")
        return False
