# apps/reviews/permissions.py
from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsClientOwner(BasePermission):

    def has_object_permission(self, request, view, obj):
        return request.method in SAFE_METHODS or obj.client == request.user


class IsProviderOwner(BasePermission):

    def has_object_permission(self, request, view, obj):
        # obj bu ReviewResponse yoki Review bo‘lishi mumkin
        review = obj.review if hasattr(obj, "review") else obj
        return review.customer.user == request.user
