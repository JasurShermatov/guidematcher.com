# apps/disputes/tasks.py
from celery import shared_task
from apps.disputes.models import DisputeAction


@shared_task
def log_dispute_action(
    dispute_id, user_id, action_type, description, old_value=None, new_value=None
):
    DisputeAction.objects.create(
        dispute_id=dispute_id,
        performed_by_id=user_id,
        action_type=action_type,
        description=description,
        old_value=old_value or "",
        new_value=new_value or "",
    )
