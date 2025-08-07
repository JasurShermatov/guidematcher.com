# apps/chat/signals.py
import logging
from django.db import transaction
from django.db.models.signals import post_save, post_delete, pre_delete, m2m_changed
from django.dispatch import receiver
from django.utils import timezone

from .models import ChatRoom, Message, MessageRead, UserTypingStatus

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Message)
def update_room_on_message_create(sender, instance, created, **kwargs):

    if not created:
        return

    try:
        with transaction.atomic():
            room = instance.room

            room.update_last_message(instance, save=False)

            if instance.sender:
                for participant in room.participants.exclude(id=instance.sender.id):
                    room.increment_unread_count(participant, save=False)


            room.save(
                update_fields=[
                    "last_message_at",
                    "last_message_preview",
                    "last_message_sender_id",
                    "last_message_type",
                    "total_messages",
                    "unread_counts",
                ]
            )

            logger.debug("Updated room %s after message create", room.id)

    except Exception as e:
        logger.error("Error updating room after message create: %s", e)


@receiver(pre_delete, sender=Message)
def update_room_on_message_delete(sender, instance, **kwargs):

    try:
        room = instance.room
        if room.total_messages > 0:
            room.total_messages -= 1
            room.save(update_fields=["total_messages"])

        logger.debug("Updated room %s after message delete", room.id)

    except Exception as e:
        logger.error("Error updating room after message delete: %s", e)


@receiver(post_save, sender=Message)
def update_reply_count_on_message_save(sender, instance, created, **kwargs):

    if not created or not instance.reply_to:
        return

    try:
        instance.reply_to.increment_replies_count(save=True)
        logger.debug("Updated reply count for message %s", instance.reply_to.id)

    except Exception as e:
        logger.error("Error updating reply count: %s", e)


@receiver(post_save, sender=MessageRead)
def update_read_count_on_read_receipt(sender, instance, created, **kwargs):

    if not created:
        return

    try:
        with transaction.atomic():
            # Update message read count
            instance.message.increment_read_count(save=True)

            # Update room unread count for the user
            room = instance.message.room
            current_unread = room.get_unread_count(instance.user)
            if current_unread > 0:
                room.unread_counts[str(instance.user.id)] = current_unread - 1
                room.save(update_fields=["unread_counts"])

            logger.debug("Updated read counts for message %s", instance.message.id)

    except Exception as e:
        logger.error("Error updating read counts: %s", e)


@receiver(m2m_changed, sender=ChatRoom.participants.through)
def update_room_on_participants_change(sender, instance, action, pk_set, **kwargs):

    if action not in ["post_add", "post_remove"]:
        return

    try:
        with transaction.atomic():
            if action == "post_add":
                # Initialize unread counts for new participants
                for user_id in pk_set:
                    if str(user_id) not in instance.unread_counts:
                        instance.unread_counts[str(user_id)] = 0

            elif action == "post_remove":
                # Remove unread counts for removed participants
                for user_id in pk_set:
                    instance.unread_counts.pop(str(user_id), None)

            instance.save(update_fields=["unread_counts"])
            logger.debug("Updated participants for room %s", instance.id)

    except Exception as e:
        logger.error("Error updating room participants: %s", e)


@receiver(post_save, sender=UserTypingStatus)
def cleanup_old_typing_statuses(sender, instance, **kwargs):

    # Only run cleanup occasionally to avoid performance impact
    if instance.id % 100 == 0:  # Every 100th save
        try:
            cutoff_time = timezone.now() - timezone.timedelta(minutes=5)
            cleaned_count = UserTypingStatus.objects.filter(
                is_typing=True, last_typed_at__lt=cutoff_time
            ).update(is_typing=False)

            if cleaned_count > 0:
                logger.debug("Cleaned up %d old typing statuses", cleaned_count)

        except Exception as e:
            logger.error("Error cleaning up typing statuses: %s", e)




def bulk_update_room_unread_counts(room_id, user_message_counts):
    try:
        with transaction.atomic():
            room = ChatRoom.objects.select_for_update().get(id=room_id)

            for user_id, additional_count in user_message_counts.items():
                current_count = room.unread_counts.get(str(user_id), 0)
                room.unread_counts[str(user_id)] = current_count + additional_count

            room.save(update_fields=["unread_counts"])
            logger.debug("Bulk updated unread counts for room %s", room_id)

    except Exception as e:
        logger.error("Error bulk updating unread counts: %s", e)


