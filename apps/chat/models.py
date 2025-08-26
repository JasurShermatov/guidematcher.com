# ============================================
# 1. apps/chat/models.py - PROFESSIONAL VERSION
# ============================================

from __future__ import annotations
from typing import Optional, Tuple

from django.db import models
from django.db.models import Q, QuerySet
from django.utils import timezone
from django.core.exceptions import ValidationError

from apps.users.models import User


class ConversationManager(models.Manager):
    """Custom manager for Conversation model with optimized queries"""

    def get_user_conversations(self, user: User) -> QuerySet:
        """Get all conversations for a specific user"""
        return (
            self.filter(Q(user1=user) | Q(user2=user))
            .select_related("user1", "user2")
            .prefetch_related("messages")
        )

    def get_or_create_chat(
        self, user1: User, user2: User
    ) -> Tuple["Conversation", bool]:
        """Get or create conversation between two users (order independent)"""
        # Always store users in consistent order (lower ID first)
        if user1.id > user2.id:
            user1, user2 = user2, user1

        conversation, created = self.get_or_create(
            user1=user1, user2=user2, defaults={"created_at": timezone.now()}
        )
        return conversation, created

    def get_unread_count_for_user(self, user: User) -> int:
        """Get total unread message count for user across all conversations"""
        conversations = self.get_user_conversations(user)
        total_unread = 0

        for conversation in conversations:
            unread = Message.objects.unread_for_user_in_conversation(
                user, conversation
            ).count()
            total_unread += unread

        return total_unread

    def has_active_booking(self, conversation_id: int) -> bool:
        """Check if conversation has active booking"""
        try:
            from apps.bookings.models import Booking

            return Booking.objects.filter(
                conversation_id=conversation_id,
                status__in=["pending", "accepted", "updated"],
            ).exists()
        except ImportError:
            return False


class MessageManager(models.Manager):
    """Custom manager for Message model with visibility logic"""

    def visible_for_user(self, user: User) -> QuerySet:
        """Get messages visible to specific user"""
        return self.exclude(
            Q(deleted_for="both") | (Q(deleted_for="sender") & Q(sender=user))
        )

    def deleted_for_user(self, user: User) -> QuerySet:
        """Get messages deleted by user"""
        return self.filter(sender=user).filter(
            Q(deleted_for="sender") | Q(deleted_for="both")
        )

    def recoverable_for_user(self, user: User) -> QuerySet:
        """Get messages that can be recovered by user"""
        return self.deleted_for_user(user)

    def unread_for_user_in_conversation(
        self, user: User, conversation: "Conversation"
    ) -> QuerySet:
        """Get unread messages for user in specific conversation"""
        return (
            self.visible_for_user(user)
            .filter(conversation=conversation)
            .exclude(sender=user)
            .filter(is_read=False)
        )


class Conversation(models.Model):
    """
    Conversation model: Manages chat between two users
    Integrated with booking system
    """

    user1 = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="conversations_as_user1",
        db_index=True,
    )
    user2 = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="conversations_as_user2",
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Optional: Track conversation status
    is_active = models.BooleanField(default=True)
    last_activity = models.DateTimeField(auto_now=True)

    objects = ConversationManager()

    class Meta:
        ordering = ["-updated_at"]
        unique_together = ("user1", "user2")
        indexes = [
            models.Index(fields=["-updated_at"]),
            models.Index(fields=["user1", "user2"]),
        ]
        verbose_name = "Conversation"
        verbose_name_plural = "Conversations"

    def __str__(self):
        return f"Chat: {self.user1.full_name} <-> {self.user2.full_name}"

    def get_other_user(self, user: User) -> User:
        """Get the other participant in conversation"""
        if user == self.user1:
            return self.user2
        elif user == self.user2:
            return self.user1
        raise ValueError("User is not a participant in this conversation")

    def has_user(self, user: User) -> bool:
        """Check if user is participant in conversation"""
        return user in [self.user1, self.user2]

    def get_active_booking(self):
        """Get active booking for this conversation if exists"""
        try:
            from apps.bookings.models import Booking

            return self.booking_set.filter(
                status__in=["pending", "accepted", "updated"]
            ).first()

        except:
            return None

    def can_send_message(self, user: User) -> bool:
        """Check if user can send message (not blocked)"""
        other_user = self.get_other_user(user)
        return not BlockedUser.objects.filter(
            Q(blocker=user, blocked=other_user) | Q(blocker=other_user, blocked=user)
        ).exists()


