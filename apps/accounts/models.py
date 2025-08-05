# apps/accounts/models.py (Updated VerificationCode model)

from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
import random
import string
import logging
from apps.common.models import TimeStampedModel

User = get_user_model()
logger = logging.getLogger(__name__)


class VerificationCode(TimeStampedModel):
    """
    Email verification codes for registration and password reset
    """

    CODE_TYPES = [
        ("registration", "Registration"),
        ("password_reset", "Password Reset"),
        ("email_change", "Email Change"),
    ]

    email = models.EmailField(db_index=True)
    code = models.CharField(max_length=6, db_index=True)
    code_type = models.CharField(max_length=20, choices=CODE_TYPES, db_index=True)

    # Status tracking
    is_used = models.BooleanField(default=False, db_index=True)
    used_at = models.DateTimeField(null=True, blank=True)

    # Expiration
    expires_at = models.DateTimeField(db_index=True)

    # Attempt tracking
    attempts = models.PositiveIntegerField(default=0)
    max_attempts = models.PositiveIntegerField(default=5)  # Increased from 3 to 5

    # IP tracking for security
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        db_table = "verification_codes"
        verbose_name = "Verification Code"
        verbose_name_plural = "Verification Codes"
        indexes = [
            models.Index(fields=["email", "code_type", "is_used"]),
            models.Index(fields=["code", "code_type"]),
            models.Index(fields=["expires_at"]),
            models.Index(fields=["created_at"]),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"Code {self.code[:2]}**** for {self.email} ({self.code_type})"

    @classmethod
    def generate_code(cls, email, code_type, ip_address=None):
        """Generate a new verification code"""
        try:
            # Generate 6-digit code
            code = "".join(random.choices(string.digits, k=6))

            # Set expiration (10 minutes from now - increased from 5 minutes)
            expires_at = timezone.now() + timedelta(seconds=600)  # 10 minutes

            # Deactivate previous unused codes for the same email and type
            cls.objects.filter(email=email, code_type=code_type, is_used=False).update(
                is_used=True, used_at=timezone.now()
            )

            # Create new verification code
            verification_code = cls.objects.create(
                email=email,
                code=code,
                code_type=code_type,
                expires_at=expires_at,
                ip_address=ip_address,
            )

            logger.info(
                f"Generated verification code for {email} ({code_type}): "
                f"ID={verification_code.id}, expires_at={expires_at}"
            )

            return verification_code

        except Exception as e:
            logger.error(f"Error generating verification code for {email}: {str(e)}")
            raise

    def is_expired(self):
        """Check if code has expired"""
        now = timezone.now()
        is_exp = now > self.expires_at

        if is_exp:
            logger.debug(
                f"Code {self.id} is expired: now={now}, expires_at={self.expires_at}"
            )

        return is_exp

    def is_valid(self):
        """Check if code is valid (not used, not expired, attempts not exceeded)"""
        valid = (
            not self.is_used
            and not self.is_expired()
            and self.attempts < self.max_attempts
        )

        logger.debug(
            f"Code {self.id} validity check: "
            f"is_used={self.is_used}, "
            f"is_expired={self.is_expired()}, "
            f"attempts={self.attempts}/{self.max_attempts}, "
            f"valid={valid}"
        )

        return valid

    def verify(self, input_code):
        """Verify the code"""
        logger.info(
            f"Verifying code {self.id} for {self.email}: "
            f"input='{input_code}', stored='{self.code}'"
        )

        # Always increment attempts first
        self.attempts += 1

        try:
            self.save(update_fields=["attempts"])
            logger.debug(f"Incremented attempts for code {self.id} to {self.attempts}")
        except Exception as e:
            logger.error(f"Error updating attempts for code {self.id}: {str(e)}")
            return False

        # Check if code is still valid after incrementing attempts
        if not self.is_valid():
            logger.warning(
                f"Code {self.id} is no longer valid after attempt {self.attempts}"
            )
            return False

        # Check if the input code matches
        if self.code == str(input_code).strip():
            try:
                self.is_used = True
                self.used_at = timezone.now()
                self.save(update_fields=["is_used", "used_at"])

                logger.info(
                    f"Code {self.id} verified successfully for {self.email} "
                    f"after {self.attempts} attempts"
                )
                return True

            except Exception as e:
                logger.error(f"Error marking code {self.id} as used: {str(e)}")
                return False
        else:
            logger.warning(
                f"Code {self.id} verification failed: "
                f"input '{input_code}' != stored '{self.code}'"
            )
            return False

    @classmethod
    def cleanup_expired(cls):
        """Clean up expired codes"""
        try:
            expired_codes = cls.objects.filter(expires_at__lt=timezone.now())
            count = expired_codes.count()
            expired_codes.delete()

            logger.info(f"Cleaned up {count} expired verification codes")
            return count

        except Exception as e:
            logger.error(f"Error cleaning up expired codes: {str(e)}")
            return 0

    @classmethod
    def get_valid_code(cls, email, code_type):
        """Get the most recent valid code for email and type"""
        try:
            return (
                cls.objects.filter(
                    email=email,
                    code_type=code_type,
                    is_used=False,
                    expires_at__gt=timezone.now(),
                )
                .order_by("-created_at")
                .first()
            )

        except Exception as e:
            logger.error(f"Error getting valid code for {email}: {str(e)}")
            return None

    def get_remaining_time(self):
        """Get remaining time in seconds before expiration"""
        if self.is_expired():
            return 0

        remaining = (self.expires_at - timezone.now()).total_seconds()
        return max(0, int(remaining))

    def get_remaining_attempts(self):
        """Get remaining verification attempts"""
        return max(0, self.max_attempts - self.attempts)


# Keep other models (PasswordResetAttempt, LoginSession) as they were
class PasswordResetAttempt(TimeStampedModel):
    """
    Track password reset attempts for security
    """

    email = models.EmailField(db_index=True)
    ip_address = models.GenericIPAddressField(db_index=True)
    success = models.BooleanField(default=False)

    class Meta:
        db_table = "password_reset_attempts"
        verbose_name = "Password Reset Attempt"
        verbose_name_plural = "Password Reset Attempts"
        indexes = [
            models.Index(fields=["email", "created_at"]),
            models.Index(fields=["ip_address", "created_at"]),
        ]

    def __str__(self):
        return f"Password reset attempt for {self.email}"

    @classmethod
    def can_attempt(
        cls, email=None, ip_address=None, window_minutes=60, max_attempts=5
    ):
        """Check if password reset can be attempted"""
        cutoff_time = timezone.now() - timedelta(minutes=window_minutes)

        filters = models.Q(created_at__gte=cutoff_time)
        if email:
            filters &= models.Q(email=email)
        if ip_address:
            filters &= models.Q(ip_address=ip_address)

        recent_attempts = cls.objects.filter(filters).count()
        return recent_attempts < max_attempts


class LoginSession(TimeStampedModel):
    """
    Track user login sessions
    """

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="login_sessions"
    )
    session_key = models.CharField(max_length=40, unique=True)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)

    # Session status
    is_active = models.BooleanField(default=True)
    logged_out_at = models.DateTimeField(null=True, blank=True)

    # Device info
    device_type = models.CharField(max_length=50, blank=True)
    browser = models.CharField(max_length=100, blank=True)
    os = models.CharField(max_length=100, blank=True)

    class Meta:
        db_table = "login_sessions"
        verbose_name = "Login Session"
        verbose_name_plural = "Login Sessions"
        indexes = [
            models.Index(fields=["user", "is_active"]),
            models.Index(fields=["session_key"]),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"Session for {self.user.email} from {self.ip_address}"

    def logout(self):
        """Mark session as logged out"""
        self.is_active = False
        self.logged_out_at = timezone.now()
        self.save(update_fields=["is_active", "logged_out_at"])
