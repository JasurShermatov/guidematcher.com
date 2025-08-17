from datetime import timezone

from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
from .models import Notification, EmailLog
import logging

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def send_email_notification(self, notification_id):
    """
    Send email notification asynchronously
    """
    try:
        notification = Notification.objects.get(id=notification_id)
        if notification.email_sent:
            logger.info(f"Email already sent for notification {notification_id}")
            return

        subject = notification.title
        message = f"{notification.message}\n\nAction: {notification.action_url or 'No action link'}"
        from_email = settings.DEFAULT_FROM_EMAIL
        recipient_email = notification.user.email

        email_log = EmailLog.objects.create(
            recipient_email=recipient_email,
            recipient_user=notification.user,
            subject=subject,
            template_name=f"notifications/{notification.type}.html",
            notification=notification,
        )

        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=from_email,
                recipient_list=[recipient_email],
                fail_silently=False,
                html_message=message,  # Placeholder for HTML template rendering
            )
            notification.email_sent = True
            notification.email_sent_at = timezone.now()
            notification.save(update_fields=["email_sent", "email_sent_at"])
            email_log.status = "sent"
            email_log.sent_at = timezone.now()
            email_log.save(update_fields=["status", "sent_at"])
            logger.info(
                f"Email sent for notification {notification_id} to {recipient_email}"
            )
        except Exception as e:
            email_log.status = "failed"
            email_log.error_message = str(e)
            email_log.retry_count += 1
            email_log.save(update_fields=["status", "error_message", "retry_count"])
            logger.error(
                f"Error sending email for notification {notification_id}: {str(e)}"
            )
            raise self.retry(countdown=60 * 5)  # Retry after 5 minutes
    except Notification.DoesNotExist:
        logger.warning(f"Notification {notification_id} not found")
    except Exception as e:
        logger.error(
            f"Error processing email task for notification {notification_id}: {str(e)}"
        )
