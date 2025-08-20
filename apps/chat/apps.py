# apps/chat/apps.py
from django.apps import AppConfig
import logging

logger = logging.getLogger(__name__)


class ChatConfig(AppConfig):

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.chat"
    verbose_name = "Chat System"

    def ready(self):

        try:
            # Import signals to register them
            from . import signals

            logger.info("Chat signals registered successfully")

            # Import WebSocket consumers to register them
            from . import consumers

            logger.info("Chat WebSocket consumers loaded")

            # Setup periodic cleanup tasks (if using Celery)
            self._setup_periodic_tasks()

            # Initialize performance monitoring
            self._setup_performance_monitoring()

            # Validate existing data consistency (optional)
            if self._should_validate_on_startup():
                self._validate_data_consistency()

            logger.info("Chat app initialized successfully")

        except Exception as e:
            logger.error("Error initializing chat app: %s", e)
            # Don't raise exception to avoid breaking Django startup

    def _setup_periodic_tasks(self):

        try:
            # Only setup if Celery is available
            try:
                from celery import current_app
                from django.conf import settings

                if hasattr(settings, "CELERY_BROKER_URL"):
                    self._register_periodic_tasks()
                    logger.info("Chat periodic tasks registered")
            except ImportError:
                logger.debug("Celery not available, skipping periodic tasks")

        except Exception as e:
            logger.warning("Could not setup periodic tasks: %s", e)

    def _register_periodic_tasks(self):

        from celery.schedules import crontab
        from django.conf import settings

        # Add periodic tasks to CELERY_BEAT_SCHEDULE
        if not hasattr(settings, "CELERY_BEAT_SCHEDULE"):
            settings.CELERY_BEAT_SCHEDULE = {}

        settings.CELERY_BEAT_SCHEDULE.update(
            {
                "cleanup-old-typing-statuses": {
                    "task": "apps.chat.tasks.cleanup_old_typing_statuses",
                    "schedule": crontab(minute="*/5"),  # Every 5 minutes
                },
                "validate-chat-data-consistency": {
                    "task": "apps.chat.tasks.validate_chat_data_consistency",
                    "schedule": crontab(hour=2, minute=0),  # Daily at 2 AM
                },
                "cleanup-old-read-receipts": {
                    "task": "apps.chat.tasks.cleanup_old_read_receipts",
                    "schedule": crontab(hour=3, minute=0, day_of_week=0),  # Weekly
                },
            }
        )

    def _setup_performance_monitoring(self):

        try:
            from django.conf import settings

            # Setup logging for performance monitoring
            if not hasattr(settings, "LOGGING"):
                return

            # Add chat-specific logging configuration
            chat_logging = {
                "handlers": ["file", "console"],
                "level": getattr(settings, "CHAT_LOG_LEVEL", "INFO"),
                "propagate": False,
            }

            settings.LOGGING.setdefault("loggers", {})
            settings.LOGGING["loggers"]["apps.chat"] = chat_logging

            logger.debug("Chat performance monitoring configured")

        except Exception as e:
            logger.warning("Could not setup performance monitoring: %s", e)

    def _should_validate_on_startup(self):
        from django.conf import settings

        return getattr(settings, "CHAT_VALIDATE_ON_STARTUP", False)

    def _validate_data_consistency(self):

        try:
            from .signals import validate_room_data_consistency

            from threading import Thread

            def run_validation():
                try:
                    results = validate_room_data_consistency()
                    if results["inconsistencies_found"] > 0:
                        logger.warning(
                            "Found %d data inconsistencies in %d rooms",
                            results["inconsistencies_found"],
                            results["total_rooms_checked"],
                        )
                    else:
                        logger.info("Chat data consistency validation passed")
                except Exception as e:
                    logger.error("Error during data validation: %s", e)

            validation_thread = Thread(target=run_validation, daemon=True)
            validation_thread.start()

        except Exception as e:
            logger.warning("Could not start data validation: %s", e)


# apps/chat/tasks.py
"""
Optional Celery tasks for chat maintenance.
These tasks will only be loaded if Celery is available.
"""

