from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Dispute
from apps.users.serializers import UserSerializer
from apps.bookings.models import Booking
from apps.chat.models import ChatRoom
from apps.chat.serializers import ChatRoomSerializer

User = get_user_model()


class DisputeSerializer(serializers.ModelSerializer):
    """
    Serializer for disputes
    """

    client = UserSerializer(read_only=True)
    guide = UserSerializer(read_only=True)
    resolver = UserSerializer(read_only=True)
    booking_id = serializers.UUIDField(source="booking.id", read_only=True)
    chat_room = ChatRoomSerializer(read_only=True)

    class Meta:
        model = Dispute
        fields = [
            "id",
            "booking",
            "booking_id",
            "client",
            "guide",
            "initiator",
            "reason",
            "status",
            "resolver",
            "resolution_details",
            "resolved_at",
            "chat_room",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "client",
            "guide",
            "resolver",
            "resolved_at",
            "created_at",
            "updated_at",
        ]


class DisputeCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating disputes
    """

    booking = serializers.PrimaryKeyRelatedField(queryset=Booking.objects.all())

    class Meta:
        model = Dispute
        fields = ["booking", "reason", "initiator"]

    def validate(self, attrs):
        """
        Validate dispute creation
        """
        booking = attrs.get("booking")
        initiator = attrs.get("initiator")
        request = self.context["request"]

        # Ensure user is a participant in the booking
        if not (booking.client == request.user or booking.guide == request.user):
            raise serializers.ValidationError(
                {"booking": "Siz ushbu bronlashning ishtirokchisi emassiz."}
            )

        # Validate initiator
        if initiator == "client" and booking.client != request.user:
            raise serializers.ValidationError(
                {
                    "initiator": "Mijoz sifatida nizo ochish uchun mijoz bo'lishingiz kerak."
                }
            )
        if initiator == "guide" and booking.guide != request.user:
            raise serializers.ValidationError(
                {"initiator": "Gid sifatida nizo ochish uchun gid bo'lishingiz kerak."}
            )

        # Check if dispute already exists for this booking
        if Dispute.objects.filter(booking=booking).exists():
            raise serializers.ValidationError(
                {"booking": "Ushbu bronlash uchun allaqachon nizo mavjud."}
            )

        return attrs

    def create(self, validated_data):
        """
        Create a dispute and associated chat room
        """
        booking = validated_data["booking"]
        dispute = Dispute.objects.create(
            booking=booking,
            client=booking.client,
            guide=booking.guide,
            initiator=validated_data["initiator"],
            reason=validated_data["reason"],
            status="pending",
        )

        # Create a chat room for dispute communication
        chat_room = ChatRoom.objects.create(
            client=booking.client, guide=booking.guide, is_active=True
        )
        dispute.chat_room = chat_room
        dispute.save()

        return dispute


class DisputeResolveSerializer(serializers.ModelSerializer):
    """
    Serializer for resolving disputes
    """

    class Meta:
        model = Dispute
        fields = ["resolution_details", "status"]

    def validate(self, attrs):
        """
        Validate dispute resolution
        """
        status = attrs.get("status")
        if status not in ["resolved", "closed"]:
            raise serializers.ValidationError(
                {"status": "Faqat 'resolved' yoki 'closed' statuslari ruxsat etiladi."}
            )
        if status in ["resolved", "closed"] and not attrs.get("resolution_details"):
            raise serializers.ValidationError(
                {"resolution_details": "Yechim tafsilotlari talab qilinadi."}
            )
        return attrs

    def update(self, instance, validated_data):
        """
        Update dispute with resolution details
        """
        instance.status = validated_data["status"]
        instance.resolution_details = validated_data["resolution_details"]
        instance.resolver = self.context["request"].user
        from django.utils import timezone

        instance.resolved_at = timezone.now()
        instance.save()
        return instance
