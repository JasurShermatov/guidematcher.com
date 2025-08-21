# serializers.py
from rest_framework import serializers
from django.db.models import Q
from apps.users.models import User
from .models import Conversation, Message, BlockedUser


class UserSerializer(serializers.ModelSerializer):
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "avatar",
            "avatar_url",
            "bio",
            "is_active",
        ]
        read_only_fields = ["full_name"]

    def get_avatar_url(self, obj):
        if obj.avatar:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        return None


class MessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    delete_status = serializers.SerializerMethodField()
    can_recover = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            "id",
            "conversation",
            "sender",
            "content",
            "created_at",
            "deleted_for",
            "deleted_at",
            "is_read",
            "read_at",
            "delete_status",
            "can_recover",
        ]
        read_only_fields = [
            "id",
            "sender",
            "created_at",
            "deleted_at",
            "is_read",
            "read_at",
        ]

    def get_delete_status(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return obj.get_delete_status_for_user(request.user)
        return None

    def get_can_recover(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return obj.can_be_recovered(request.user)
        return False


class MessageCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ["conversation", "content"]

    def validate_conversation(self, value):
        user = self.context["request"].user

        if not value.has_user(user):
            raise serializers.ValidationError(
                "You are not a participant in this conversation."
            )

        other_user = value.get_other_user(user)

        if BlockedUser.objects.filter(
            Q(blocker=user, blocked=other_user) | Q(blocker=other_user, blocked=user)
        ).exists():
            raise serializers.ValidationError("Cannot send message to this user.")

        return value

    def validate_content(self, value):
        if not value.strip():
            raise serializers.ValidationError("Message content cannot be empty.")
        if len(value) > 5000:
            raise serializers.ValidationError(
                "Message is too long (max 5000 characters)."
            )
        return value.strip()


class ConversationSerializer(serializers.ModelSerializer):
    other_user = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            "id",
            "created_at",
            "updated_at",
            "other_user",
            "last_message",
            "unread_count",
        ]

    def get_other_user(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            other_user = obj.get_other_user(request.user)
            return UserSerializer(other_user, context=self.context).data
        return None

    def get_last_message(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            last_message = (
                Message.objects.visible_for_user(request.user)
                .filter(conversation=obj)
                .first()
            )

            if last_message:
                return MessageSerializer(last_message, context=self.context).data
        return None

    def get_unread_count(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return Message.objects.unread_for_user_in_conversation(
                request.user, obj
            ).count()
        return 0


class StartConversationSerializer(serializers.Serializer):
    user_email = serializers.EmailField()
    message = serializers.CharField(max_length=5000, required=False, allow_blank=True)

    def validate_user_email(self, value):
        try:
            user = User.objects.get(email=value, is_active=True)
        except User.DoesNotExist:
            raise serializers.ValidationError(
                "User with this email does not exist or is inactive."
            )

        request_user = self.context["request"].user

        if user == request_user:
            raise serializers.ValidationError(
                "You cannot start a conversation with yourself."
            )

        if BlockedUser.objects.filter(
            Q(blocker=request_user, blocked=user)
            | Q(blocker=user, blocked=request_user)
        ).exists():
            raise serializers.ValidationError(
                "Cannot start conversation with this user."
            )

        return value

    def validate_message(self, value):
        if value and len(value.strip()) > 5000:
            raise serializers.ValidationError(
                "Message is too long (max 5000 characters)."
            )
        return value.strip() if value else ""


class BlockUserSerializer(serializers.Serializer):
    user_email = serializers.EmailField()

    def validate_user_email(self, value):
        try:
            user = User.objects.get(email=value, is_active=True)
        except User.DoesNotExist:
            raise serializers.ValidationError(
                "User with this email does not exist or is inactive."
            )

        request_user = self.context["request"].user

        if user == request_user:
            raise serializers.ValidationError("You cannot block yourself.")

        if BlockedUser.objects.filter(blocker=request_user, blocked=user).exists():
            raise serializers.ValidationError("User is already blocked.")

        return value


class BlockedUserSerializer(serializers.ModelSerializer):

    blocked_user = UserSerializer(source="blocked", read_only=True)

    class Meta:
        model = BlockedUser
        fields = ["id", "blocked_user", "created_at"]
        read_only_fields = ["id", "created_at"]


class MessageActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(
        choices=[
            ("delete_sender", "Delete for Sender"),
            ("delete_both", "Delete for Both"),
            ("recover", "Recover Message"),
        ]
    )

    def validate(self, data):
        message = self.context["message"]
        user = self.context["request"].user
        action = data["action"]

        if user != message.sender:
            raise serializers.ValidationError(
                "You can only delete/recover your own messages."
            )

        if action == "recover" and not message.can_be_recovered(user):
            raise serializers.ValidationError("This message cannot be recovered.")

        if action in ["delete_sender", "delete_both"] and message.deleted_for != "none":
            raise serializers.ValidationError("Message is already deleted.")

        return data


class UnreadCountSerializer(serializers.Serializer):

    total_unread = serializers.IntegerField()
    conversations = serializers.DictField(child=serializers.IntegerField())


class MessageListSerializer(MessageSerializer):

    is_mine = serializers.SerializerMethodField()

    class Meta(MessageSerializer.Meta):
        fields = MessageSerializer.Meta.fields + ["is_mine"]

    def get_is_mine(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return obj.sender == request.user
        return False
