# apps/common/mixins.py
from django.db import models
from django.utils.translation import gettext_lazy as _


class TimestampMixin(models.Model):

    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Created at"))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_("Updated at"))

    class Meta:
        abstract = True


class SoftDeleteMixin(models.Model):

    is_deleted = models.BooleanField(default=False, verbose_name=_("Is deleted"))
    deleted_at = models.DateTimeField(
        null=True, blank=True, verbose_name=_("Deleted at")
    )
    deleted_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="%(class)s_deleted",
        verbose_name=_("Deleted by"),
    )

    class Meta:
        abstract = True

    def soft_delete(self, user=None):
        from django.utils import timezone

        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.deleted_by = user
        self.save(update_fields=["is_deleted", "deleted_at", "deleted_by"])

    def restore(self):
        self.is_deleted = False
        self.deleted_at = None
        self.deleted_by = None
        self.save(update_fields=["is_deleted", "deleted_at", "deleted_by"])


class OrderableMixin(models.Model):

    order = models.PositiveIntegerField(default=0, verbose_name=_("Display order"))

    class Meta:
        abstract = True
        ordering = ["order"]

    def move_up(self):
        if self.order > 0:
            self.order -= 1
            self.save(update_fields=["order"])

    def move_down(self):
        self.order += 1
        self.save(update_fields=["order"])


class PublishableMixin(models.Model):

    is_published = models.BooleanField(default=True, verbose_name=_("Is published"))
    published_at = models.DateTimeField(
        null=True, blank=True, verbose_name=_("Published at")
    )

    class Meta:
        abstract = True

    def publish(self):
        from django.utils import timezone

        self.is_published = True
        if not self.published_at:
            self.published_at = timezone.now()
        self.save(update_fields=["is_published", "published_at"])

    def unpublish(self):
        self.is_published = False
        self.save(update_fields=["is_published"])


class SEOMixin(models.Model):

    meta_title = models.CharField(
        max_length=255, blank=True, verbose_name=_("Meta title")
    )
    meta_description = models.TextField(blank=True, verbose_name=_("Meta description"))
    meta_keywords = models.CharField(
        max_length=255, blank=True, verbose_name=_("Meta keywords")
    )
    slug = models.SlugField(max_length=255, blank=True, verbose_name=_("URL slug"))

    class Meta:
        abstract = True
