# apps/common/validators.py (if not exists)
from django.core.exceptions import ValidationError
from django.core.files.images import get_image_dimensions


def validate_image_file(image):
    """Validate uploaded image file."""
    if not image:
        return

    # Check file size (max 10MB)
    if image.size > 10 * 1024 * 1024:
        raise ValidationError("Image file size cannot exceed 10MB")

    # Check dimensions (max 4096x4096)
    width, height = get_image_dimensions(image)
    if width > 4096 or height > 4096:
        raise ValidationError("Image dimensions cannot exceed 4096x4096 pixels")

    # Check file type
    valid_extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp']
    ext = image.name.lower().split('.')[-1]
    if ext not in valid_extensions:
        raise ValidationError(f"Invalid image format. Allowed: {', '.join(valid_extensions)}")


def validate_document_file(file):
    """Validate uploaded document file."""
    if not file:
        return

    # Check file size (max 25MB)
    if file.size > 25 * 1024 * 1024:
        raise ValidationError("File size cannot exceed 25MB")

    # Check file type
    valid_extensions = [
        'pdf', 'doc', 'docx', 'txt', 'rtf',  # Documents
        'mp3', 'wav', 'ogg', 'm4a',  # Audio
        'mp4', 'avi', 'mov', 'mkv',  # Video
        'zip', 'rar', '7z',  # Archives
    ]

    ext = file.name.lower().split('.')[-1]
    if ext not in valid_extensions:
        raise ValidationError(f"Invalid file format. Allowed: {', '.join(valid_extensions)}")

