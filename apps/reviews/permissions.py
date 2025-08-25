# ============================================
# 4. apps/reviews/permissions.py
# ============================================

from rest_framework.permissions import BasePermission


class IsReviewOwner(BasePermission):

    def has_object_permission(self, request, view, obj):
        return obj.client == request.user
