# apps/users/models.py

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from apps.common.models import BaseModel, Country
from .managers import UserManager


class User(AbstractBaseUser, PermissionsMixin, BaseModel):
    """Custom user model with email authentication"""

    class UserRole(models.TextChoices):
        CLIENT = "client", _("Client (Tourist)")
        CUSTOMER = "customer", _("Customer (Service Provider)")
        ADMIN = "admin", _("Admin")
        SUPERADMIN = "superadmin", _("Superadmin")

    email = models.EmailField(unique=True, verbose_name=_("Email address"))
    phone = models.CharField(max_length=20, blank=True, verbose_name=_("Phone number"))
    first_name = models.CharField(max_length=150, verbose_name=_("First name"))
    last_name = models.CharField(max_length=150, verbose_name=_("Last name"))
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.CLIENT,
        verbose_name=_("User role"),
    )
    country = models.ForeignKey(
        Country,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="users",
        verbose_name=_("Country of origin"),
    )

    # Status fields
    is_active = models.BooleanField(default=True, verbose_name=_("Active status"))
    is_staff = models.BooleanField(default=False, verbose_name=_("Staff status"))
    is_verified = models.BooleanField(default=False, verbose_name=_("Email verified"))

    # Auth related
    date_joined = models.DateTimeField(
        default=timezone.now, verbose_name=_("Date joined")
    )
    last_login_ip = models.GenericIPAddressField(
        null=True, blank=True, verbose_name=_("Last login IP")
    )

    # Social auth
    google_id = models.CharField(
        max_length=255, blank=True, unique=True, null=True, verbose_name=_("Google ID")
    )
    facebook_id = models.CharField(
        max_length=255,
        blank=True,
        unique=True,
        null=True,
        verbose_name=_("Facebook ID"),
    )
    apple_id = models.CharField(
        max_length=255, blank=True, unique=True, null=True, verbose_name=_("Apple ID")
    )

    # Additional
    avatar = models.ImageField(
        upload_to="avatars/%Y/%m/",
        blank=True,
        null=True,
        verbose_name=_("Avatar"),
        help_text=_("Maximum file size: 5MB"),
    )
    bio = models.TextField(blank=True, verbose_name=_("Biography"))

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    class Meta:
        verbose_name = _("User")
        verbose_name_plural = _("Users")
        ordering = ["-date_joined"]

    def __str__(self):
        return self.get_full_name() or self.email

    def get_full_name(self):
        """Return the full name of the user"""
        return f"{self.first_name} {self.last_name}".strip()

    def get_short_name(self):
        """Return the short name of the user"""
        return self.first_name

    @property
    def is_client(self):
        return self.role == self.UserRole.CLIENT

    @property
    def is_customer(self):
        return self.role == self.UserRole.CUSTOMER

    @property
    def is_admin(self):
        return self.role in [self.UserRole.ADMIN, self.UserRole.SUPERADMIN]

    @property
    def is_superadmin(self):
        return self.role == self.UserRole.SUPERADMIN


class EmailVerification(BaseModel):
    """Email verification codes"""

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="email_verifications",
        verbose_name=_("User"),
    )
    email = models.EmailField(verbose_name=_("Email"))
    code = models.CharField(max_length=6, verbose_name=_("Verification code"))
    is_used = models.BooleanField(default=False, verbose_name=_("Is used"))
    expires_at = models.DateTimeField(verbose_name=_("Expires at"))

    class Meta:
        verbose_name = _("Email verification")
        verbose_name_plural = _("Email verifications")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.email} - {self.code}"

    @property
    def is_expired(self):
        return timezone.now() > self.expires_at


class LoginAttempt(BaseModel):
    """Track login attempts for security"""

    email = models.EmailField(verbose_name=_("Email"))
    ip_address = models.GenericIPAddressField(verbose_name=_("IP address"))
    user_agent = models.TextField(blank=True, verbose_name=_("User agent"))
    is_successful = models.BooleanField(default=False, verbose_name=_("Is successful"))
    failure_reason = models.CharField(
        max_length=255, blank=True, verbose_name=_("Failure reason")
    )

    class Meta:
        verbose_name = _("Login attempt")
        verbose_name_plural = _("Login attempts")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["email", "created_at"]),
            models.Index(fields=["ip_address", "created_at"]),
        ]

    def __str__(self):
        return f"{self.email} - {self.created_at}"
