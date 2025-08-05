# apps/common/mixins.py

from django.db import models
import uuid


class UUIDModel(models.Model):
    """
    Abstract base model providing a UUID primary key
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class Meta:
        abstract = True


class SoftDeleteModel(models.Model):
    """
    Abstract base model for soft deletion
    """

    is_active = models.BooleanField(default=True)

    class Meta:
        abstract = True

    def delete(self, *args, **kwargs):
        """Soft delete by setting is_active to False"""
        self.is_active = False
        self.save()

    def restore(self):
        """Restore a soft-deleted object"""
        self.is_active = True
        self.save()


class AuditableModel(models.Model):
    """
    Abstract base model for tracking created/updated by users
    """

    created_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="%(class)s_created",
    )
    updated_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="%(class)s_updated",
    )

    class Meta:
        abstract = True