def recalculate_room_statistics(room_id):
    try:
        with transaction.atomic():
            room = ChatRoom.objects.select_for_update().get(id=room_id)

            # Recalculate total messages
            actual_message_count = room.messages.filter(is_deleted=False).count()

            # Get last message
            last_message = (
                room.messages.filter(is_deleted=False).order_by("-created_at").first()
            )

            # Update fields
            room.total_messages = actual_message_count

            if last_message:
                room.update_last_message(last_message, save=False)
            else:
                # Clear last message fields if no messages
                room.last_message_at = None
                room.last_message_preview = ""
                room.last_message_sender_id = None
                room.last_message_type = ""

            room.save()
            logger.info("Recalculated statistics for room %s", room_id)

    except ChatRoom.DoesNotExist:
        logger.warning("Room %s not found for recalculation", room_id)
    except Exception as e:
        logger.error("Error recalculating room statistics: %s", e)



@receiver(post_save, sender=Message)
def update_room_preview_on_message_edit(sender, instance, created, **kwargs):
    """
    Update room preview when the last message is edited.
    """
    if created or not instance.is_edited:
        return

    try:
        room = instance.room

        # Only update if this is the last message
        if str(instance.id) == str(room.last_message_sender_id):
            room.update_last_message(instance, save=True)
            logger.debug("Updated room preview after message edit")

    except Exception as e:
        logger.error("Error updating room preview after edit: %s", e)


@receiver(post_save, sender=Message)
def update_room_on_message_soft_delete(sender, instance, created, **kwargs):
    """
    Handle soft deletion of messages (is_deleted=True).
    """
    if created or not instance.is_deleted:
        return

    try:
        room = instance.room

        # Decrease total message count
        if room.total_messages > 0:
            room.total_messages -= 1

            # If this was the last message, find the new last message
            if str(instance.id) == str(room.last_message_sender_id):
                new_last_message = (
                    room.messages.filter(is_deleted=False)
                    .order_by("-created_at")
                    .first()
                )

                if new_last_message:
                    room.update_last_message(new_last_message, save=False)
                else:
                    # No messages left, clear last message fields
                    room.last_message_at = None
                    room.last_message_preview = ""
                    room.last_message_sender_id = None
                    room.last_message_type = ""

            room.save(
                update_fields=[
                    "total_messages",
                    "last_message_at",
                    "last_message_preview",
                    "last_message_sender_id",
                    "last_message_type",
                ]
            )

        logger.debug("Updated room after message soft delete")

    except Exception as e:
        logger.error("Error updating room after message soft delete: %s", e)



class DisableSignals:

    def __init__(self, disabled_signals):
        self.disabled_signals = disabled_signals
        self.signal_receivers = {}

    def __enter__(self):
        for signal in self.disabled_signals:
            self.signal_receivers[signal] = signal.receivers
            signal.receivers = []

    def __exit__(self, exc_type, exc_val, exc_tb):
        for signal in self.disabled_signals:
            signal.receivers = self.signal_receivers[signal]


def disable_chat_signals():
    return DisableSignals([post_save, post_delete, pre_delete, m2m_changed])


def initialize_room_denormalized_fields(room_id):
    """
    Initialize denormalized fields for existing room.
    Useful for data migration.
    """
    try:
        room = ChatRoom.objects.get(id=room_id)

        # Initialize unread counts for all participants
        for participant in room.participants.all():
            if str(participant.id) not in room.unread_counts:
                room.unread_counts[str(participant.id)] = 0

        # Calculate initial statistics
        recalculate_room_statistics(room_id)

        logger.info("Initialized denormalized fields for room %s", room_id)

    except ChatRoom.DoesNotExist:
        logger.error("Room %s not found for initialization", room_id)



def validate_room_data_consistency(room_id=None):
    rooms = ChatRoom.objects.all()
    if room_id:
        rooms = rooms.filter(id=room_id)

    inconsistencies = []

    for room in rooms:
        # Check message count
        actual_count = room.messages.filter(is_deleted=False).count()
        if room.total_messages != actual_count:
            inconsistencies.append(
                {
                    "room_id": str(room.id),
                    "issue": "message_count_mismatch",
                    "stored": room.total_messages,
                    "actual": actual_count,
                }
            )

        # Check last message
        last_message = (
            room.messages.filter(is_deleted=False).order_by("-created_at").first()
        )
        if last_message:
            if room.last_message_at != last_message.created_at:
                inconsistencies.append(
                    {"room_id": str(room.id), "issue": "last_message_time_mismatch"}
                )

    return {
        "total_rooms_checked": rooms.count(),
        "inconsistencies_found": len(inconsistencies),
        "details": inconsistencies,
    }
