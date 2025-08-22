# apps/disputes/views.py
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.utils import timezone
from django.db import models

from apps.disputes.models import Dispute, DisputeEvidence, DisputeMessage, DisputeAction
from apps.disputes.serializers import (
    DisputeSerializer,
    EvidenceSerializer,
    DisputeMessageSerializer,
    DisputeActionSerializer,
)
from apps.common.permissions import IsDisputeParticipant, IsAdmin
from drf_spectacular.utils import (
    extend_schema,
    extend_schema_view,
    OpenApiParameter,
    OpenApiExample,
)


def _log_action(dispute, performed_by, action_type, desc, old=None, new=None):
    """Helper: har qanday harakatni dispute action logiga yozadi"""
    DisputeAction.objects.create(
        dispute=dispute,
        performed_by=performed_by,
        action_type=action_type,
        description=desc,
        old_value=old or "",
        new_value=new or "",
    )


# ───────────────────────────────────────────────
# 📌 DISPUTES
# ───────────────────────────────────────────────


@extend_schema_view(
    list=extend_schema(
        tags=["Disputes"],
        summary="List all disputes",
        description="Authenticated foydalanuvchiga tegishli barcha dispute’larni qaytaradi. Admin bo‘lsa – hamma dispute’larni ko‘radi.",
    ),
    retrieve=extend_schema(
        tags=["Disputes"],
        summary="Retrieve dispute",
        description="Dispute ID orqali bitta dispute ma’lumotlarini qaytaradi.",
    ),
    create=extend_schema(
        tags=["Disputes"],
        summary="Create dispute",
        description="Yangi dispute yaratadi va avtomatik ravishda foydalanuvchini `reporter` sifatida qo‘shadi.",
    ),
    update=extend_schema(tags=["Disputes"], summary="Update dispute"),
    partial_update=extend_schema(tags=["Disputes"], summary="Partially update dispute"),
    destroy=extend_schema(tags=["Disputes"], summary="Delete dispute"),
)
class DisputeViewSet(viewsets.ModelViewSet):
    queryset = Dispute.objects.select_related(
        "reporter", "respondent", "booking", "assigned_to"
    ).prefetch_related(
        "actions__performed_by",
        "messages__sender",
        "messages__attachments",
        "evidence__submitted_by",
        "evidence__verified_by",
    )
    serializer_class = DisputeSerializer
    permission_classes = [IsAuthenticated, IsDisputeParticipant | IsAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["status", "priority", "dispute_type"]
    search_fields = ["title", "description"]
    ordering = ["-created_at"]

    def get_queryset(self):
        """Foydalanuvchi admin bo‘lsa – hamma dispute’larni qaytaradi. Aks holda faqat o‘ziga tegishlilarini."""
        user = self.request.user
        qs = super().get_queryset()
        if getattr(user, "is_admin", False):
            return qs
        return qs.filter(models.Q(reporter=user) | models.Q(respondent=user))

    def perform_create(self, serializer):
        obj = serializer.save(reporter=self.request.user)
        _log_action(
            obj, self.request.user, "STATUS_CHANGED", "Dispute created", new=obj.status
        )

    # 📌 Assign dispute to admin
    @extend_schema(
        tags=["Disputes"],
        summary="Assign dispute to admin",
        description="Dispute’ni boshqa admin foydalanuvchiga biriktiradi.",
        request=OpenApiExample(
            "Assign example",
            value={"admin_id": 5},
        ),
    )
    @action(detail=True, methods=["post"], permission_classes=[IsAdmin])
    def assign(self, request, pk=None):
        dispute = self.get_object()
        admin_user = request.data.get("admin_id")
        if not admin_user:
            return Response({"detail": "admin_id required"}, status=400)
        old = dispute.assigned_to_id
        dispute.assigned_to_id = admin_user
        dispute.assigned_at = timezone.now()
        dispute.save(update_fields=["assigned_to", "assigned_at"])
        _log_action(
            dispute, request.user, "ASSIGNED", "Assigned to admin", old, admin_user
        )
        return Response(self.get_serializer(dispute).data)

    # 📌 Change status
    @extend_schema(
        tags=["Disputes"],
        summary="Change dispute status",
        description="Dispute statusini yangilaydi. `resolved` qilinsa – avtomatik resolved_by va resolved_at to‘ldiriladi.",
        request=OpenApiExample(
            "Change status example",
            value={"status": "RESOLVED"},
        ),
    )
    @action(detail=True, methods=["post"], permission_classes=[IsAdmin])
    def change_status(self, request, pk=None):
        dispute = self.get_object()
        new_status = request.data.get("status")
        if new_status not in dict(Dispute.DisputeStatus.choices):
            return Response({"detail": "Invalid status"}, status=400)
        old = dispute.status
        dispute.status = new_status
        if new_status == Dispute.DisputeStatus.RESOLVED:
            dispute.resolved_by = request.user
            dispute.resolved_at = timezone.now()
        dispute.save(update_fields=["status", "resolved_by", "resolved_at"])
        _log_action(
            dispute, request.user, "STATUS_CHANGED", "Status update", old, new_status
        )
        return Response(self.get_serializer(dispute).data)

    # 📌 Get all dispute actions (history)
    @extend_schema(
        tags=["Disputes"],
        summary="Get dispute actions (history)",
        description="Berilgan dispute uchun barcha action loglarini qaytaradi.",
    )
    @action(detail=True, methods=["get"])
    def actions(self, request, pk=None):
        dispute_actions = self.get_object().actions.select_related("performed_by")
        serializer = DisputeActionSerializer(dispute_actions, many=True)
        return Response(serializer.data)


# ───────────────────────────────────────────────
# 📌 EVIDENCE
# ───────────────────────────────────────────────


@extend_schema_view(
    list=extend_schema(tags=["Disputes → Evidence"], summary="List evidence"),
    retrieve=extend_schema(tags=["Disputes → Evidence"], summary="Retrieve evidence"),
    create=extend_schema(
        tags=["Disputes → Evidence"],
        summary="Add new evidence",
        description="Dispute uchun yangi dalil yuklaydi.",
    ),
    destroy=extend_schema(tags=["Disputes → Evidence"], summary="Delete evidence"),
)
class EvidenceViewSet(viewsets.ModelViewSet):
    serializer_class = EvidenceSerializer
    permission_classes = [IsDisputeParticipant | IsAdmin]

    def get_queryset(self):
        return DisputeEvidence.objects.filter(
            dispute_id=self.kwargs["dispute_pk"]
        ).select_related("submitted_by", "verified_by")

    def perform_create(self, serializer):
        obj = serializer.save(dispute_id=self.kwargs["dispute_pk"])
        _log_action(obj.dispute, self.request.user, "EVIDENCE_ADDED", obj.title)


# ───────────────────────────────────────────────
# 📌 MESSAGES
# ───────────────────────────────────────────────


@extend_schema_view(
    list=extend_schema(tags=["Disputes → Messages"], summary="List messages"),
    retrieve=extend_schema(tags=["Disputes → Messages"], summary="Retrieve message"),
    create=extend_schema(
        tags=["Disputes → Messages"],
        summary="Send message",
        description="Dispute ichida yangi xabar yuboradi.",
    ),
    destroy=extend_schema(tags=["Disputes → Messages"], summary="Delete message"),
)
class DisputeMessageViewSet(viewsets.ModelViewSet):
    serializer_class = DisputeMessageSerializer
    permission_classes = [IsDisputeParticipant | IsAdmin]

    def get_queryset(self):
        return DisputeMessage.objects.filter(
            dispute_id=self.kwargs["dispute_pk"]
        ).select_related("sender")

    def perform_create(self, serializer):
        obj = serializer.save(dispute_id=self.kwargs["dispute_pk"])
        _log_action(obj.dispute, self.request.user, "MESSAGE_SENT", obj.message[:120])