class Message(models.Model):
    """
    Message model: Individual messages in conversations
    Supports delete/recover functionality
    """

    DELETE_CHOICES = [
        ("none", "Not Deleted"),
        ("sender", "Deleted by Sender"),
        ("both", "Deleted by Both"),
    ]

    MESSAGE_TYPES = [
        ("text", "Text Message"),
        ("booking", "Booking Update"),
        ("system", "System Message"),
    ]

    conversation = models.ForeignKey(
        Conversation, on_delete=models.CASCADE, related_name="messages", db_index=True
    )
    sender = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="sent_messages"
    )
    content = models.TextField(max_length=5000)
    message_type = models.CharField(
        max_length=10, choices=MESSAGE_TYPES, default="text"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    # Delete status
    deleted_for = models.CharField(
        max_length=10, choices=DELETE_CHOICES, default="none"
    )
    deleted_at = models.DateTimeField(null=True, blank=True)

    # Read status
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)

    # Optional: Message metadata
    metadata = models.JSONField(null=True, blank=True)

    objects = MessageManager()

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["conversation", "-created_at"]),
            models.Index(fields=["sender", "is_read"]),
        ]
        verbose_name = "Message"
        verbose_name_plural = "Messages"

    def __str__(self):
        return f"{self.sender.full_name}: {self.content[:50]}..."

    def clean(self):
        """Validate message before saving"""
        if not self.content.strip():
            raise ValidationError("Message content cannot be empty")
        if len(self.content) > 5000:
            raise ValidationError("Message is too long (max 5000 characters)")

    def mark_as_read(self) -> bool:
        """Mark message as read with timestamp"""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=["is_read", "read_at"])
            return True
        return False

    def delete_for_sender(self, user: User) -> bool:
        """Delete message for sender only"""
        if user == self.sender and self.deleted_for == "none":
            self.deleted_for = "sender"
            self.deleted_at = timezone.now()
            self.save(update_fields=["deleted_for", "deleted_at"])
            return True
        return False

    def delete_for_both(self, user: User) -> bool:
        """Delete message for both users (only sender can do)"""
        if user == self.sender and self.deleted_for in ["none", "sender"]:
            self.deleted_for = "both"
            self.deleted_at = timezone.now()
            self.save(update_fields=["deleted_for", "deleted_at"])
            return True
        return False

    def recover_message(self, user: User) -> bool:
        """Recover deleted message (only sender can recover)"""
        if user == self.sender and self.deleted_for in ["sender", "both"]:
            self.deleted_for = "none"
            self.deleted_at = None
            self.save(update_fields=["deleted_for", "deleted_at"])
            return True
        return False

    def can_be_recovered(self, user: User) -> bool:
        """Check if message can be recovered by user"""
        return user == self.sender and self.deleted_for != "none"

    def is_visible_for_user(self, user: User) -> bool:
        """Check if message is visible for specific user"""
        if self.deleted_for == "both":
            return False
        if self.deleted_for == "sender" and user == self.sender:
            return False
        return True

    def get_delete_status_for_user(self, user: User) -> dict:
        """Get comprehensive delete status for user - FIXED datetime issue"""
        deleted_at_safe = None
        if self.deleted_at:
            deleted_at_safe = self.deleted_at.isoformat()  # String'ga convert

        return {
            "is_deleted": self.deleted_for != "none",
            "deleted_for": self.deleted_for,
            "deleted_at": deleted_at_safe,  # Safe ISO string format
            "can_recover": self.can_be_recovered(user),
            "is_visible": self.is_visible_for_user(user),
        }


class BlockedUser(models.Model):
    """
    BlockedUser model: Manages user blocking functionality
    """

    blocker = models.ForeignKey(User, on_delete=models.CASCADE, related_name="blocking")
    blocked = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="blocked_by"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    reason = models.CharField(max_length=255, blank=True)

    class Meta:
        unique_together = ("blocker", "blocked")
        verbose_name = "Blocked User"
        verbose_name_plural = "Blocked Users"

    def __str__(self):
        return f"{self.blocker.full_name} blocked {self.blocked.full_name}"
