# bot/handlers/files.py
from aiogram import Router, F
from aiogram.types import Message
from pathlib import Path
import logging

router = Router()

BASE_DIR = Path(__file__).resolve().parent.parent
FILES_DIR = BASE_DIR / "data" / "files"
FILES_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTS = (".xlsx", ".xls", ".csv")

@router.message(F.document)  # keng filter: HAR QANDAY hujjat kiradi
async def handle_any_document(message: Message):
    doc = message.document
    name = (doc.file_name or "file").strip()

    # Fayl nomiga qarab filtrlash (MIME emas, chunki ba’zan octet-stream bo'ladi)
    lower = name.lower()
    if not lower.endswith(ALLOWED_EXTS):
        logging.info("Document rejected (ext mismatch): %s | mime=%s | size=%s",
                     name, doc.mime_type, doc.file_size)
        await message.answer("❗ Iltimos, Excel (.xlsx/.xls) yoki CSV yuboring.")
        return

    try:
        # Aiogram v3: get_file -> file_path -> download
        tg_file = await message.bot.get_file(doc.file_id)
        dest = FILES_DIR / name

        # v3 usuli: file_path orqali yuklab olish
        await message.bot.download(tg_file.file_path, destination=dest)

        logging.info("✅ Saved document: %s | mime=%s | size=%s -> %s",
                     name, doc.mime_type, doc.file_size, dest)
        await message.answer(f"✅ Saqlandi: {dest.name}")
    except Exception as e:
        logging.exception("❌ Download failed for %s", name)
        await message.answer(f"❌ Yuklab olishda xato: {e}")
