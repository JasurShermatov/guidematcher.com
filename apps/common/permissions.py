# apps/common/permissions.py

from rest_framework import permissions


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object to edit it.
    """

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions are only allowed to the owner
        return obj.user == request.user


class IsClient(permissions.BasePermission):
    """
    Permission to check if user is a client
    """

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_client


class IsCustomer(permissions.BasePermission):
    """
    Permission to check if user is a customer (service provider)
    """

    def has_permission(self, request, view):
        return (
            request.user and request.user.is_authenticated and request.user.is_customer
        )


class IsVerifiedCustomer(permissions.BasePermission):
    """
    Permission to check if user is a verified customer
    """

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.is_customer
            and hasattr(request.user, "customer_profile")
            and request.user.customer_profile.is_verified
        )


class IsAdmin(permissions.BasePermission):
    """
    Permission to check if user is admin or superadmin
    """

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_admin


class IsSuperAdmin(permissions.BasePermission):
    """
    Permission to check if user is superadmin
    """

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.is_superadmin
        )


class IsOwner(permissions.BasePermission):
    """
    Permission to check if user owns the object
    """

    def has_object_permission(self, request, view, obj):
        # Check if object has user field
        if hasattr(obj, "user"):
            return obj.user == request.user

        # Check if object has owner field
        if hasattr(obj, "owner"):
            return obj.owner == request.user

        # Check if object has client field
        if hasattr(obj, "client"):
            return obj.client == request.user

        # Check if object has customer field (for profiles)
        if hasattr(obj, "customer") and hasattr(obj.customer, "user"):
            return obj.customer.user == request.user

        return False


class IsBookingParticipant(permissions.BasePermission):
    """
    Permission to check if user is participant of the booking
    """

    def has_object_permission(self, request, view, obj):
        return obj.client == request.user or obj.customer.user == request.user


class IsChatParticipant(permissions.BasePermission):
    """
    Permission to check if user is participant of the chat
    """

    def has_object_permission(self, request, view, obj):
        return request.user in obj.participants.all()


class IsDisputeParticipant(permissions.BasePermission):
    """
    Permission to check if user is participant of the dispute
    """

    def has_object_permission(self, request, view, obj):
        return (
            obj.reporter == request.user
            or obj.respondent == request.user
            or request.user.is_admin
        )


class IsVerifiedUser(permissions.BasePermission):
    """
    Permission to check if user's email is verified
    """

    def has_permission(self, request, view):
        return (
            request.user and request.user.is_authenticated and request.user.is_verified
        )
