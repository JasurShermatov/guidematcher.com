#  apps/chat/models.py
from __future__ import annotations

from django.db import models
from apps.users.models import User
from django.utils import timezone


class ConversationManager(models.Manager):
    def get_user_conversations(self, user):
        return self.filter(models.Q(user1=user) | models.Q(user2=user))

    def get_or_create_chat(self, user1, user2):
        if user1.id > user2.id:
            user1, user2 = user2, user1

        conversation, created = self.get_or_create(user1=user1, user2=user2)
        return conversation, created

    def get_unread_count_for_user(self, user):
        conversations = self.get_user_conversations(user)
        total_unread = 0

        for conversation in conversations:
            unread = (
                Message.objects.filter(conversation=conversation)
                .exclude(sender=user)
                .exclude(
                    models.Q(deleted_for="both")
                    | (models.Q(deleted_for="sender") & models.Q(sender=user))
                )
                .filter(is_read=False)
                .count()
            )
            total_unread += unread

        return total_unread


class MessageManager(models.Manager):
    def visible_for_user(self, user):
        return self.exclude(
            models.Q(deleted_for="both")
            | (models.Q(deleted_for="sender") & models.Q(sender=user))
        )

    def deleted_for_user(self, user):
        return self.filter(sender=user).filter(
            models.Q(deleted_for="sender") | models.Q(deleted_for="both")
        )

    def recoverable_for_user(self, user):
        return self.deleted_for_user(user)

    def unread_for_user_in_conversation(self, user, conversation):
        return (
            self.visible_for_user(user)
            .filter(conversation=conversation)
            .exclude(sender=user)
            .filter(is_read=False)
        )


class Conversation(models.Model):
    user1 = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="conversations_as_user1"
    )
    user2 = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="conversations_as_user2"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = ConversationManager()

    class Meta:
        ordering = ["-updated_at"]
        unique_together = ("user1", "user2")

    def __str__(self):
        return f"{self.user1.full_name} - {self.user2.full_name}"

    def get_other_user(self, user):
        """Get the other participant in the conversation"""
        return self.user2 if user == self.user1 else self.user1

    def has_user(self, user):
        """Check if user is participant in conversation"""
        return user == self.user1 or user == self.user2


class Message(models.Model):
    DELETE_CHOICES = [
        ("none", "Not Deleted"),
        ("sender", "Deleted by Sender"),
        ("both", "Deleted by Both"),
    ]

    conversation = models.ForeignKey(
        Conversation, on_delete=models.CASCADE, related_name="messages"
    )
    sender = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    # Delete status
    deleted_for = models.CharField(
        max_length=10, choices=DELETE_CHOICES, default="none"
    )
    deleted_at = models.DateTimeField(null=True, blank=True)

    # Read status - simple boolean since it's only 1-on-1
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)

    objects = MessageManager()

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Message from {self.sender.full_name}: {self.content[:50]}"

    def mark_as_read(self):
        """Mark message as read"""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=["is_read", "read_at"])

    def delete_for_sender(self, user):
        """Delete message for sender only"""
        if user == self.sender:
            self.deleted_for = "sender"
            self.deleted_at = timezone.now()
            self.save(update_fields=["deleted_for", "deleted_at"])
            return True
        return False

    def delete_for_both(self, user):
        """Delete message for both users (only sender can do this)"""
        if user == self.sender:
            self.deleted_for = "both"
            self.deleted_at = timezone.now()
            self.save(update_fields=["deleted_for", "deleted_at"])
            return True
        return False

    def recover_message(self, user):
        """Recover deleted message (only sender can recover their own deletions)"""
        if user == self.sender and self.deleted_for in ["sender", "both"]:
            self.deleted_for = "none"
            self.deleted_at = None
            self.save(update_fields=["deleted_for", "deleted_at"])
            return True
        return False

    def can_be_recovered(self, user):
        """Check if message can be recovered by user"""
        return user == self.sender and self.deleted_for in ["sender", "both"]

    def is_visible_for_user(self, user):
        """Check if message is visible for a specific user"""
        if self.deleted_for == "both":
            return False
        if self.deleted_for == "sender" and user == self.sender:
            return False
        return True

    def get_delete_status_for_user(self, user):
        """Get delete status information for user"""
        return {
            "is_deleted": self.deleted_for != "none",
            "deleted_for": self.deleted_for,
            "deleted_at": self.deleted_at,
            "can_recover": self.can_be_recovered(user),
            "is_visible": self.is_visible_for_user(user),
        }


class BlockedUser(models.Model):
    blocker = models.ForeignKey(User, on_delete=models.CASCADE, related_name="blocking")
    blocked = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="blocked_by"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("blocker", "blocked")

    def __str__(self):
        return f"{self.blocker.full_name} blocks {self.blocked.full_name}"
