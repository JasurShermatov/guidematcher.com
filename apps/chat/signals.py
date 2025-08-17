# apps/chat/signals.py
import logging
from django.db import transaction
from django.db.models import F
from django.db.models.signals import post_save, post_delete, pre_delete, m2m_changed
from django.dispatch import receiver
from django.utils import timezone
from typing import Optional, Dict, Any

from .models import ChatRoom, Message, MessageRead, UserTypingStatus

logger = logging.getLogger(__name__)


# ==================== MESSAGE SIGNALS ====================


@receiver(post_save, sender=Message)
def update_room_on_message_create(sender, instance, created, **kwargs):
    """
    Xabar yaratilganda xonani yangilash.
    select_for_update() bilan race condition oldini olish.
    """
    if not created:
        return

    try:
        with transaction.atomic():
            # MUHIM: select_for_update() - boshqa transaction kutadi
            room = ChatRoom.objects.select_for_update().get(pk=instance.room_id)

            # Last message ma'lumotlarini yangilash
            room.last_message_at = instance.created_at
            room.last_message_sender_id = instance.sender_id
            room.last_message_type = instance.message_type

            # Preview text tayyorlash
            if instance.message_type == Message.MessageType.TEXT:
                text = instance.text or ""
                room.last_message_preview = (
                    text[:147] + "..." if len(text) > 150 else text
                )
            elif instance.message_type == Message.MessageType.IMAGE:
                room.last_message_preview = "📷 Rasm"
            elif instance.message_type == Message.MessageType.FILE:
                room.last_message_preview = f"📎 {instance.file_name or 'Fayl'}"
            elif instance.message_type == Message.MessageType.AUDIO:
                room.last_message_preview = "🎵 Audio"
            elif instance.message_type == Message.MessageType.VIDEO:
                room.last_message_preview = "🎥 Video"
            elif instance.message_type == Message.MessageType.LOCATION:
                room.last_message_preview = (
                    f"📍 {instance.location_name or 'Joylashuv'}"
                )
            elif instance.message_type == Message.MessageType.SYSTEM:
                room.last_message_preview = "🔔 Tizim xabari"
            else:
                room.last_message_preview = "Xabar"

            # Total messages ni oshirish (F() expression bilan)
            room.total_messages = F("total_messages") + 1

            # Unread counts yangilash (faqat sender emas userlar uchun)
            if instance.sender_id:
                # Participants'larni olish
                participant_ids = list(
                    room.participants.exclude(id=instance.sender_id).values_list(
                        "id", flat=True
                    )
                )

                # Unread counts yangilash
                for participant_id in participant_ids:
                    user_id_str = str(participant_id)
                    current_count = room.unread_counts.get(user_id_str, 0)
                    room.unread_counts[user_id_str] = current_count + 1

            # Bir marta save qilish
            room.save(
                update_fields=[
                    "last_message_at",
                    "last_message_preview",
                    "last_message_sender_id",
                    "last_message_type",
                    "total_messages",
                    "unread_counts",
                    "last_activity_at",
                ]
            )

            logger.debug(f"Xona {room.id} muvaffaqiyatli yangilandi")

    except ChatRoom.DoesNotExist:
        logger.error(f"Xona topilmadi: {instance.room_id}")
    except Exception as e:
        logger.error(f"Xona yangilashda xato: {e}", exc_info=True)


@receiver(post_save, sender=Message)
def update_reply_count_on_message_save(sender, instance, created, **kwargs):
    """
    Reply qilingan xabarning reply_count'ini oshirish.
    """
    if not created or not instance.reply_to_id:
        return

    try:
        # F() expression bilan atomic update
        Message.objects.filter(pk=instance.reply_to_id).update(
            replies_count=F("replies_count") + 1
        )
        logger.debug(f"Reply count yangilandi: message_id={instance.reply_to_id}")

    except Exception as e:
        logger.error(f"Reply count yangilashda xato: {e}")


@receiver(pre_delete, sender=Message)
def update_room_on_message_hard_delete(sender, instance, **kwargs):
    """
    Xabar o'chirilganda (hard delete) xonani yangilash.
    """
    try:
        with transaction.atomic():
            room = ChatRoom.objects.select_for_update().get(pk=instance.room_id)

            # Total messages kamaytirish
            if room.total_messages > 0:
                room.total_messages = F("total_messages") - 1
                room.save(update_fields=["total_messages"])

            logger.debug(f"Xona {room.id} message delete'dan keyin yangilandi")

    except Exception as e:
        logger.error(f"Message delete'da xato: {e}")


