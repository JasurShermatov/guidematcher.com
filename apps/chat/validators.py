# apps/common/validators.py
"""
File validation utilities for secure file uploads.
"""
import magic
import hashlib
import mimetypes
from typing import Optional, Tuple, List
from django.core.exceptions import ValidationError
from django.core.files.images import get_image_dimensions
from django.conf import settings
from PIL import Image
import logging

logger = logging.getLogger(__name__)


class FileValidator:
    """
    Comprehensive file validation with security checks.
    """

    # File size limits
    MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB
    MAX_DOCUMENT_SIZE = 25 * 1024 * 1024  # 25MB
    MAX_VIDEO_SIZE = 100 * 1024 * 1024  # 100MB
    MAX_AUDIO_SIZE = 50 * 1024 * 1024  # 50MB

    # Image constraints
    MAX_IMAGE_DIMENSION = 4096
    MIN_IMAGE_DIMENSION = 10

    # Allowed formats with MIME types
    ALLOWED_IMAGE_FORMATS = {
        "jpg": ["image/jpeg"],
        "jpeg": ["image/jpeg"],
        "png": ["image/png"],
        "gif": ["image/gif"],
        "webp": ["image/webp"],
        "bmp": ["image/bmp"],
    }

    ALLOWED_DOCUMENT_FORMATS = {
        "pdf": ["application/pdf"],
        "doc": ["application/msword"],
        "docx": [
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ],
        "txt": ["text/plain"],
        "rtf": ["application/rtf", "text/rtf"],
        "odt": ["application/vnd.oasis.opendocument.text"],
        "xls": ["application/vnd.ms-excel"],
        "xlsx": ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
    }

    ALLOWED_AUDIO_FORMATS = {
        "mp3": ["audio/mpeg", "audio/mp3"],
        "wav": ["audio/wav", "audio/x-wav"],
        "ogg": ["audio/ogg"],
        "m4a": ["audio/mp4", "audio/x-m4a"],
        "aac": ["audio/aac"],
        "flac": ["audio/flac"],
    }

    ALLOWED_VIDEO_FORMATS = {
        "mp4": ["video/mp4"],
        "avi": ["video/x-msvideo", "video/avi"],
        "mov": ["video/quicktime"],
        "mkv": ["video/x-matroska"],
        "webm": ["video/webm"],
        "flv": ["video/x-flv"],
    }

    ALLOWED_ARCHIVE_FORMATS = {
        "zip": ["application/zip", "application/x-zip-compressed"],
        "rar": ["application/x-rar-compressed", "application/vnd.rar"],
        "7z": ["application/x-7z-compressed"],
        "tar": ["application/x-tar"],
        "gz": ["application/gzip"],
    }

    # Malicious patterns
    DANGEROUS_PATTERNS = [
        b"<script",  # JavaScript
        b"javascript:",  # JS protocol
        b"onerror=",  # Event handlers
        b"onclick=",
        b"<iframe",  # Iframe injection
        b"<%",  # Server-side includes
        b"<?php",  # PHP code
        b"\x00",  # Null bytes
    ]

    @classmethod
    def validate_image_file(cls, image_file) -> None:
        """
        Comprehensive image validation.
        """
        if not image_file:
            return

        # Reset file pointer
        image_file.seek(0)

        # 1. Check file size
        if image_file.size > cls.MAX_IMAGE_SIZE:
            raise ValidationError(
                f"Rasm hajmi {cls.MAX_IMAGE_SIZE // (1024 * 1024)}MB dan oshmasligi kerak. "
                f"Sizning fayl: {image_file.size // (1024 * 1024):.1f}MB"
            )

        # 2. Check extension
        ext = cls._get_file_extension(image_file.name)
        if ext not in cls.ALLOWED_IMAGE_FORMATS:
            raise ValidationError(
                f"Noto'g'ri rasm formati: {ext}. "
                f"Ruxsat berilgan: {', '.join(cls.ALLOWED_IMAGE_FORMATS.keys())}"
            )

        # 3. Verify MIME type using python-magic
        mime_type = cls._get_mime_type(image_file)
        if mime_type not in cls.ALLOWED_IMAGE_FORMATS[ext]:
            raise ValidationError(
                f"Fayl turi mos emas. Kutilgan: {ext}, " f"Aniqlangan: {mime_type}"
            )

        # 4. Check image validity and dimensions
        try:
            # Reset pointer
            image_file.seek(0)

            # Open with PIL for deep validation
            with Image.open(image_file) as img:
                # Verify it's a valid image
                img.verify()

                # Get dimensions
                width, height = img.size

                # Check dimensions
                if width > cls.MAX_IMAGE_DIMENSION or height > cls.MAX_IMAGE_DIMENSION:
                    raise ValidationError(
                        f"Rasm o'lchami {cls.MAX_IMAGE_DIMENSION}x{cls.MAX_IMAGE_DIMENSION} "
                        f"pikseldan oshmasligi kerak. Sizning rasm: {width}x{height}"
                    )

                if width < cls.MIN_IMAGE_DIMENSION or height < cls.MIN_IMAGE_DIMENSION:
                    raise ValidationError(
                        f"Rasm juda kichik. Minimal o'lcham: "
                        f"{cls.MIN_IMAGE_DIMENSION}x{cls.MIN_IMAGE_DIMENSION} piksel"
                    )

                # Check aspect ratio (optional)
                aspect_ratio = width / height
                if aspect_ratio > 10 or aspect_ratio < 0.1:
                    raise ValidationError(
                        "Rasm proporsiyasi noto'g'ri (juda keng yoki juda baland)"
                    )

        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"Image validation error: {e}")
            raise ValidationError(f"Rasm faylini o'qib bo'lmadi: {str(e)}")

        # 5. Check for malicious content
        cls._check_malicious_content(image_file)

        # Reset pointer for further processing
        image_file.seek(0)

    @classmethod
    def validate_document_file(cls, document_file) -> None:
        """
        Document file validation.
        """
        if not document_file:
            return

        # Reset file pointer
        document_file.seek(0)

        # 1. Check file size
        if document_file.size > cls.MAX_DOCUMENT_SIZE:
            raise ValidationError(
                f"Fayl hajmi {cls.MAX_DOCUMENT_SIZE // (1024 * 1024)}MB dan oshmasligi kerak. "
                f"Sizning fayl: {document_file.size // (1024 * 1024):.1f}MB"
            )

        # 2. Check extension
        ext = cls._get_file_extension(document_file.name)
        if ext not in cls.ALLOWED_DOCUMENT_FORMATS:
            raise ValidationError(
                f"Noto'g'ri hujjat formati: {ext}. "
                f"Ruxsat berilgan: {', '.join(cls.ALLOWED_DOCUMENT_FORMATS.keys())}"
            )

        # 3. Verify MIME type
        mime_type = cls._get_mime_type(document_file)
        if mime_type not in cls.ALLOWED_DOCUMENT_FORMATS[ext]:
            logger.warning(f"MIME type mismatch: expected {ext}, got {mime_type}")
            # Don't raise error for documents, as MIME detection can be unreliable

        # 4. Check for malicious content
        cls._check_malicious_content(document_file)

        # Reset pointer
        document_file.seek(0)

    @classmethod
    def validate_audio_file(cls, audio_file) -> None:
        """
        Audio file validation.
        """
        if not audio_file:
            return

        audio_file.seek(0)

        # 1. Check file size
        if audio_file.size > cls.MAX_AUDIO_SIZE:
            raise ValidationError(
                f"Audio fayl hajmi {cls.MAX_AUDIO_SIZE // (1024 * 1024)}MB dan oshmasligi kerak"
            )

        # 2. Check extension
        ext = cls._get_file_extension(audio_file.name)
        if ext not in cls.ALLOWED_AUDIO_FORMATS:
            raise ValidationError(
                f"Noto'g'ri audio format: {ext}. "
                f"Ruxsat berilgan: {', '.join(cls.ALLOWED_AUDIO_FORMATS.keys())}"
            )

        # 3. Verify MIME type
        mime_type = cls._get_mime_type(audio_file)
        if mime_type not in cls.ALLOWED_AUDIO_FORMATS[ext]:
            logger.warning(f"Audio MIME mismatch: {mime_type}")

        audio_file.seek(0)

    @classmethod
    def validate_video_file(cls, video_file) -> None:
        """
        Video file validation.
        """
        if not video_file:
            return

        video_file.seek(0)

        # 1. Check file size
        if video_file.size > cls.MAX_VIDEO_SIZE:
            raise ValidationError(
                f"Video fayl hajmi {cls.MAX_VIDEO_SIZE // (1024 * 1024)}MB dan oshmasligi kerak"
            )

        # 2. Check extension
        ext = cls._get_file_extension(video_file.name)
        if ext not in cls.ALLOWED_VIDEO_FORMATS:
            raise ValidationError(f"Noto'g'ri video format: {ext}")

        # 3. Verify MIME type
        mime_type = cls._get_mime_type(video_file)
        if mime_type not in cls.ALLOWED_VIDEO_FORMATS[ext]:
            logger.warning(f"Video MIME mismatch: {mime_type}")

        video_file.seek(0)

    @classmethod
    def validate_any_file(cls, file_obj, file_type: str = "auto") -> None:
        """
        Universal file validator.

        Args:
            file_obj: File object
            file_type: 'image', 'document', 'audio', 'video', 'auto'
        """
        if not file_obj:
            return

        # Auto-detect file type
        if file_type == "auto":
            ext = cls._get_file_extension(file_obj.name)

            if ext in cls.ALLOWED_IMAGE_FORMATS:
                file_type = "image"
            elif ext in cls.ALLOWED_DOCUMENT_FORMATS:
                file_type = "document"
            elif ext in cls.ALLOWED_AUDIO_FORMATS:
                file_type = "audio"
            elif ext in cls.ALLOWED_VIDEO_FORMATS:
                file_type = "video"
            else:
                raise ValidationError(f"Noma'lum fayl turi: {ext}")

        # Validate based on type
        validators = {
            "image": cls.validate_image_file,
            "document": cls.validate_document_file,
            "audio": cls.validate_audio_file,
            "video": cls.validate_video_file,
        }

        validator = validators.get(file_type)
        if validator:
            validator(file_obj)
        else:
            raise ValidationError(f"Noto'g'ri fayl turi: {file_type}")

    @staticmethod
    def _get_file_extension(filename: str) -> str:
        """Get file extension safely."""
        if not filename:
            return ""

        # Handle multiple dots
        parts = filename.lower().split(".")
        if len(parts) > 1:
            return parts[-1]
        return ""

    @staticmethod
    def _get_mime_type(file_obj) -> str:
        """
        Get MIME type using python-magic.
        Falls back to mimetypes if magic fails.
        """
        try:
            # Reset pointer
            file_obj.seek(0)

            # Try python-magic first (more reliable)
            mime = magic.from_buffer(file_obj.read(2048), mime=True)

            # Reset pointer
            file_obj.seek(0)

            return mime

        except Exception as e:
            logger.warning(f"Magic MIME detection failed: {e}")

            # Fallback to mimetypes
            mime_type, _ = mimetypes.guess_type(file_obj.name)
            return mime_type or "application/octet-stream"

    @classmethod
    def _check_malicious_content(cls, file_obj) -> None:
        """
        Check for malicious patterns in file.
        """
        try:
            # Reset pointer
            file_obj.seek(0)

            # Read first 10KB for pattern matching
            content = file_obj.read(10240)

            # Check for dangerous patterns
            for pattern in cls.DANGEROUS_PATTERNS:
                if pattern in content:
                    logger.warning(
                        f"Malicious pattern detected in file: {file_obj.name}"
                    )
                    raise ValidationError("Fayl xavfsizlik tekshiruvidan o'tmadi")

            # Reset pointer
            file_obj.seek(0)

        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"Malicious content check error: {e}")

    @staticmethod
    def calculate_file_hash(file_obj, algorithm: str = "sha256") -> str:
        """
        Calculate file hash for integrity checking.
        """
        file_obj.seek(0)

        hash_obj = hashlib.new(algorithm)

        # Read in chunks to handle large files
        for chunk in iter(lambda: file_obj.read(4096), b""):
            hash_obj.update(chunk)

        file_obj.seek(0)

        return hash_obj.hexdigest()

    @staticmethod
    def get_file_metadata(file_obj) -> dict:
        """
        Extract file metadata.
        """
        file_obj.seek(0)

        metadata = {
            "name": file_obj.name,
            "size": file_obj.size,
            "mime_type": FileValidator._get_mime_type(file_obj),
            "extension": FileValidator._get_file_extension(file_obj.name),
        }

        # For images, add dimensions
        if metadata["extension"] in FileValidator.ALLOWED_IMAGE_FORMATS:
            try:
                file_obj.seek(0)
                with Image.open(file_obj) as img:
                    metadata["width"] = img.width
                    metadata["height"] = img.height
                    metadata["format"] = img.format
                    metadata["mode"] = img.mode
            except Exception as e:
                logger.error(f"Error getting image metadata: {e}")

        file_obj.seek(0)

        return metadata


