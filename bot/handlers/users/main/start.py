# handlers.users.main.start
from aiogram import Router, F
from aiogram.filters import Command
from aiogram.types import Message, CallbackQuery

from utils.database.db import DataBase
from keyboards.inline.user import get_channel_keyboard
from data.config import load_config
from middlewares.checksub import CheckSubscriptionMiddleware

# Global obyektlar
router = Router()
db = DataBase()
config = load_config()
check_sub_middleware = CheckSubscriptionMiddleware()


@router.message(Command("start"))
async def start_handler(message: Message):
    user_id = message.from_user.id
    username = message.from_user.username
    full_name = message.from_user.full_name

    # Foydalanuvchini bazaga qo'shish
    await db.add_user(
        user_id=user_id, username=username, full_name=full_name, is_premium=False
    )

    # Obuna bo'lmagan kanallar ro'yxatini tekshirish
    missing_channels = await check_sub_middleware.check_all_subscriptions(
        user_id=user_id, bot=message.bot
    )

    if missing_channels:
        # Agar obuna bo'lmagan kanallar bo'lsa, ularga obuna bo'lishni so'rash
        keyboard = await get_channel_keyboard(missing_channels)
        await message.answer(
            f"📢 Iltimos, quyidagi {len(missing_channels)} ta kanalga obuna bo'ling:",
            reply_markup=keyboard,
        )
    else:
        # Asosiy menyuni ko'rsatish
        await show_main_menu(message)


@router.callback_query(F.data == "check_subscription")
async def check_subscription_handler(callback: CallbackQuery):
    # Faqat obuna bo'lmagan kanallarni tekshirish
    missing_channels = await check_sub_middleware.check_all_subscriptions(
        user_id=callback.from_user.id, bot=callback.bot
    )

    if missing_channels:
        # Obuna bo'lmagan kanallar uchun yangi klaviatura yaratish
        keyboard = await get_channel_keyboard(missing_channels)
        await callback.message.edit_text(
            f"📢 Yana {len(missing_channels)} ta kanalga obuna bo'lishingiz kerak:",
            reply_markup=keyboard,
        )
        await callback.answer(
            f"Siz hali {len(missing_channels)} ta kanalga obuna bo'lmagansiz!",
            show_alert=True,
        )
    else:
        # Barcha kanallarga obuna bo'lgan bo'lsa
        await callback.message.edit_text(
            "✅ Obuna tasdiqlandi! Endi botdan to'liq foydalanishingiz mumkin."
        )
        await show_main_menu(callback.message)


async def show_main_menu(message: Message):
    await message.answer("assalomu alaykum hush kelipsiz")
