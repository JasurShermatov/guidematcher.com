from django.db import models
from django.utils import timezone


class EmailVerification(models.Model):
    email = models.EmailField(unique=True)
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)  # foydalanilganmi
    verified = models.BooleanField(default=False)  # yakuniy tasdiq (ixtiyoriy)

    def is_expired(self) -> bool:
        return timezone.now() >= self.expires_at

    def mark_used(self, save=True):
        self.is_used = True
        if save:
            self.save(update_fields=["is_used"])
