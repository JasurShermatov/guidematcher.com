# apps/reviews/permissions.py
from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsClientOwner(BasePermission):
    """PUT/PATCH/DELETE faqat review egasi (client) ga ruxsat."""

    def has_object_permission(self, request, view, obj):
        return request.method in SAFE_METHODS or obj.client == request.user


class IsProviderOwner(BasePermission):
    """
    ReviewResponse uchun:
    faqat provider (customer.user) o‘z review’iga javob yozishi / tahrirlashi mumkin
    """

    def has_object_permission(self, request, view, obj):
        # obj bu ReviewResponse yoki Review bo‘lishi mumkin
        review = obj.review if hasattr(obj, "review") else obj
        return review.customer.user == request.user
