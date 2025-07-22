# apps/accounts/models.py
from django.db import models
from django.utils import timezone


class EmailVerification(models.Model):
    email = models.EmailField(db_index=True, unique=True)  # 1-email=1-aktiKodni
    code = models.CharField(max_length=6, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    verified = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.email} ({self.code})"

    def is_expired(self) -> bool:
        return timezone.now() >= self.expires_at

    def mark_used(self, save=True, verified=False):
        self.is_used = True
        if verified:
            self.verified = True
        if save:
            self.save(update_fields=["is_used", "verified"])
