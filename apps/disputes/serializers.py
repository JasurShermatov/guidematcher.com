#  apps/disputes/models.py
from rest_framework import serializers
from apps.disputes.models import Dispute, DisputeEvidence, DisputeMessage, DisputeAction
from apps.users.serializers import UserShortSerializer
from apps.bookings.serializers import BookingShortSerializer


class DisputeActionSerializer(serializers.ModelSerializer):
    performed_by = UserShortSerializer(read_only=True)

    class Meta:
        model = DisputeAction
        fields = "__all__"
        read_only_fields = (
            "id",
            "dispute",
            "action_type",
            "performed_by",
            "created_at",
        )


class EvidenceSerializer(serializers.ModelSerializer):
    submitted_by = UserShortSerializer(read_only=True)

    class Meta:
        model = DisputeEvidence
        fields = (
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
        )
        read_only_fields = (
            "id",
            "submitted_by",
            "file_size",
            "is_verified",
            "verified_by",
            "verified_at",
            "created_at",
        )

    def validate_file(self, file):
        if file.size > 25 * 1024 * 1024:
            raise serializers.ValidationError("Max 25 MB.")
        return file

    def create(self, validated):
        validated.update(
            submitted_by=self.context["request"].user, file_size=validated["file"].size
        )
        return super().create(validated)


class DisputeMessageSerializer(serializers.ModelSerializer):
    sender = UserShortSerializer(read_only=True)
    attachments = EvidenceSerializer(many=True, read_only=True)

    class Meta:
        model = DisputeMessage
        fields = (
            "id",
            "dispute",
            "sender",
            "message",
            "is_internal",
            "attachments",
            "created_at",
        )
        read_only_fields = ("id", "sender", "attachments", "created_at")

    def create(self, validated):
        validated["sender"] = self.context["request"].user
        return super().create(validated)


class DisputeSerializer(serializers.ModelSerializer):
    reporter = UserShortSerializer(read_only=True)
    respondent = UserShortSerializer(read_only=True)
    booking = BookingShortSerializer(read_only=True)
    actions = DisputeActionSerializer(many=True, read_only=True)

    class Meta:
        model = Dispute
        fields = "__all__"
        read_only_fields = (
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
        )
