from rest_framework import viewsets, mixins, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone

from apps.common.permissions import IsAdmin
from apps.notifications.models import (
    NotificationType,
    Notification,
    UserNotificationSettings,
    UserNotificationTypeSettings,
    EmailLog,
)
from apps.notifications.serializers import (
    NotificationTypeSerializer,
    NotificationSerializer,
    UserNotificationSettingsSerializer,
    UserNotificationTypeSettingsSerializer,
    EmailLogSerializer,
)


# ─────────── NotificationType (ro‘yxat faqat) ───────────
class NotificationTypeViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    queryset = NotificationType.objects.all().order_by("category", "name")
    serializer_class = NotificationTypeSerializer
    permission_classes = [IsAuthenticated]


# ─────────── Notification ───────────
class NotificationViewSet(viewsets.ModelViewSet):
    """
    /notifications/       – list (faqat o‘z foydalanuvchisi)
    /notifications/{id}/mark_read/
    /notifications/mark_all_read/
    /notifications/unread_count/
    """

    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["is_read", "priority", "notification_type__category"]
    search_fields = ["title", "message"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).select_related(
            "notification_type"
        )

    # -------- extra actions --------
    @action(detail=False, methods=["get"])
    def unread_count(self, request):
        cnt = self.get_queryset().filter(is_read=False).count()
        return Response({"unread": cnt})

    @action(detail=False, methods=["post"])
    def mark_all_read(self, request):
        qs = self.get_queryset().filter(is_read=False)
        updated = qs.update(is_read=True, read_at=timezone.now())
        return Response({"marked": updated})

    @action(detail=True, methods=["post"])
    def mark_read(self, request, pk=None):
        obj = self.get_object()
        if not obj.is_read:
            obj.is_read = True
            obj.read_at = timezone.now()
            obj.save(update_fields=["is_read", "read_at"])
        return Response(self.get_serializer(obj).data)


# ─────────── Global setting (retrieve/update) ───────────
class UserNotificationSettingsView(
    mixins.RetrieveModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet
):
    serializer_class = UserNotificationSettingsSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        # always return / create current user settings
        obj, _ = UserNotificationSettings.objects.get_or_create(user=self.request.user)
        return obj


# ─────────── Per-type setting (list/update) ───────────
class UserNotificationTypeSettingsViewSet(
    mixins.ListModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet
):
    serializer_class = UserNotificationTypeSettingsSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            UserNotificationTypeSettings.objects.filter(user=self.request.user)
            .select_related("notification_type")
            .order_by("notification_type__category")
        )


# ─────────── EmailLog (admin read-only) ───────────
class EmailLogViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    queryset = EmailLog.objects.select_related("user", "notification_type")
    serializer_class = EmailLogSerializer
    permission_classes = [IsAuthenticated & IsAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["status", "provider"]
    search_fields = ["to_email", "subject"]
    ordering = ["-created_at"]
