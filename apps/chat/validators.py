from django.core.exceptions import ValidationError
import mimetypes
import os


def validate_file(file):
    """
    Validate file uploads for messages
    """
    max_size = 5 * 1024 * 1024  # 5MB
    allowed_types = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "application/pdf",
        "text/plain",
    ]

    if file.size > max_size:
        raise ValidationError(
            f"Fayl hajmi 5MB dan kichik bo'lishi kerak (hozirgi: {file.size} bayt)."
        )

    content_type = file.content_type
    if content_type not in allowed_types:
        raise ValidationError(
            f"Fayl turi ruxsat etilmagan. Ruxsat etilgan turlar: {', '.join(allowed_types)}."
        )

    # Generate a file URL (assuming S3 or similar storage)
    file_extension = (
        mimetypes.guess_extension(content_type) or os.path.splitext(file.name)[1]
    )
    file_url = f"https://storage.example.com/uploads/{file.name}"  # Replace with actual storage logic

    return {
        "file_url": file_url,
        "file_name": file.name,
        "file_size": file.size,
        "content_type": content_type,
    }
