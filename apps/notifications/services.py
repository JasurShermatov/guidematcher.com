from django.utils import timezone
from django.urls import reverse
from apps.notifications.models import Notification, NotificationType, EmailLog
from django.conf import settings
from django.core.mail import send_mail


def send_in_app_notification(
    user,
    type_code: str,
    title: str,
    message: str,
    related_obj=None,
    extra: dict | None = None,
    action_url: str = "",
):
    """
    Tezkor in-app + email (agar foydalanuvchi ruxsat bergan bo‘lsa) jo‘natadi.
    """
    ntype = NotificationType.objects.get(code=type_code)

    notification = Notification.objects.create(
        user=user,
        notification_type=ntype,
        title=title,
        message=message,
        priority=Notification.Priority.MEDIUM,
        content_object=related_obj,
        action_url=action_url,
        extra_data=extra or {},
    )

    # Email
    settings_obj = getattr(user, "notification_settings", None)
    if settings_obj is None or not settings_obj.email_enabled:
        return notification

    subj = title
    body = f"{message}\n\n{action_url}" if action_url else message
    try:
        send_mail(
            subject=subj,
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        status = EmailLog.Status.SENT
    except Exception as exc:
        status = EmailLog.Status.FAILED
        body = str(exc)

    EmailLog.objects.create(
        user=user,
        notification_type=ntype,
        to_email=user.email,
        subject=subj,
        body_text=body,
        status=status,
        sent_at=timezone.now(),
        provider="SMTP",
    )
    return notification
