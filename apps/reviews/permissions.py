from rest_framework import permissions
from django.contrib.auth import get_user_model
from .models import Review, ReviewReport

User = get_user_model()


class IsReviewOwnerOrStaff(permissions.BasePermission):
    """
    Allows access to the review owner (reviewer) or staff
    """

    def has_object_permission(self, request, view, obj):
        return request.user.is_authenticated and (
            request.user.is_staff
            or (isinstance(obj, Review) and obj.reviewer == request.user)
        )


class IsReviewGuideOrStaff(permissions.BasePermission):
    """
    Allows access to the guide or staff for responding to reviews
    """

    def has_object_permission(self, request, view, obj):
        return request.user.is_authenticated and (
            request.user.is_staff
            or (isinstance(obj, Review) and obj.guide == request.user)
        )


class CanReportReview(permissions.BasePermission):
    """
    Allows authenticated users to report reviews
    """

    def has_permission(self, request, view):
        return request.user.is_authenticated


class IsReportOwnerOrStaff(permissions.BasePermission):
    """
    Allows access to the report owner (reporter) or staff
    """

    def has_object_permission(self, request, view, obj):
        return request.user.is_authenticated and (
            request.user.is_staff
            or (isinstance(obj, ReviewReport) and obj.reporter == request.user)
        )
