# apps/chat/services.py - YANGI FAYL
from typing import Optional, Tuple
from django.db import transaction
from apps.chat.models import ChatRoom, Message
from apps.users.models import User
from apps.bookings.models import Booking
import logging

logger = logging.getLogger(__name__)


class ChatService:
    """
    Chat business logic for TravelMatcher
    """

    @staticmethod
    @transaction.atomic
    def create_booking_chat(
        client_id: str, customer_id: str, booking_id: str, initial_message: str = None
    ) -> Tuple[ChatRoom, bool]:
        """
        Client booking request qilganda chat yaratish

        Args:
            client_id: Client user ID
            customer_id: Customer (host) user ID
            booking_id: Booking ID
            initial_message: Birinchi xabar (optional)

        Returns:
            (ChatRoom, created) - chat xona va yangi yaratilganmi
        """
        try:
            # 1. Booking tekshirish
            booking = Booking.objects.select_for_update().get(id=booking_id)

            # 2. Mavjud chat bormi tekshirish
            existing_room = ChatRoom.objects.filter(
                booking=booking, room_type=ChatRoom.RoomType.BOOKING
            ).first()

            if existing_room:
                logger.info(f"Existing chat found for booking {booking_id}")
                return existing_room, False

            # 3. Yangi chat yaratish
            room = ChatRoom.objects.create(
                room_type=ChatRoom.RoomType.BOOKING,
                booking=booking,
                total_messages=0,
                unread_counts={str(client_id): 0, str(customer_id): 0},
            )

            # 4. Participants qo'shish
            room.participants.add(client_id, customer_id)

            # 5. Initial system message
            system_message = Message.objects.create(
                room=room,
                sender=None,  # System message
                message_type=Message.MessageType.SYSTEM,
                text=f"Chat started for booking #{booking.id}",
            )

            # 6. Agar initial message bo'lsa
            if initial_message:
                first_message = Message.objects.create(
                    room=room,
                    sender_id=client_id,
                    message_type=Message.MessageType.TEXT,
                    text=initial_message,
                )

                # Customer uchun unread
                room.unread_counts[str(customer_id)] = 1
                room.save(update_fields=["unread_counts"])

            logger.info(f"Chat created for booking {booking_id}")
            return room, True

        except Booking.DoesNotExist:
            logger.error(f"Booking {booking_id} not found")
            raise
        except Exception as e:
            logger.error(f"Error creating booking chat: {e}")
            raise

    @staticmethod
    def accept_booking_request(booking_id: str, customer_id: str) -> Optional[ChatRoom]:
        """
        Customer booking qabul qilganda chat aktivlashtirish
        """
        try:
            with transaction.atomic():
                # Booking update
                booking = Booking.objects.select_for_update().get(
                    id=booking_id, customer_id=customer_id
                )
                booking.status = "accepted"
                booking.save()

                # Chat room aktivlashtirish
                room = ChatRoom.objects.get(booking=booking)

                # Acceptance message
                Message.objects.create(
                    room=room,
                    sender=None,
                    message_type=Message.MessageType.SYSTEM,
                    text="Booking request accepted! You can now chat.",
                )

                return room

        except Exception as e:
            logger.error(f"Error accepting booking: {e}")
            return None
