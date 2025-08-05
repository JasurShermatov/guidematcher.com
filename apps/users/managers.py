# apps/users/managers.py

from django.contrib.auth.models import BaseUserManager
from django.utils import timezone


class UserManager(BaseUserManager):
    """
    Custom user manager for the User model
    """

    def create_user(self, email, password=None, **extra_fields):
        """
        Create and return a regular user with email and password
        """
        if not email:
            raise ValueError("The Email field must be set")

        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        """
        Create and return a superuser with email and password
        """
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("is_verified", True)
        extra_fields.setdefault("role", "Admin")

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(email, password, **extra_fields)

    def get_by_email(self, email):
        """
        Get user by email address
        """
        try:
            return self.get(email=email)
        except self.model.DoesNotExist:
            return None

    def active_users(self):
        """
        Return only active users
        """
        return self.filter(is_active=True)

    def verified_users(self):
        """
        Return only verified users
        """
        return self.filter(is_verified=True)

    def clients(self):
        """
        Return only client users
        """
        return self.filter(role="Client")

    def guides(self):
        """
        Return only guide users
        """
        return self.filter(role="Guide")
