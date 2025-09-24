#  apps/users/models.py
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from django.core.cache import cache

from apps.common.models import BaseModel, Country
from .managers import UserManager


class User(AbstractBaseUser, PermissionsMixin, BaseModel):
    class UserRole(models.TextChoices):
        CLIENT = "client", "Client"
        CUSTOMER = "customer", "Customer"
        ADMIN = "admin", "Admin"
        SUPERADMIN = "superadmin", "Superadmin"

    email = models.EmailField(unique=True, verbose_name=_("Email address"))
    first_name = models.CharField(max_length=150, verbose_name=_("First name"))
    last_name = models.CharField(max_length=150, verbose_name=_("Last name"))

    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.CLIENT,
        verbose_name=_("User role"),
    )

    full_name = models.CharField(
        max_length=301, blank=True, verbose_name=_("Full name")
    )
    country = models.ForeignKey(
        Country,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="users",
        verbose_name=_("Country of origin"),
    )
    country_name = models.CharField(
        max_length=128, blank=True, verbose_name=_("Country name")
    )

    is_active = models.BooleanField(default=True, verbose_name=_("Active status"))
    is_staff = models.BooleanField(default=False, verbose_name=_("Staff status"))
    is_verified = models.BooleanField(default=False, verbose_name=_("Email verified"))

    date_joined = models.DateTimeField(
        default=timezone.now, verbose_name=_("Date joined")
    )
    last_login_ip = models.GenericIPAddressField(
        null=True, blank=True, verbose_name=_("Last login IP")
    )

    avatar = models.ImageField(
        upload_to="avatars/%Y/%m/",
        blank=True,
        null=True,
        verbose_name=_("Avatar"),
        help_text=_("Max file size: 5MB"),
    )
    bio = models.TextField(blank=True, verbose_name=_("Biography"))

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    class Meta:
        verbose_name = _("User")
        verbose_name_plural = _("Users")
        ordering = ["-date_joined"]

    def __str__(self) -> str:
        return self.full_name or self.email

    def save(self, *args, **kwargs):
        self.full_name = f"{self.first_name} {self.last_name}".strip()
        if self.country:
            self.country_name = self.country.name
        super().save(*args, **kwargs)
        cache.set(f"user:{self.pk}", self, timeout=3600)  # cache 1 soat

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


class UserNotificationSettings(BaseModel):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="notify")
    allow_marketing = models.BooleanField(default=True)
    allow_system = models.BooleanField(default=True)

    def __str__(self):
        return f"NotifySettings({self.user.email})"
