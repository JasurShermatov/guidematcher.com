from rest_framework.permissions import BasePermission


class IsAuthenticatedAndOwnerOrReadOnly(BasePermission):
    """
    Faqat login qilgan user booking yaratishi, ko'rishi va update qilishi mumkin.
    Client va customer o'zi bilan bog'liq bookinglarga ruxsat bor.
    """

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        # faqat client yoki customer o'z bookingini ko'rishi yoki update qilishi mumkin
        return (obj.client_profile and obj.client_profile.user == request.user) or (
            obj.customer_profile.user == request.user
        )