try:
    from celery import shared_task
    from django.utils import timezone
    import logging

    logger = logging.getLogger(__name__)

    @shared_task
    def cleanup_old_typing_statuses():
        """
        Clean up old typing statuses that are stuck as 'typing=True'.
        """
        from .models import UserTypingStatus

        cutoff_time = timezone.now() - timezone.timedelta(minutes=5)
        updated_count = UserTypingStatus.objects.filter(
            is_typing=True, last_typed_at__lt=cutoff_time
        ).update(is_typing=False)

        logger.info("Cleaned up %d old typing statuses", updated_count)
        return updated_count

    @shared_task
    def validate_chat_data_consistency():
        """
        Validate and fix chat data consistency issues.
        """
        from .signals import validate_room_data_consistency, recalculate_room_statistics
        from .models import ChatRoom

        results = validate_room_data_consistency()

        # Fix inconsistencies automatically
        fixed_rooms = 0
        for inconsistency in results["details"]:
            if inconsistency["issue"] in [
                "message_count_mismatch",
                "last_message_time_mismatch",
            ]:
                recalculate_room_statistics(inconsistency["room_id"])
                fixed_rooms += 1

        logger.info(
            "Data validation complete: %d inconsistencies found, %d fixed",
            results["inconsistencies_found"],
            fixed_rooms,
        )

        return {
            "inconsistencies_found": results["inconsistencies_found"],
            "rooms_fixed": fixed_rooms,
        }

    @shared_task
    def cleanup_old_read_receipts():
        """
        Clean up very old read receipts to maintain database performance.
        Only removes read receipts older than 1 year.
        """
        from .models import MessageRead

        cutoff_date = timezone.now() - timezone.timedelta(days=365)
        deleted_count, _ = MessageRead.objects.filter(read_at__lt=cutoff_date).delete()

        logger.info("Cleaned up %d old read receipts", deleted_count)
        return deleted_count

    @shared_task
    def generate_chat_analytics():
        """
        Generate chat analytics and statistics.
        """
        from .models import ChatRoom, Message
        from django.db.models import Count, Avg
        from datetime import datetime, timedelta

        # Last 30 days statistics
        thirty_days_ago = timezone.now() - timedelta(days=30)

        stats = {
            "total_rooms": ChatRoom.objects.count(),
            "active_rooms_30d": ChatRoom.objects.filter(
                last_activity_at__gte=thirty_days_ago
            ).count(),
            "total_messages_30d": Message.objects.filter(
                created_at__gte=thirty_days_ago, is_deleted=False
            ).count(),
            "avg_messages_per_room": Message.objects.filter(
                created_at__gte=thirty_days_ago, is_deleted=False
            ).aggregate(avg=Avg("room__total_messages"))["avg"]
            or 0,
        }

        logger.info("Chat analytics generated: %s", stats)
        return stats

    @shared_task
    def optimize_chat_database():
        """
        Optimize chat database performance.
        """
        from django.db import connection

        with connection.cursor() as cursor:
            # Update database statistics
            cursor.execute("ANALYZE")

            # Clean up unused typing status records
            cursor.execute(
                """
                           DELETE
                           FROM chat_usertypingstatus
                           WHERE is_typing = false
                             AND last_typed_at < %s
                           """,
                [timezone.now() - timedelta(days=7)],
            )

            deleted_count = cursor.rowcount

        logger.info("Database optimization complete, cleaned %d records", deleted_count)
        return deleted_count

except ImportError:
    # Celery not available, skip task definitions
    logger.info("Celery not available, skipping task definitions")

    # Create dummy functions for apps that might import these
    def cleanup_old_typing_statuses():
        pass

    def validate_chat_data_consistency():
        pass

    def cleanup_old_read_receipts():
        pass


# ══════════════════════════════════════════════════════════════════════
# HEALTH CHECK UTILITIES
# ══════════════════════════════════════════════════════════════════════


def get_chat_system_health():
    """
    Get chat system health status.

    Returns:
        Dict with health status information
    """
    from .models import ChatRoom, Message, UserTypingStatus
    from django.db import connection
    from django.utils import timezone

    health_status = {
        "status": "healthy",
        "timestamp": timezone.now().isoformat(),
        "statistics": {},
        "issues": [],
    }

    try:
        # Basic statistics
        health_status["statistics"] = {
            "total_rooms": ChatRoom.objects.count(),
            "active_rooms": ChatRoom.objects.filter(is_active=True).count(),
            "total_messages": Message.objects.count(),
            "messages_last_24h": Message.objects.filter(
                created_at__gte=timezone.now() - timezone.timedelta(days=1)
            ).count(),
            "active_typing_users": UserTypingStatus.objects.filter(
                is_typing=True
            ).count(),
        }

        # Check database connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")

        # Check for potential issues
        old_typing_count = UserTypingStatus.objects.filter(
            is_typing=True,
            last_typed_at__lt=timezone.now() - timezone.timedelta(minutes=10),
        ).count()

        if old_typing_count > 0:
            health_status["issues"].append(
                {
                    "type": "stale_typing_statuses",
                    "count": old_typing_count,
                    "severity": "warning",
                }
            )

        # Check for rooms with inconsistent message counts
        inconsistent_rooms = 0
        for room in ChatRoom.objects.all()[:100]:  # Sample check
            actual_count = room.messages.filter(is_deleted=False).count()
            if abs(room.total_messages - actual_count) > 0:
                inconsistent_rooms += 1

        if inconsistent_rooms > 0:
            health_status["issues"].append(
                {
                    "type": "inconsistent_message_counts",
                    "count": inconsistent_rooms,
                    "severity": "warning",
                }
            )

        # Determine overall status
        if health_status["issues"]:
            health_status["status"] = (
                "degraded"
                if any(
                    issue["severity"] == "error" for issue in health_status["issues"]
                )
                else "warning"
            )

    except Exception as e:
        health_status["status"] = "error"
        health_status["issues"].append(
            {"type": "system_error", "message": str(e), "severity": "error"}
        )

    return health_status
