# app.py
import asyncio
import logging
import sys
from aiogram import Bot, Dispatcher
from aiogram.enums import ParseMode
from aiogram.client.default import DefaultBotProperties

from handlers.users.main import start_router
from handlers.users.admin.admin_spams import router as admin_spams_router
from handlers.users.admin.admin import router as admin_router
from middlewares.checksub import CheckSubscriptionMiddleware
from dotenv import load_dotenv
from handlers.users.files import router as files_router

load_dotenv()


from data.config import load_config
from utils.database.db_init import init_db


# Logger sozlamalari
logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("bot.log", encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)


def setup_handlers(dp: Dispatcher):
    """Barcha handlerlarni ulash va middleware'ni qo'shish"""
    # Middleware'ni barcha routerlarga qo'shish
    middleware = CheckSubscriptionMiddleware()

    # Admin router uchun middleware
    admin_router.message.middleware(middleware)
    admin_router.callback_query.middleware(middleware)

    # Start router uchun middleware
    start_router.message.middleware(middleware)
    start_router.callback_query.middleware(middleware)

    # Admin spams router uchun middleware
    admin_spams_router.message.middleware(middleware)
    admin_spams_router.callback_query.middleware(middleware)
    files_router.message.middleware(middleware)
    # Routerlarni Dispatcher'ga ulash

    dp.include_router(files_router)
    dp.include_router(admin_router)
    dp.include_router(start_router)
    dp.include_router(admin_spams_router)
    logger.info("Barcha handlerlar va middleware'lar ulandi")


async def main():
    # Configni yuklash
    config = load_config()

    # 🔧 Jadvalni yaratish yoki mavjudligini tekshirish
    await init_db()

    # Bot va Dispatcher yaratish
    bot = Bot(
        token=config.bot.token, default=DefaultBotProperties(parse_mode=ParseMode.HTML)
    )
    dp = Dispatcher()

    # Handlerlar va middleware'larni ulash
    setup_handlers(dp)

    # Botni ishga tushirish
    try:
        logger.info("Bot ishga tushdi")
        await dp.start_polling(bot)
    except Exception as e:
        logger.error(f"Bot ishga tushishida xatolik: {e}")
    finally:
        await bot.session.close()
        logger.info("Bot va barcha resurslar to'xtatildi")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Bot administrativ tarzda to'xtatildi")
    except Exception as e:
        logger.error(f"Kutilmagan xatolik: {e}")
        sys.exit(1)