# ==================== QUICK VALIDATORS ====================


def validate_image_file(image):
    """Quick image validation for forms."""
    FileValidator.validate_image_file(image)


def validate_document_file(document):
    """Quick document validation for forms."""
    FileValidator.validate_document_file(document)


def validate_audio_file(audio):
    """Quick audio validation for forms."""
    FileValidator.validate_audio_file(audio)


def validate_video_file(video):
    """Quick video validation for forms."""
    FileValidator.validate_video_file(video)


def validate_chat_file(file_obj):
    """Validate any file for chat upload."""
    FileValidator.validate_any_file(file_obj, file_type="auto")


# ==================== FILE SANITIZERS ====================


class FileSanitizer:
    """
    Sanitize uploaded files for security.
    """

    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """
        Sanitize filename to prevent directory traversal.
        """
        import re
        import unicodedata

        # Normalize unicode
        filename = unicodedata.normalize("NFKD", filename)

        # Remove path components
        filename = filename.replace("/", "").replace("\\", "")

        # Remove special characters except dot and hyphen
        filename = re.sub(r"[^\w\s.-]", "", filename)

        # Remove multiple dots (prevent extension spoofing)
        filename = re.sub(r"\.+", ".", filename)

        # Limit length
        name, ext = filename.rsplit(".", 1) if "." in filename else (filename, "")
        if len(name) > 100:
            name = name[:100]

        filename = f"{name}.{ext}" if ext else name

        return filename.strip()

    @staticmethod
    def generate_safe_filename(original_name: str) -> str:
        """
        Generate unique safe filename.
        """
        import uuid
        from datetime import datetime

        # Get extension
        ext = FileValidator._get_file_extension(original_name)

        # Generate unique name
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]

        return f"{timestamp}_{unique_id}.{ext}"

    @staticmethod
    def optimize_image(image_file, max_size: Tuple[int, int] = (1920, 1920)) -> None:
        """
        Optimize image for web (resize and compress).
        """
        try:
            image_file.seek(0)

            with Image.open(image_file) as img:
                # Convert RGBA to RGB if needed
                if img.mode in ("RGBA", "LA"):
                    background = Image.new("RGB", img.size, (255, 255, 255))
                    background.paste(
                        img, mask=img.split()[-1] if img.mode == "RGBA" else None
                    )
                    img = background

                # Resize if too large
                img.thumbnail(max_size, Image.Resampling.LANCZOS)

                # Save optimized
                from io import BytesIO

                output = BytesIO()
                img.save(output, format="JPEG", quality=85, optimize=True)

                # Replace file content
                image_file.seek(0)
                image_file.write(output.getvalue())
                image_file.truncate()

        except Exception as e:
            logger.error(f"Image optimization error: {e}")
