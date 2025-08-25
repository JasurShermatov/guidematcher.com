#  apps/profiles/permissions.py
from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsOwnerOrAdmin(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True

        user = request.user
        if user.is_admin:
            return True

        if hasattr(obj, "user"):
            return obj.user == user
        elif hasattr(obj, "customer") and hasattr(obj.customer, "user"):
            return obj.customer.user == user

        return False


class RoleBasedProfilePermission(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user.is_authenticated:
            return False

        if view.basename == "client-profile":
            return user.is_client or user.is_admin
        elif view.basename == "customer-profile":
            return user.is_customer or user.is_admin
        return True
