from rest_framework import serializers
from apps.disputes.models import Dispute, DisputeEvidence, DisputeMessage, DisputeAction
from apps.users.serializers import UserShortSerializer
from apps.bookings.serializers import BookingShortSerializer  # qisqa booking


# ─────────── DisputeAction (read-only) ───────────
class DisputeActionSerializer(serializers.ModelSerializer):
    performed_by = UserShortSerializer(read_only=True)

    class Meta:
        model = DisputeAction
        fields = "__all__"
        read_only_fields = fields


# ─────────── Evidence ───────────
class EvidenceSerializer(serializers.ModelSerializer):
    submitted_by = UserShortSerializer(read_only=True)

    class Meta:
        model = DisputeEvidence
        fields = [
            "id",
            "dispute",
            "evidence_type",
            "title",
            "description",
            "file",
            "file_size",
            "is_verified",
            "submitted_by",
            "verified_by",
            "verified_at",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "submitted_by",
            "is_verified",
            "verified_by",
            "verified_at",
            "created_at",
            "file_size",
        ]

    def validate_file(self, file):
        self.instance  # noqa: just trigger access if needed
        file_size = file.size
        if file_size > 25 * 1024 * 1024:  # 25 MB
            raise serializers.ValidationError("Max 25 MB.")
        return file

    def create(self, validated):
        validated["submitted_by"] = self.context["request"].user
        validated["file_size"] = validated["file"].size
        return super().create(validated)


# ─────────── Message ───────────
class DisputeMessageSerializer(serializers.ModelSerializer):
    sender = UserShortSerializer(read_only=True)
    attachments = EvidenceSerializer(many=True, read_only=True)

    class Meta:
        model = DisputeMessage
        fields = [
            "id",
            "dispute",
            "sender",
            "message",
            "is_internal",
            "attachments",
            "created_at",
        ]
        read_only_fields = ["id", "sender", "attachments", "created_at"]

    def create(self, validated):
        validated["sender"] = self.context["request"].user
        return super().create(validated)


# ─────────── Dispute ───────────
class DisputeSerializer(serializers.ModelSerializer):
    reporter = UserShortSerializer(read_only=True)
    respondent = UserShortSerializer(read_only=True)
    booking = BookingShortSerializer(read_only=True)
    actions = DisputeActionSerializer(many=True, read_only=True)

    class Meta:
        model = Dispute
        fields = "__all__"
        read_only_fields = [
            "id",
            "reporter",
            "status",
            "resolution",
            "resolution_notes",
            "assigned_to",
            "assigned_at",
            "resolved_by",
            "resolved_at",
            "created_at",
            "updated_at",
            "actions",
        ]
