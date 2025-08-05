# apps/common/permissions.py

from rest_framework.permissions import BasePermission


class IsAuthenticated(BasePermission):
    """
    Allows access only to authenticated users
    """

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated


class IsGuideOrClient(BasePermission):
    """
    Allows access to the guide or client associated with an object, or staff
    """

    def has_object_permission(self, request, view, obj):
        return (
            hasattr(obj, "client")
            and request.user == obj.client
            or hasattr(obj, "guide")
            and request.user == obj.guide
            or request.user.is_staff
        )


class IsGuide(BasePermission):
    """
    Allows access only to users with role 'Guide'
    """

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == "Guide"
        )


class IsClient(BasePermission):
    """
    Allows access only to users with role 'Client'
    """

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == "Client"
        )


class IsStaff(BasePermission):
    """
    Allows access only to staff users
    """

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_staff
