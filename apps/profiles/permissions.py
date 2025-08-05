from rest_framework import permissions
from django.contrib.auth import get_user_model

User = get_user_model()


class IsGuide(permissions.BasePermission):
    """
    Allows access only to users with role 'Guide'
    """

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "Guide"


class IsProfileOwnerOrStaff(permissions.BasePermission):
    """
    Allows access to profile owners or staff members
    """

    def has_object_permission(self, request, view, obj):
        return request.user.is_authenticated and (
            request.user.is_staff or obj.user == request.user
        )


class IsClientOrStaff(permissions.BasePermission):
    """
    Allows access to clients or staff members
    """

    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.role == "Client" or request.user.is_staff
        )
