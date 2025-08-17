# apps/common/permissions.py

from rest_framework import permissions


class IsOwnerOrReadOnly(permissions.BasePermission):

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.user == request.user


class IsClient(permissions.BasePermission):

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_client


class IsCustomer(permissions.BasePermission):

    def has_permission(self, request, view):
        return (
            request.user and request.user.is_authenticated and request.user.is_customer
        )


class IsVerifiedCustomer(permissions.BasePermission):

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.is_customer
            and hasattr(request.user, "customer_profile")
            and request.user.customer_profile.is_verified
        )


class IsAdmin(permissions.BasePermission):

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_admin


class IsSuperAdmin(permissions.BasePermission):

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.is_superadmin
        )


class IsOwner(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):

        if hasattr(obj, "user"):
            return obj.user == request.user

        if hasattr(obj, "owner"):
            return obj.owner == request.user

        if hasattr(obj, "client"):
            return obj.client == request.user

        if hasattr(obj, "customer") and hasattr(obj.customer, "user"):
            return obj.customer.user == request.user

        return False


class IsBookingParticipant(permissions.BasePermission):

    def has_object_permission(self, request, view, obj):
        return obj.client == request.user or obj.customer.user == request.user


class IsChatParticipant(permissions.BasePermission):

    def has_object_permission(self, request, view, obj):
        return request.user in obj.participants.all()


class IsDisputeParticipant(permissions.BasePermission):

    def has_object_permission(self, request, view, obj):
        return (
            obj.reporter == request.user
            or obj.respondent == request.user
            or request.user.is_admin
        )


class IsVerifiedUser(permissions.BasePermission):

    def has_permission(self, request, view):
        return (
            request.user and request.user.is_authenticated and request.user.is_verified
        )
