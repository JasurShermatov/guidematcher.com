from django.db import models
from django.utils import timezone

class EmailVerification(models.Model):
    email = models.EmailField()
    code = models.CharField(max_length=6)
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    def is_expired(self):
        return self.expires_at < timezone.now()

    def __str__(self):
        return f"{self.email} - {self.code} ({'used' if self.is_used else 'active'})"