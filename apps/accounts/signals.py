# apps/accounts/signals.py

from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.cache import cache
from .models import VerificationCode, PasswordResetAttempt, LoginSession
from .tasks import send_welcome_email, send_security_alert_email
import logging

User = get_user_model()
logger = logging.getLogger(__name__)


@receiver(post_save, sender=User)
def user_registration_complete(sender, instance, created, **kwargs):
    """
    Handle post-registration activities
    """
    if created and instance.is_verified:
        try:
            # Send welcome email asynchronously
            send_welcome_email.delay(str(instance.id))

            # Create notification preferences
            from apps.notifications.models import NotificationPreference

            NotificationPreference.objects.get_or_create(user=instance)

            # Create user profile based on role
            if instance.role == "Guide":
                from apps.profiles.models import GuideProfile

                GuideProfile.objects.get_or_create(user=instance)
            else:
                from apps.profiles.models import ClientProfile

                ClientProfile.objects.get_or_create(user=instance)

            # Log registration
            logger.info(f"New user registered: {instance.email} as {instance.role}")

            # Update registration statistics
            cache_key = f"registration_stats_{timezone.now().date()}"
            current_count = cache.get(cache_key, 0)
            cache.set(cache_key, current_count + 1, timeout=86400)  # 24 hours

        except Exception as e:
            logger.error(
                f"Error in post-registration processing for {instance.email}: {str(e)}"
            )


@receiver(post_save, sender=VerificationCode)
def verification_code_created(sender, instance, created, **kwargs):
    """
    Handle verification code creation
    """
    if created:
        try:
            # Log code creation
            logger.info(
                f"Verification code created for {instance.email} "
                f"({instance.code_type}) from IP {instance.ip_address}"
            )

            # Update rate limiting cache
            cache_key = f"verification_codes_{instance.email}_{timezone.now().hour}"
            current_count = cache.get(cache_key, 0)
            cache.set(cache_key, current_count + 1, timeout=3600)  # 1 hour

            # Check for suspicious activity (too many codes)
            if current_count >= 5:  # More than 5 codes per hour
                logger.warning(
                    f"Suspicious verification code activity for {instance.email}: "
                    f"{current_count + 1} codes in last hour"
                )

                # Send security alert to admins
                send_security_alert_email.delay(
                    alert_type="excessive_verification_codes",
                    details={
                        "email": instance.email,
                        "ip_address": instance.ip_address,
                        "count": current_count + 1,
                        "time_window": "1 hour",
                    },
                )

        except Exception as e:
            logger.error(f"Error processing verification code creation: {str(e)}")


@receiver(post_save, sender=PasswordResetAttempt)
def password_reset_requested(sender, instance, created, **kwargs):
    """
    Handle password reset attempts
    """
    if created:
        try:
            # Log reset attempt
            logger.info(
                f"Password reset attempted for {instance.email} "
                f"from IP {instance.ip_address} - {'Success' if instance.success else 'Failed'}"
            )

            # Check for brute force attempts
            recent_attempts = PasswordResetAttempt.objects.filter(
                email=instance.email,
                created_at__gte=timezone.now() - timezone.timedelta(hours=1),
            ).count()

            if recent_attempts >= 5:  # More than 5 attempts per hour
                logger.warning(
                    f"Excessive password reset attempts for {instance.email}: "
                    f"{recent_attempts} attempts in last hour"
                )

                # Send security alert
                send_security_alert_email.delay(
                    alert_type="excessive_password_reset",
                    details={
                        "email": instance.email,
                        "ip_address": instance.ip_address,
                        "attempts": recent_attempts,
                        "time_window": "1 hour",
                    },
                )

        except Exception as e:
            logger.error(f"Error processing password reset attempt: {str(e)}")