@receiver(post_save, sender=Message)
def update_room_on_message_soft_delete(sender, instance, created, **kwargs):
    """
    Soft delete (is_deleted=True) bo'lganda xonani yangilash.
    """
    if created or not instance.is_deleted:
        return

    try:
        with transaction.atomic():
            room = ChatRoom.objects.select_for_update().get(pk=instance.room_id)

            # Total messages kamaytirish
            if room.total_messages > 0:
                room.total_messages = F("total_messages") - 1

            # Agar bu oxirgi xabar bo'lsa, yangisini topish
            if str(instance.id) == str(room.last_message_sender_id):
                new_last_message = (
                    room.messages.filter(is_deleted=False)
                    .order_by("-created_at")
                    .first()
                )

                if new_last_message:
                    room.update_last_message(new_last_message, save=False)
                else:
                    # Xabar qolmagan
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

            logger.debug(f"Soft delete'dan keyin xona {room.id} yangilandi")

    except Exception as e:
        logger.error(f"Soft delete'da xato: {e}")


@receiver(post_save, sender=Message)
def update_room_preview_on_message_edit(sender, instance, created, **kwargs):
    """
    Xabar tahrirlanganda room preview yangilash.
    """
    if created or not instance.is_edited:
        return

    try:
        with transaction.atomic():
            room = ChatRoom.objects.select_for_update().get(pk=instance.room_id)

            # Faqat oxirgi xabar bo'lsa yangilash
            last_message = (
                room.messages.filter(is_deleted=False).order_by("-created_at").first()
            )

            if last_message and last_message.id == instance.id:
                room.update_last_message(instance, save=True)
                logger.debug(
                    f"Message edit'dan keyin preview yangilandi: room={room.id}"
                )

    except Exception as e:
        logger.error(f"Message edit'da xato: {e}")


# ==================== READ RECEIPT SIGNALS ====================


@receiver(post_save, sender=MessageRead)
def update_counts_on_read_receipt(sender, instance, created, **kwargs):
    """
    Xabar o'qilganda read_count va unread_counts yangilash.
    """
    if not created:
        return

    try:
        with transaction.atomic():
            # Message read count'ni oshirish
            Message.objects.filter(pk=instance.message_id).update(
                read_count=F("read_count") + 1
            )

            # Room unread count'ni kamaytirish
            room = ChatRoom.objects.select_for_update().get(pk=instance.message.room_id)

            user_id_str = str(instance.user_id)
            current_unread = room.unread_counts.get(user_id_str, 0)

            if current_unread > 0:
                room.unread_counts[user_id_str] = max(0, current_unread - 1)
                room.save(update_fields=["unread_counts"])

            logger.debug(
                f"Read receipt yaratildi: message={instance.message_id}, user={instance.user_id}"
            )

    except Exception as e:
        logger.error(f"Read receipt'da xato: {e}", exc_info=True)


# ==================== PARTICIPANTS SIGNALS ====================


@receiver(m2m_changed, sender=ChatRoom.participants.through)
def update_room_on_participants_change(sender, instance, action, pk_set, **kwargs):
    """
    Participants o'zgarganda unread_counts'ni yangilash.
    """
    if action not in ["post_add", "post_remove"]:
        return

    if not pk_set:
        return

    try:
        with transaction.atomic():
            # select_for_update bilan lock
            room = ChatRoom.objects.select_for_update().get(pk=instance.id)

            if action == "post_add":
                # Yangi participantlar uchun unread_counts = 0
                for user_id in pk_set:
                    user_id_str = str(user_id)
                    if user_id_str not in room.unread_counts:
                        room.unread_counts[user_id_str] = 0

            elif action == "post_remove":
                # Chiqib ketgan participantlarni o'chirish
                for user_id in pk_set:
                    user_id_str = str(user_id)
                    room.unread_counts.pop(user_id_str, None)

            room.save(update_fields=["unread_counts"])
            logger.debug(f"Participants o'zgardi: room={room.id}, action={action}")

    except Exception as e:
        logger.error(f"Participants update'da xato: {e}")


# ==================== TYPING STATUS SIGNALS ====================


@receiver(post_save, sender=UserTypingStatus)
def cleanup_old_typing_statuses(sender, instance, **kwargs):
    """
    Eski typing statuslarni tozalash (optimization).
    """
    # Har 50-chi save'da tozalash (100 emas, tez-tez tozalash yaxshi)
    if instance.id % 50 == 0:
        try:
            cutoff_time = timezone.now() - timezone.timedelta(minutes=5)

            cleaned_count = UserTypingStatus.objects.filter(
                is_typing=True, last_typed_at__lt=cutoff_time
            ).update(is_typing=False)

            if cleaned_count > 0:
                logger.info(f"Eski typing statuslar tozalandi: {cleaned_count} ta")

        except Exception as e:
            logger.error(f"Typing cleanup'da xato: {e}")


# ==================== UTILITY FUNCTIONS ====================


def bulk_update_room_unread_counts(room_id: str, user_message_counts: Dict[str, int]):
    """
    Bulk unread counts yangilash.

    Args:
        room_id: Xona ID
        user_message_counts: {user_id: additional_count} dict
    """
    try:
        with transaction.atomic():
            room = ChatRoom.objects.select_for_update().get(id=room_id)

            for user_id, additional_count in user_message_counts.items():
                user_id_str = str(user_id)
                current_count = room.unread_counts.get(user_id_str, 0)
                room.unread_counts[user_id_str] = current_count + additional_count

            room.save(update_fields=["unread_counts"])
            logger.info(f"Bulk unread counts yangilandi: room={room_id}")

    except ChatRoom.DoesNotExist:
        logger.error(f"Xona topilmadi: {room_id}")
    except Exception as e:
        logger.error(f"Bulk update'da xato: {e}")


