# utils.py yaratish kerak:
# apps/accounts/utils.py
import secrets
import string


def generate_code(length: int = 6) -> str:
    """Generate secure random numeric code"""
    return "".join(secrets.choice(string.digits) for _ in range(length))