@receiver(post_save, sender=LoginSession)
def login_session_created(sender, instance, created, **kwargs):
    """
    Handle login session creation
    """
    if created:
        try:
            # Log new session
            logger.info(
                f"New login session for {instance.user.email} "
                f"from IP {instance.ip_address} using {instance.device_type}"
            )

            # Update user's last login
            instance.user.last_login = timezone.now()
            instance.user.last_login_ip = instance.ip_address
            instance.user.save(update_fields=["last_login", "last_login_ip"])

            # Check for multiple active sessions
            active_sessions = LoginSession.objects.filter(
                user=instance.user, is_active=True
            ).count()

            if active_sessions > 5:  # More than 5 active sessions
                logger.warning(
                    f"User {instance.user.email} has {active_sessions} active sessions"
                )

            # Check for suspicious login patterns
            recent_sessions = LoginSession.objects.filter(
                user=instance.user,
                created_at__gte=timezone.now() - timezone.timedelta(hours=1),
            )

            # Check for logins from different countries/IPs
            different_ips = recent_sessions.values_list(
                "ip_address", flat=True
            ).distinct()
            if len(different_ips) > 3:  # More than 3 different IPs in an hour
                send_security_alert_email.delay(
                    alert_type="suspicious_login_pattern",
                    details={
                        "user_email": instance.user.email,
                        "different_ips": list(different_ips),
                        "session_count": recent_sessions.count(),
                        "time_window": "1 hour",
                    },
                )

        except Exception as e:
            logger.error(f"Error processing login session creation: {str(e)}")


@receiver(pre_delete, sender=User)
def user_deletion_cleanup(sender, instance, **kwargs):
    """
    Cleanup related data when user is deleted
    """
    try:
        # Log user deletion
        logger.info(f"User {instance.email} is being deleted")

        # Cleanup verification codes
        VerificationCode.objects.filter(email=instance.email).delete()

        # Cleanup password reset attempts
        PasswordResetAttempt.objects.filter(email=instance.email).delete()

        # Cleanup login sessions
        LoginSession.objects.filter(user=instance).delete()

        # Clear cache entries
        cache_keys = [
            f"verification_codes_{instance.email}_*",
            f"login_attempts_{instance.email}_*",
            f"password_reset_{instance.email}_*",
        ]

        for key_pattern in cache_keys:
            cache.delete_pattern(key_pattern)

        logger.info(f"Cleanup completed for deleted user {instance.email}")

    except Exception as e:
        logger.error(f"Error during user deletion cleanup: {str(e)}")


def cleanup_expired_data(sender, **kwargs):
    """
    Periodic cleanup of expired data
    """
    try:
        from datetime import timedelta

        now = timezone.now()

        # Cleanup expired verification codes
        expired_codes = VerificationCode.objects.filter(expires_at__lt=now)
        code_count = expired_codes.count()
        expired_codes.delete()

        # Cleanup old password reset attempts (older than 30 days)
        old_attempts = PasswordResetAttempt.objects.filter(
            created_at__lt=now - timedelta(days=30)
        )
        attempt_count = old_attempts.count()
        old_attempts.delete()

        # Cleanup inactive sessions (older than 30 days)
        old_sessions = LoginSession.objects.filter(
            is_active=False, logged_out_at__lt=now - timedelta(days=30)
        )
        session_count = old_sessions.count()
        old_sessions.delete()

        logger.info(
            f"Cleanup completed: {code_count} expired codes, "
            f"{attempt_count} old attempts, {session_count} old sessions"
        )

        return {
            "expired_codes": code_count,
            "old_attempts": attempt_count,
            "old_sessions": session_count,
        }

    except Exception as e:
        logger.error(f"Error during data cleanup: {str(e)}")
        return None


# Custom signal for rate limiting
class RateLimitExceeded:
    """
    Custom signal class for rate limit violations
    """

    def __init__(
        self, email=None, ip_address=None, action=None, current_count=None, limit=None
    ):
        self.email = email
        self.ip_address = ip_address
        self.action = action
        self.current_count = current_count
        self.limit = limit


@receiver(post_save, sender=VerificationCode)
def check_verification_code_rate_limit(sender, instance, created, **kwargs):
    """
    Monitor verification code rate limits
    """
    if created:
        try:
            from datetime import timedelta

            # Check email-based rate limit
            hour_ago = timezone.now() - timedelta(hours=1)
            email_count = VerificationCode.objects.filter(
                email=instance.email, created_at__gte=hour_ago
            ).count()

            if email_count > 5:  # More than 5 per hour per email
                rate_limit_exceeded.send(
                    sender=sender,
                    email=instance.email,
                    action="verification_code_request",
                    current_count=email_count,
                    limit=5,
                )

            # Check IP-based rate limit
            if instance.ip_address:
                ip_count = VerificationCode.objects.filter(
                    ip_address=instance.ip_address, created_at__gte=hour_ago
                ).count()

                if ip_count > 20:  # More than 20 per hour per IP
                    rate_limit_exceeded.send(
                        sender=sender,
                        ip_address=instance.ip_address,
                        action="verification_code_request",
                        current_count=ip_count,
                        limit=20,
                    )

        except Exception as e:
            logger.error(f"Error checking verification code rate limits: {str(e)}")


