"""
User modeli.

Eslatma:
    E-mail verifikatsiya endi `apps.accounts` ilovasida.
    Users app faqat foydalanuvchi identifikatsiyasi va profilga mas'ul.
"""

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from apps.common.models import BaseModel, Country
from .managers import UserManager


class User(AbstractBaseUser, PermissionsMixin, BaseModel):
    """Custom user model with e-mail login & role support."""

    class UserRole(models.TextChoices):
        CLIENT = "client", _("Client (Tourist)")
        CUSTOMER = "customer", _("Customer (Service Provider)")
        ADMIN = "admin", _("Admin")
        SUPERADMIN = "superadmin", _("Superadmin")

    # --- Auth / identity ---
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

    # --- Status flags ---
    is_active = models.BooleanField(default=True, verbose_name=_("Active status"))
    is_staff = models.BooleanField(default=False, verbose_name=_("Staff status"))
    is_verified = models.BooleanField(
        default=False, verbose_name=_("Email verified")
    )  # accounts app tasdiqlaydi

    # --- Dates / meta ---
    date_joined = models.DateTimeField(
        default=timezone.now, verbose_name=_("Date joined")
    )
    last_login_ip = models.GenericIPAddressField(
        null=True, blank=True, verbose_name=_("Last login IP")
    )

    # --- Social auth IDs ---
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

    # --- UI / extra ---
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

    def __str__(self) -> str:  # type: ignore[override]
        return self.get_full_name() or self.email

    # ----- Helpers -----
    def get_full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()

    def get_short_name(self) -> str:
        return self.first_name

    @property
    def is_client(self) -> bool:
        return self.role == self.UserRole.CLIENT

    @property
    def is_customer(self) -> bool:
        return self.role == self.UserRole.CUSTOMER

    @property
    def is_admin(self) -> bool:
        return self.role in [self.UserRole.ADMIN, self.UserRole.SUPERADMIN]

    @property
    def is_superadmin(self) -> bool:
        return self.role == self.UserRole.SUPERADMIN


# (Ixtiyoriy) LoginAttempt ni vaqtincha users’da qoldiramiz.
# Agar accounts/security app’iga ko‘chirmoqchi bo‘lsangiz xabar bering.
class LoginAttempt(BaseModel):
    """
    Xavfsizlik uchun login urinishlarini log qiladi.
    (Brute force, bloklash, statistik tahlil uchun.)
    """

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

    def __str__(self) -> str:  # type: ignore[override]
        return f"{self.email} - {self.created_at}"