def recalculate_room_statistics(room_id: str) -> Optional[Dict[str, Any]]:
    """
    Xona statistikasini qayta hisoblash (data recovery uchun).

    Returns:
        Dict with recalculated stats or None if error
    """
    try:
        with transaction.atomic():
            room = ChatRoom.objects.select_for_update().get(id=room_id)

            # Haqiqiy message count
            actual_message_count = room.messages.filter(is_deleted=False).count()

            # Oxirgi xabar
            last_message = (
                room.messages.filter(is_deleted=False).order_by("-created_at").first()
            )

            # Update fields
            room.total_messages = actual_message_count

            if last_message:
                room.update_last_message(last_message, save=False)
            else:
                room.last_message_at = None
                room.last_message_preview = ""
                room.last_message_sender_id = None
                room.last_message_type = ""

            room.save()

            logger.info(f"Xona statistikasi qayta hisoblandi: room={room_id}")

            return {
                "room_id": str(room_id),
                "total_messages": actual_message_count,
                "last_message_at": room.last_message_at,
                "status": "success",
            }

    except ChatRoom.DoesNotExist:
        logger.warning(f"Xona topilmadi: {room_id}")
        return None
    except Exception as e:
        logger.error(f"Recalculate'da xato: {e}", exc_info=True)
        return None


def validate_room_data_consistency(room_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Xona ma'lumotlari consistency tekshirish.

    Returns:
        Dict with validation results
    """
    try:
        rooms = ChatRoom.objects.all()
        if room_id:
            rooms = rooms.filter(id=room_id)

        inconsistencies = []
        fixed_count = 0

        for room in rooms:
            issues = []

            # Message count tekshirish
            actual_count = room.messages.filter(is_deleted=False).count()
            if room.total_messages != actual_count:
                issues.append(
                    {
                        "type": "message_count_mismatch",
                        "stored": room.total_messages,
                        "actual": actual_count,
                    }
                )

            # Last message tekshirish
            last_message = (
                room.messages.filter(is_deleted=False).order_by("-created_at").first()
            )

            if last_message:
                if room.last_message_at != last_message.created_at:
                    issues.append(
                        {
                            "type": "last_message_time_mismatch",
                            "stored": room.last_message_at,
                            "actual": last_message.created_at,
                        }
                    )

            # Unread counts tekshirish
            for user_id_str in room.unread_counts.keys():
                if room.unread_counts[user_id_str] < 0:
                    issues.append(
                        {
                            "type": "negative_unread_count",
                            "user_id": user_id_str,
                            "value": room.unread_counts[user_id_str],
                        }
                    )

            if issues:
                inconsistencies.append({"room_id": str(room.id), "issues": issues})

        return {
            "total_rooms_checked": rooms.count(),
            "inconsistencies_found": len(inconsistencies),
            "details": inconsistencies,
            "timestamp": timezone.now().isoformat(),
        }

    except Exception as e:
        logger.error(f"Validation'da xato: {e}", exc_info=True)
        return {"error": str(e), "timestamp": timezone.now().isoformat()}


def initialize_room_denormalized_fields(room_id: str):
    """
    Mavjud xona uchun denormalized field'larni initialization.
    Migration uchun foydali.
    """
    try:
        with transaction.atomic():
            room = ChatRoom.objects.select_for_update().get(id=room_id)

            # Barcha participantlar uchun unread_counts = 0
            for participant in room.participants.all():
                user_id_str = str(participant.id)
                if user_id_str not in room.unread_counts:
                    room.unread_counts[user_id_str] = 0

            room.save(update_fields=["unread_counts"])

            # Statistikani qayta hisoblash
            recalculate_room_statistics(room_id)

            logger.info(f"Denormalized fields initialized: room={room_id}")

    except ChatRoom.DoesNotExist:
        logger.error(f"Xona topilmadi: {room_id}")
    except Exception as e:
        logger.error(f"Initialization'da xato: {e}")


# ==================== SIGNAL MANAGEMENT ====================


class DisableSignals:
    """
    Context manager to temporarily disable signals.
    Bulk operations uchun foydali.
    """

    def __init__(self, disabled_signals):
        self.disabled_signals = disabled_signals
        self.signal_receivers = {}

    def __enter__(self):
        for signal in self.disabled_signals:
            self.signal_receivers[signal] = signal.receivers
            signal.receivers = []
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        for signal in self.disabled_signals:
            signal.receivers = self.signal_receivers[signal]


def disable_chat_signals():
    """
    Barcha chat signallarini o'chirish.

    Usage:
        with disable_chat_signals():
            # bulk operations
    """
    return DisableSignals([post_save, post_delete, pre_delete, m2m_changed])
