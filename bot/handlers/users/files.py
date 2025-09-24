from aiogram import Router, F
from aiogram.types import Message
from pathlib import Path
import logging

router = Router()

# /app/bot ga saqlash (hozirgi holat). Agar /app/data/files xohlasangiz, parents[3] qiling.
BASE_DIR = Path(__file__).resolve().parents[2]  # /app/bot
FILES_DIR = BASE_DIR / "data" / "files"
FILES_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTS = (".xlsx", ".xls", ".csv")


@router.message(F.document)  # keng filter: har qanday hujjat
async def handle_any_document(message: Message):
    doc = message.document
    name = (doc.file_name or "file").strip().replace("/", "_")
    lower = name.lower()

    # Faqat kengaytmaga ko'ra ruxsat — MIME ba'zan octet-stream bo'ladi
    if not lower.endswith(ALLOWED_EXTS):
        logging.info(
            "Document rejected (ext mismatch): %s | mime=%s | size=%s",
            name,
            doc.mime_type,
            doc.file_size,
        )
        await message.answer("❗ Iltimos, Excel (.xlsx/.xls) yoki CSV yuboring.")
        return

    try:
        # Aiogram v3: telegram fayl yo'lini olib, shu yo'l bo'yicha yuklab olish
        tg_file = await message.bot.get_file(doc.file_id)
        dest = FILES_DIR / name
        await message.bot.download(tg_file.file_path, destination=dest)

        logging.info(
            "✅ Saved document: %s | mime=%s | size=%s -> %s",
            name,
            doc.mime_type,
            doc.file_size,
            dest,
        )
        await message.answer(f"✅ Saqlandi: {dest.name}")
    except Exception as e:
        logging.exception("❌ Download failed for %s", name)
        await message.answer(f"❌ Yuklab olishda xato: {e}")
