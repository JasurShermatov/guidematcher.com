from rest_framework.permissions import BasePermission


class IsAuthenticatedAndOwnerOrReadOnly(BasePermission):

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        return (obj.client_profile and obj.client_profile.user == request.user) or (
            obj.customer_profile.user == request.user
        )
