#  apps/users/permissions.py
from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsOwnerOrAdmin(BasePermission):
    """
    - Admin → hamma userlarga kirishi mumkin
    - Oddiy user → faqat o‘z profilini ko‘rishi va yangilashi mumkin
    """

    def has_object_permission(self, request, view, obj):
        # Admin → har doim ruxsat
        if request.user.is_staff or request.user.is_superuser:
            return True

        # Oddiy user → faqat o‘ziga
        return obj == request.user
