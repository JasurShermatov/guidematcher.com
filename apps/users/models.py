# apps/users/models.py

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.utils import timezone
from django.core.validators import EmailValidator
from .managers import UserManager
from apps.common.models import TimeStampedModel


class User(AbstractBaseUser, PermissionsMixin, TimeStampedModel):
    """
    Custom User model for TravMatch platform
    """

    ROLE_CHOICES = [
        ("Client", "Client"),
        ("Guide", "Guide"),
        ("Admin", "Admin"),
    ]

    email = models.EmailField(
        unique=True, validators=[EmailValidator()], help_text="User's email address"
    )
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="Client")
    country = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    profile_picture = models.URLField(blank=True, null=True)
    bio = models.TextField(blank=True)

    # Account status
    is_active = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)

    # Tracking fields
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    failed_login_attempts = models.IntegerField(default=0)
    last_failed_login = models.DateTimeField(null=True, blank=True)

    # Join date
    date_joined = models.DateTimeField(default=timezone.now)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    class Meta:
        db_table = "users"
        verbose_name = "User"
        verbose_name_plural = "Users"
        indexes = [
            models.Index(fields=["email"]),
            models.Index(fields=["role"]),
            models.Index(fields=["is_active"]),
        ]

    def __str__(self):
        return self.email

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    def get_short_name(self):
        return self.first_name

    def is_client(self):
        return self.role == "Client"

    def is_guide(self):
        return self.role == "Guide"

    def is_admin_user(self):
        return self.role == "Admin"


class EmailVerification(TimeStampedModel):
    """
    Email verification model for account activation
    """

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    token = models.CharField(max_length=100, unique=True)
    is_used = models.BooleanField(default=False)
    expires_at = models.DateTimeField()

    class Meta:
        db_table = "email_verifications"
        verbose_name = "Email Verification"
        verbose_name_plural = "Email Verifications"

    def __str__(self):
        return f"Email verification for {self.user.email}"

    def is_expired(self):
        return timezone.now() > self.expires_at


class LoginAttempt(TimeStampedModel):
    """
    Track login attempts for security
    """

    email = models.EmailField()
    ip_address = models.GenericIPAddressField()
    success = models.BooleanField(default=False)
    user_agent = models.TextField(blank=True)

    class Meta:
        db_table = "login_attempts"
        verbose_name = "Login Attempt"
        verbose_name_plural = "Login Attempts"
        indexes = [
            models.Index(fields=["email", "created_at"]),
            models.Index(fields=["ip_address", "created_at"]),
        ]

    def __str__(self):
        return f"Login attempt for {self.email} - {'Success' if self.success else 'Failed'}"
