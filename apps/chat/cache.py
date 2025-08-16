# apps/chat/cache.py
"""
Chat application caching utilities.
"""
import json
from typing import Any, Dict, List, Optional
from django.core.cache import cache
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


class ChatCache:
    """
    Chat caching manager.
    """

    # Cache timeouts (seconds)
    ROOM_INFO_TTL = 300  # 5 minutes
    ROOM_STATS_TTL = 60  # 1 minute
    USER_INFO_TTL = 600  # 10 minutes
    TYPING_STATUS_TTL = 30  # 30 seconds
    MESSAGE_LIST_TTL = 120  # 2 minutes

    # Key prefixes
    PREFIX = "chat"

    @classmethod
    def _make_key(cls, *parts) -> str:
        """Generate cache key"""
        return f"{cls.PREFIX}:{':'.join(map(str, parts))}"

    # ==================== ROOM CACHE ====================

    @classmethod
    def get_room_info(cls, room_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Get cached room info"""
        key = cls._make_key("room_info", room_id, user_id)
        return cache.get(key)

    @classmethod
    def set_room_info(cls, room_id: str, user_id: str, data: Dict[str, Any]):
        """Cache room info"""
        key = cls._make_key("room_info", room_id, user_id)
        cache.set(key, data, cls.ROOM_INFO_TTL)

    @classmethod
    def invalidate_room(cls, room_id: str):
        """Invalidate all room cache"""
        pattern = cls._make_key("room_*", room_id, "*")
        cache.delete_pattern(pattern)

        # Also delete stats
        stats_key = cls._make_key("room_stats", room_id)
        cache.delete(stats_key)

    @classmethod
    def get_room_stats(cls, room_id: str) -> Optional[Dict[str, Any]]:
        """Get cached room statistics"""
        key = cls._make_key("room_stats", room_id)
        return cache.get(key)

    @classmethod
    def set_room_stats(cls, room_id: str, stats: Dict[str, Any]):
        """Cache room statistics"""
        key = cls._make_key("room_stats", room_id)
        cache.set(key, stats, cls.ROOM_STATS_TTL)

    # ==================== USER CACHE ====================

    @classmethod
    def get_user_rooms(cls, user_id: str) -> Optional[List[str]]:
        """Get user's room IDs"""
        key = cls._make_key("user_rooms", user_id)
        return cache.get(key)

    @classmethod
    def set_user_rooms(cls, user_id: str, room_ids: List[str]):
        """Cache user's room IDs"""
        key = cls._make_key("user_rooms", user_id)
        cache.set(key, room_ids, cls.USER_INFO_TTL)

    @classmethod
    def get_user_unread_total(cls, user_id: str) -> Optional[int]:
        """Get total unread count for user"""
        key = cls._make_key("user_unread_total", user_id)
        return cache.get(key)

    @classmethod
    def set_user_unread_total(cls, user_id: str, count: int):
        """Cache total unread count"""
        key = cls._make_key("user_unread_total", user_id)
        cache.set(key, count, cls.USER_INFO_TTL)

    @classmethod
    def invalidate_user(cls, user_id: str):
        """Invalidate all user cache"""
        patterns = [
            cls._make_key("user_*", user_id),
            cls._make_key("room_info", "*", user_id),
        ]
        for pattern in patterns:
            cache.delete_pattern(pattern)

    # ==================== TYPING CACHE ====================

    @classmethod
    def get_typing_users(cls, room_id: str) -> List[str]:
        """Get typing users in room"""
        key = cls._make_key("typing", room_id)
        return cache.get(key, [])

    @classmethod
    def add_typing_user(cls, room_id: str, user_id: str):
        """Add typing user"""
        key = cls._make_key("typing", room_id)
        users = cls.get_typing_users(room_id)

        if user_id not in users:
            users.append(user_id)
            cache.set(key, users, cls.TYPING_STATUS_TTL)

    @classmethod
    def remove_typing_user(cls, room_id: str, user_id: str):
        """Remove typing user"""
        key = cls._make_key("typing", room_id)
        users = cls.get_typing_users(room_id)

        if user_id in users:
            users.remove(user_id)
            if users:
                cache.set(key, users, cls.TYPING_STATUS_TTL)
            else:
                cache.delete(key)

    # ==================== MESSAGE CACHE ====================

    @classmethod
    def get_recent_messages(cls, room_id: str, page: int = 1) -> Optional[List[Dict]]:
        """Get cached recent messages"""
        key = cls._make_key("messages", room_id, page)
        return cache.get(key)

    @classmethod
    def set_recent_messages(cls, room_id: str, page: int, messages: List[Dict]):
        """Cache recent messages"""
        key = cls._make_key("messages", room_id, page)
        cache.set(key, messages, cls.MESSAGE_LIST_TTL)

    @classmethod
    def invalidate_messages(cls, room_id: str):
        """Invalidate message cache"""
        pattern = cls._make_key("messages", room_id, "*")
        cache.delete_pattern(pattern)

    # ==================== UTILITY METHODS ====================

    @classmethod
    def clear_all_chat_cache(cls):
        """Clear all chat cache (admin use)"""
        pattern = f"{cls.PREFIX}:*"
        deleted = cache.delete_pattern(pattern)
        logger.info(f"Cleared {deleted} chat cache keys")
        return deleted

    @classmethod
    def get_cache_stats(cls) -> Dict[str, Any]:
        """Get cache statistics"""
        try:
            # This depends on your cache backend
            if hasattr(cache, "_cache"):
                backend = cache._cache
                if hasattr(backend, "get_stats"):
                    return backend.get_stats()

            return {
                "backend": settings.CACHES["default"]["BACKEND"],
                "location": settings.CACHES["default"].get("LOCATION", "N/A"),
            }
        except Exception as e:
            logger.error(f"Error getting cache stats: {e}")
            return {"error": str(e)}