# Create custom signal
from django.dispatch import Signal

rate_limit_exceeded = Signal()


@receiver(rate_limit_exceeded)
def handle_rate_limit_exceeded(sender, **kwargs):
    """
    Handle rate limit violations
    """
    try:
        email = kwargs.get("email")
        ip_address = kwargs.get("ip_address")
        action = kwargs.get("action")
        current_count = kwargs.get("current_count")
        limit = kwargs.get("limit")

        # Log the violation
        logger.warning(
            f"Rate limit exceeded for {action}: "
            f"Email: {email}, IP: {ip_address}, "
            f"Count: {current_count}, Limit: {limit}"
        )

        # Send alert to administrators
        send_security_alert_email.delay(
            alert_type="rate_limit_exceeded",
            details={
                "email": email,
                "ip_address": ip_address,
                "action": action,
                "current_count": current_count,
                "limit": limit,
                "timestamp": timezone.now().isoformat(),
            },
        )

        # Temporarily block the IP if necessary
        if current_count > limit * 2:  # Double the limit
            cache_key = f"blocked_ip_{ip_address}"
            cache.set(cache_key, True, timeout=3600)  # Block for 1 hour

            logger.warning(
                f"IP {ip_address} temporarily blocked due to excessive requests"
            )

    except Exception as e:
        logger.error(f"Error handling rate limit exceeded: {str(e)}")


# Security monitoring signals
@receiver(post_save, sender=User)
def monitor_user_changes(sender, instance, created, **kwargs):
    """
    Monitor important user account changes
    """
    if not created:  # Only for updates
        try:
            # Check if important fields were changed
            if (
                hasattr(instance, "_original_email")
                and instance._original_email != instance.email
            ):
                logger.warning(
                    f"Email changed for user {instance._original_email} to {instance.email}"
                )

                # Send notification to both old and new email
                send_security_alert_email.delay(
                    alert_type="email_changed",
                    details={
                        "old_email": instance._original_email,
                        "new_email": instance.email,
                        "user_id": str(instance.id),
                        "timestamp": timezone.now().isoformat(),
                    },
                )

            # Check for role changes
            if (
                hasattr(instance, "_original_role")
                and instance._original_role != instance.role
            ):
                logger.warning(
                    f"Role changed for user {instance.email} "
                    f"from {instance._original_role} to {instance.role}"
                )

                send_security_alert_email.delay(
                    alert_type="role_changed",
                    details={
                        "email": instance.email,
                        "old_role": instance._original_role,
                        "new_role": instance.role,
                        "user_id": str(instance.id),
                        "timestamp": timezone.now().isoformat(),
                    },
                )

        except Exception as e:
            logger.error(f"Error monitoring user changes: {str(e)}")


# Store original values for comparison
@receiver(post_save, sender=User)
def store_original_user_values(sender, instance, **kwargs):
    """
    Store original values for change detection
    """
    try:
        if instance.pk:  # Only for existing users
            original_user = User.objects.get(pk=instance.pk)
            instance._original_email = original_user.email
            instance._original_role = original_user.role
    except User.DoesNotExist:
        pass
    except Exception as e:
        logger.error(f"Error storing original user values: {str(e)}")


# Account statistics signals
@receiver(post_save, sender=User)
def update_registration_statistics(sender, instance, created, **kwargs):
    """
    Update registration statistics
    """
    if created:
        try:
            # Update daily registration count
            today = timezone.now().date()
            cache_key = f"registrations_{today}"
            current_count = cache.get(cache_key, 0)
            cache.set(cache_key, current_count + 1, timeout=86400)  # 24 hours

            # Update role-based statistics
            role_cache_key = f"registrations_{instance.role}_{today}"
            role_count = cache.get(role_cache_key, 0)
            cache.set(role_cache_key, role_count + 1, timeout=86400)

            # Update weekly and monthly counters
            week_key = f"registrations_week_{timezone.now().isocalendar()[1]}"
            month_key = f"registrations_month_{timezone.now().month}"

            cache.set(week_key, cache.get(week_key, 0) + 1, timeout=604800)  # 7 days
            cache.set(
                month_key, cache.get(month_key, 0) + 1, timeout=2592000
            )  # 30 days

        except Exception as e:
            logger.error(f"Error updating registration statistics: {str(e)}")
