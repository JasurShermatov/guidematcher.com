# apps/accounts/tasks.py

from celery import shared_task
from django.core.mail import send_mail, send_mass_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta, datetime
from django.db.models import Count, Q, Avg
from django.core.cache import cache
import logging
import json

User = get_user_model()
logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def send_verification_email(self, email, code, code_type):
    """
    Send verification email with code
    """
    try:
        # Email subject based on code type
        subjects = {
            "registration": "TravMatch - Email Tasdiqlash",
            "password_reset": "TravMatch - Parolni Tiklash",
            "email_change": "TravMatch - Email O'zgartirish",
        }

        subject = subjects.get(code_type, "TravMatch - Tasdiqlash Kodi")

        # Prepare context for template
        context = {
            "code": code,
            "code_type": code_type,
            "expires_in": settings.ACCOUNTS_VERIFICATION_CODE_TTL_SECONDS
            // 60,  # in minutes
            "support_email": getattr(
                settings, "SUPPORT_EMAIL", "support@travmatch.com"
            ),
            "site_name": "TravMatch",
            "current_year": timezone.now().year,
        }

        # Render email templates
        try:
            html_message = render_to_string(
                f"emails/{code_type}_verification.html", context
            )
            text_message = render_to_string(
                f"emails/{code_type}_verification.txt", context
            )
        except:
            # Fallback to simple text message if templates don't exist
            if code_type == "registration":
                text_message = f"""
Assalomu alaykum!

TravMatch platformasiga xush kelibsiz! 

Ro'yxatdan o'tishni yakunlash uchun quyidagi tasdiqlash kodini kiriting:

{code}

Bu kod {context['expires_in']} daqiqa davomida amal qiladi.

Agar siz bu so'rovni yuborgan bo'lmasangiz, bu xabarni e'tiborsiz qoldiring.

Hurmat bilan,
TravMatch jamoasi
"""
            elif code_type == "password_reset":
                text_message = f"""
Assalomu alaykum!

Parolni tiklash so'rovi qabul qilindi.

Yangi parol o'rnatish uchun quyidagi tasdiqlash kodini kiriting:

{code}

Bu kod {context['expires_in']} daqiqa davomida amal qiladi.

Agar siz bu so'rovni yuborgan bo'lmasangiz, bu xabarni e'tiborsiz qoldiring.

Hurmat bilan,
TravMatch jamoasi
"""
            else:
                text_message = f"""
Assalomu alaykum!

Tasdiqlash kodi: {code}

Bu kod {context['expires_in']} daqiqa davomida amal qiladi.

Hurmat bilan,
TravMatch jamoasi
"""
            html_message = None

        # Send email
        send_mail(
            subject=subject,
            message=text_message,
            html_message=html_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )

        # Log successful send
        logger.info(f"Verification email sent successfully to {email} for {code_type}")

        # Update email statistics
        cache_key = f"emails_sent_{timezone.now().date()}"
        cache.set(cache_key, cache.get(cache_key, 0) + 1, timeout=86400)

        return True

    except Exception as exc:
        logger.error(f"Failed to send verification email to {email}: {str(exc)}")

        # Retry the task
        if self.request.retries < self.max_retries:
            logger.info(
                f"Retrying email send to {email} (attempt {self.request.retries + 1})"
            )
            raise self.retry(countdown=60, exc=exc)
        else:
            logger.error(f"Max retries reached for email to {email}")

            # Log failed email attempt
            from apps.notifications.models import EmailLog

            try:
                EmailLog.objects.create(
                    recipient_email=email,
                    subject=f"Verification Code - {code_type}",
                    status="failed",
                    error_message=str(exc),
                )
            except:
                # If EmailLog model doesn't exist, just log the error
                logger.error(f"Could not log failed email attempt for {email}")

            return False


@shared_task
def send_welcome_email(user_id):
    """
    Send welcome email to new users
    """
    try:
        user = User.objects.get(id=user_id)

        subject = "TravMatch platformasiga xush kelibsiz!"

        context = {
            "user": user,
            "login_url": getattr(settings, "FRONTEND_URL", "https://travmatch.com")
            + "/login",
            "support_email": getattr(
                settings, "SUPPORT_EMAIL", "support@travmatch.com"
            ),
            "current_year": timezone.now().year,
        }

        # Render email templates
        try:
            html_message = render_to_string("emails/welcome.html", context)
            text_message = render_to_string("emails/welcome.txt", context)
        except:
            # Fallback text message
            text_message = f"""
Hurmatli {user.first_name}!

TravMatch platformasiga ro'yxatdan o'tganingiz uchun rahmat!

{user.role} sifatida platformamizdan to'liq foydalanishingiz mumkin:

{"- Dunyoning turli burchaklarida professional gidlarni toping" if user.role == "Client" else "- O'z xizmatlaringizni taklif qiling va daromad oling"}
- Xavfsiz to'lov tizimi
- 24/7 qo'llab-quvvatlash
- Tajribali gidlar bilan aloqa

Profilingizni to'ldiring va sayohatlarni boshlang!

Hurmat bilan,
TravMatch jamoasi

Platformaga kirish: {context['login_url']}
"""
            html_message = None

        send_mail(
            subject=subject,
            message=text_message,
            html_message=html_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )

        logger.info(f"Welcome email sent to {user.email}")
        return True

    except User.DoesNotExist:
        logger.error(f"User with ID {user_id} not found for welcome email")
        return False
    except Exception as exc:
        logger.error(f"Failed to send welcome email: {str(exc)}")
        return False


@shared_task
def send_security_alert_email(alert_type, details):
    """
    Send security alert emails to administrators
    """
    try:
        # Get admin emails
        admin_emails = list(
            User.objects.filter(is_staff=True, is_active=True).values_list(
                "email", flat=True
            )
        )

        if not admin_emails:
            logger.warning("No admin emails found for security alert")
            return False

        # Prepare alert details
        alert_messages = {
            "excessive_verification_codes": "Excessive Verification Code Requests",
            "excessive_password_reset": "Excessive Password Reset Attempts",
            "suspicious_login_pattern": "Suspicious Login Pattern Detected",
            "rate_limit_exceeded": "Rate Limit Exceeded",
            "email_changed": "User Email Address Changed",
            "role_changed": "User Role Changed",
            "unusual_activity_detected": "Unusual User Activity Detected",
            "brute_force_attempt": "Brute Force Attack Detected",
        }

        subject = f"TravMatch Security Alert - {alert_messages.get(alert_type, 'Unknown Alert')}"

        # Format details
        details_text = ""
        for key, value in details.items():
            if isinstance(value, list):
                value = ", ".join(str(v) for v in value)
            details_text += f"{key.replace('_', ' ').title()}: {value}\n"

        message = f"""
SECURITY ALERT - TravMatch Platform

Alert Type: {alert_messages.get(alert_type, 'Unknown')}
Timestamp: {timezone.now().strftime('%Y-%m-%d %H:%M:%S UTC')}

Details:
{details_text}

Please investigate this activity and take appropriate action if necessary.

Best regards,
TravMatch Security System
"""

        # Send to all admins
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=admin_emails,
            fail_silently=False,
        )

        logger.info(
            f"Security alert '{alert_type}' sent to {len(admin_emails)} administrators"
        )
        return True

    except Exception as exc:
        logger.error(f"Failed to send security alert: {str(exc)}")
        return False


@shared_task
def cleanup_expired_codes():
    """
    Clean up expired verification codes
    """
    try:
        from .models import VerificationCode

        now = timezone.now()
        expired_codes = VerificationCode.objects.filter(
            Q(expires_at__lt=now) | Q(is_used=True)
        )

        count = expired_codes.count()
        expired_codes.delete()

        logger.info(f"Cleaned up {count} expired/used verification codes")

        # Update cleanup statistics
        cache_key = f"cleanup_codes_{now.date()}"
        cache.set(cache_key, cache.get(cache_key, 0) + count, timeout=86400)

        return count

    except Exception as exc:
        logger.error(f"Error cleaning up expired codes: {str(exc)}")
        return 0


@shared_task
def cleanup_old_sessions():
    """
    Clean up old inactive login sessions
    """
    try:
        from .models import LoginSession

        # Delete sessions older than 30 days
        cutoff_date = timezone.now() - timedelta(days=30)
        old_sessions = LoginSession.objects.filter(
            Q(is_active=False, logged_out_at__lt=cutoff_date)
            | Q(is_active=True, created_at__lt=cutoff_date)
        )

        count = old_sessions.count()
        old_sessions.delete()

        logger.info(f"Cleaned up {count} old login sessions")
        return count

    except Exception as exc:
        logger.error(f"Error cleaning up old sessions: {str(exc)}")
        return 0


@shared_task
def cleanup_old_reset_attempts():
    """
    Clean up old password reset attempts
    """
    try:
        from .models import PasswordResetAttempt

        # Delete attempts older than 7 days
        cutoff_date = timezone.now() - timedelta(days=7)
        old_attempts = PasswordResetAttempt.objects.filter(created_at__lt=cutoff_date)

        count = old_attempts.count()
        old_attempts.delete()

        logger.info(f"Cleaned up {count} old password reset attempts")
        return count

    except Exception as exc:
        logger.error(f"Error cleaning up old reset attempts: {str(exc)}")
        return 0


@shared_task
def send_daily_activity_report():
    """
    Send daily activity report to administrators
    """
    try:
        # Get statistics for the last 24 hours
        yesterday = timezone.now() - timedelta(days=1)
        today = timezone.now()

        # Registration statistics
        new_registrations = User.objects.filter(
            date_joined__gte=yesterday, date_joined__lt=today
        ).count()

        client_registrations = User.objects.filter(
            date_joined__gte=yesterday, date_joined__lt=today, role="Client"
        ).count()

        guide_registrations = User.objects.filter(
            date_joined__gte=yesterday, date_joined__lt=today, role="Guide"
        ).count()

        # Verification code statistics
        from .models import VerificationCode, PasswordResetAttempt, LoginSession

        verification_codes_sent = VerificationCode.objects.filter(
            created_at__gte=yesterday, created_at__lt=today
        ).count()

        # Password reset statistics
        password_resets = PasswordResetAttempt.objects.filter(
            created_at__gte=yesterday, created_at__lt=today
        ).count()

        successful_resets = PasswordResetAttempt.objects.filter(
            created_at__gte=yesterday, created_at__lt=today, success=True
        ).count()

        # Login statistics
        new_logins = LoginSession.objects.filter(
            created_at__gte=yesterday, created_at__lt=today
        ).count()

        unique_users_logged_in = (
            LoginSession.objects.filter(created_at__gte=yesterday, created_at__lt=today)
            .values("user")
            .distinct()
            .count()
        )

        # Prepare report
        report_date = yesterday.strftime("%Y-%m-%d")

        subject = f"TravMatch Daily Activity Report - {report_date}"

        message = f"""
TravMatch Platform Daily Activity Report
Date: {report_date}

USER REGISTRATIONS:
- Total new registrations: {new_registrations}
- New clients: {client_registrations}
- New guides: {guide_registrations}

AUTHENTICATION ACTIVITY:
- Verification codes sent: {verification_codes_sent}
- Password reset attempts: {password_resets}
- Successful password resets: {successful_resets}
- New login sessions: {new_logins}
- Unique users logged in: {unique_users_logged_in}

SYSTEM HEALTH:
- Active sessions: {LoginSession.objects.filter(is_active=True).count()}
- Pending verification codes: {VerificationCode.objects.filter(is_used=False, expires_at__gt=timezone.now()).count()}

Generated at: {timezone.now().strftime('%Y-%m-%d %H:%M:%S UTC')}

Best regards,
TravMatch System
"""

        # Get admin emails
        admin_emails = list(
            User.objects.filter(is_staff=True, is_active=True).values_list(
                "email", flat=True
            )
        )

        if admin_emails:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=admin_emails,
                fail_silently=False,
            )

            logger.info(
                f"Daily activity report sent to {len(admin_emails)} administrators"
            )
        else:
            logger.warning("No admin emails found for daily activity report")

        # Store report data in cache for dashboard
        report_data = {
            "date": report_date,
            "new_registrations": new_registrations,
            "client_registrations": client_registrations,
            "guide_registrations": guide_registrations,
            "verification_codes_sent": verification_codes_sent,
            "password_resets": password_resets,
            "successful_resets": successful_resets,
            "new_logins": new_logins,
            "unique_users_logged_in": unique_users_logged_in,
        }

        cache.set(
            f"daily_report_{report_date}", report_data, timeout=86400 * 7
        )  # Keep for 7 days

        return report_data

    except Exception as exc:
        logger.error(f"Error generating daily activity report: {str(exc)}")
        return None


@shared_task
def send_bulk_notification_email(user_ids, subject, message, email_type="notification"):
    """
    Send bulk notification emails to specified users
    """
    try:
        # Get users
        users = User.objects.filter(id__in=user_ids, is_active=True).values_list(
            "email", "first_name", flat=False
        )

        if not users:
            logger.warning("No valid users found for bulk email")
            return 0

        # Prepare mass email data
        messages = []
        for email, first_name in users:
            personalized_message = message.replace(
                "{{first_name}}", first_name or "Foydalanuvchi"
            )

            messages.append(
                (subject, personalized_message, settings.DEFAULT_FROM_EMAIL, [email])
            )

        # Send mass email
        send_mass_mail(messages, fail_silently=False)

        logger.info(f"Bulk email sent to {len(messages)} users")

        # Log email statistics
        try:
            from apps.notifications.models import EmailLog

            for email, first_name in users:
                EmailLog.objects.create(
                    recipient_email=email,
                    subject=subject,
                    status="sent",
                    template_name=f"bulk_{email_type}",
                )
        except:
            # If EmailLog model doesn't exist, just log the count
            logger.info(f"Bulk email sent to {len(messages)} users (logging skipped)")

        return len(messages)

    except Exception as exc:
        logger.error(f"Error sending bulk email: {str(exc)}")
        return 0


@shared_task
def generate_account_statistics():
    """
    Generate comprehensive account statistics
    """
    try:
        now = timezone.now()

        # Time periods
        today = now.date()
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)

        # User statistics
        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        verified_users = User.objects.filter(is_verified=True).count()

        clients = User.objects.filter(role="Client").count()
        guides = User.objects.filter(role="Guide").count()

        # Registration trends
        registrations_today = User.objects.filter(date_joined__date=today).count()
        registrations_week = User.objects.filter(date_joined__gte=week_ago).count()
        registrations_month = User.objects.filter(date_joined__gte=month_ago).count()

        # Authentication statistics
        from .models import VerificationCode, PasswordResetAttempt, LoginSession

        verification_codes_week = VerificationCode.objects.filter(
            created_at__gte=week_ago
        ).count()

        password_resets_week = PasswordResetAttempt.objects.filter(
            created_at__gte=week_ago
        ).count()

        active_sessions = LoginSession.objects.filter(is_active=True).count()

        # Login activity
        logins_today = LoginSession.objects.filter(created_at__date=today).count()

        unique_logins_today = (
            LoginSession.objects.filter(created_at__date=today)
            .values("user")
            .distinct()
            .count()
        )

        # Security metrics
        failed_logins_week = PasswordResetAttempt.objects.filter(
            created_at__gte=week_ago, success=False
        ).count()

        # Device statistics
        device_stats = (
            LoginSession.objects.filter(created_at__gte=week_ago)
            .values("device_type")
            .annotate(count=Count("device_type"))
            .order_by("-count")
        )

        # Browser statistics
        browser_stats = (
            LoginSession.objects.filter(created_at__gte=week_ago)
            .values("browser")
            .annotate(count=Count("browser"))
            .order_by("-count")
        )

        # Compile statistics
        statistics = {
            "timestamp": now.isoformat(),
            "users": {
                "total": total_users,
                "active": active_users,
                "verified": verified_users,
                "clients": clients,
                "guides": guides,
                "verification_rate": (
                    (verified_users / total_users * 100) if total_users > 0 else 0
                ),
            },
            "registrations": {
                "today": registrations_today,
                "week": registrations_week,
                "month": registrations_month,
                "daily_average": (
                    registrations_month / 30 if registrations_month > 0 else 0
                ),
            },
            "authentication": {
                "verification_codes_week": verification_codes_week,
                "password_resets_week": password_resets_week,
                "active_sessions": active_sessions,
                "logins_today": logins_today,
                "unique_logins_today": unique_logins_today,
            },
            "security": {
                "failed_logins_week": failed_logins_week,
                "success_rate": (
                    (
                        (password_resets_week - failed_logins_week)
                        / password_resets_week
                        * 100
                    )
                    if password_resets_week > 0
                    else 100
                ),
            },
            "devices": dict(device_stats),
            "browsers": dict(browser_stats),
        }

        # Store in cache
        cache.set("account_statistics", statistics, timeout=3600)  # 1 hour
        cache.set(
            f"account_statistics_{today}", statistics, timeout=86400 * 7
        )  # 7 days

        logger.info("Account statistics generated successfully")
        return statistics

    except Exception as exc:
        logger.error(f"Error generating account statistics: {str(exc)}")
        return None


@shared_task
def monitor_user_activity():
    """
    Monitor user activity patterns and detect anomalies
    """
    try:
        from .models import LoginSession
        from django.db.models import Count

        now = timezone.now()
        hour_ago = now - timedelta(hours=1)

        # Check for unusual login patterns
        unusual_activity = []

        # Users with multiple logins from different IPs in short time
        suspicious_users = (
            LoginSession.objects.filter(created_at__gte=hour_ago)
            .values("user")
            .annotate(
                ip_count=Count("ip_address", distinct=True), session_count=Count("id")
            )
            .filter(ip_count__gt=3)
        )  # More than 3 different IPs

        for user_data in suspicious_users:
            user_id = user_data["user"]
            try:
                user = User.objects.get(id=user_id)
                unusual_activity.append(
                    {
                        "type": "multiple_ips",
                        "user_email": user.email,
                        "ip_count": user_data["ip_count"],
                        "session_count": user_data["session_count"],
                    }
                )
            except User.DoesNotExist:
                continue

        # Check for rapid-fire login attempts
        rapid_logins = (
            LoginSession.objects.filter(created_at__gte=hour_ago)
            .values("ip_address")
            .annotate(session_count=Count("id"))
            .filter(session_count__gt=10)
        )  # More than 10 sessions per hour from same IP

        for ip_data in rapid_logins:
            unusual_activity.append(
                {
                    "type": "rapid_logins",
                    "ip_address": ip_data["ip_address"],
                    "session_count": ip_data["session_count"],
                }
            )

        # Send alerts if unusual activity detected
        if unusual_activity:
            send_security_alert_email.delay(
                alert_type="unusual_activity_detected",
                details={
                    "activities": unusual_activity,
                    "detection_time": now.isoformat(),
                    "time_window": "1 hour",
                },
            )

            logger.warning(
                f"Detected {len(unusual_activity)} unusual activity patterns"
            )

        return unusual_activity

    except Exception as exc:
        logger.error(f"Error monitoring user activity: {str(exc)}")
        return []


@shared_task
def backup_account_data():
    """
    Create backup of critical account data
    """
    try:
        from django.core import serializers
        import json
        from datetime import datetime

        # Create backup data
        backup_data = {
            "timestamp": timezone.now().isoformat(),
            "version": "1.0",
            "data": {},
        }

        # Backup verification codes (active only)
        from .models import VerificationCode

        active_codes = VerificationCode.objects.filter(
            is_used=False, expires_at__gt=timezone.now()
        )

        backup_data["data"]["verification_codes"] = json.loads(
            serializers.serialize("json", active_codes)
        )

        # Backup recent login sessions
        from .models import LoginSession

        recent_sessions = LoginSession.objects.filter(
            created_at__gte=timezone.now() - timedelta(days=7)
        )

        backup_data["data"]["login_sessions"] = json.loads(
            serializers.serialize("json", recent_sessions)
        )

        # Store backup in cache (in real app, this would go to S3 or similar)
        backup_key = f"account_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        cache.set(backup_key, backup_data, timeout=86400 * 30)  # 30 days

        logger.info(f"Account data backup created: {backup_key}")
        return backup_key

    except Exception as exc:
        logger.error(f"Error creating account data backup: {str(exc)}")
        return None


@shared_task
def send_account_verification_reminder():
    """
    Send reminder emails to unverified accounts
    """
    try:
        # Find unverified users older than 24 hours but younger than 7 days
        cutoff_start = timezone.now() - timedelta(days=7)
        cutoff_end = timezone.now() - timedelta(hours=24)

        unverified_users = User.objects.filter(
            is_verified=False,
            is_active=True,
            date_joined__gte=cutoff_start,
            date_joined__lte=cutoff_end,
        )

        reminder_count = 0

        for user in unverified_users:
            try:
                # Check if we've already sent a reminder
                cache_key = f"verification_reminder_{user.id}"
                if cache.get(cache_key):
                    continue  # Already sent reminder

                # Generate new verification code
                from .models import VerificationCode

                verification_code = VerificationCode.generate_code(
                    email=user.email, code_type="registration"
                )

                # Send reminder email
                send_verification_email.delay(
                    email=user.email,
                    code=verification_code.code,
                    code_type="registration",
                )

                # Mark reminder as sent
                cache.set(
                    cache_key, True, timeout=86400
                )  # Don't send again for 24 hours
                reminder_count += 1

            except Exception as e:
                logger.error(
                    f"Error sending verification reminder to {user.email}: {str(e)}"
                )
                continue

        logger.info(f"Sent verification reminders to {reminder_count} users")
        return reminder_count

    except Exception as exc:
        logger.error(f"Error sending verification reminders: {str(exc)}")
        return 0


@shared_task
def analyze_user_registration_patterns():
    """
    Analyze user registration patterns for insights
    """
    try:
        from django.db.models import Count, Avg
        from django.db.models.functions import TruncDate, TruncHour

        # Analyze last 30 days
        start_date = timezone.now() - timedelta(days=30)

        # Daily registration pattern
        daily_registrations = (
            User.objects.filter(date_joined__gte=start_date)
            .annotate(date=TruncDate("date_joined"))
            .values("date")
            .annotate(count=Count("id"))
            .order_by("date")
        )

        # Hourly pattern
        hourly_registrations = (
            User.objects.filter(date_joined__gte=start_date)
            .annotate(hour=TruncHour("date_joined"))
            .values("hour")
            .annotate(count=Count("id"))
            .order_by("hour")
        )

        # Role distribution
        role_distribution = (
            User.objects.filter(date_joined__gte=start_date)
            .values("role")
            .annotate(count=Count("id"))
        )

        # Country distribution
        country_distribution = (
            User.objects.filter(date_joined__gte=start_date)
            .exclude(country="")
            .values("country")
            .annotate(count=Count("id"))
            .order_by("-count")[:10]
        )

        # Verification rates
        total_registrations = User.objects.filter(date_joined__gte=start_date).count()
        verified_registrations = User.objects.filter(
            date_joined__gte=start_date, is_verified=True
        ).count()

        verification_rate = (
            (verified_registrations / total_registrations * 100)
            if total_registrations > 0
            else 0
        )

        # Compile analysis
        analysis = {
            "period": f"{start_date.date()} to {timezone.now().date()}",
            "total_registrations": total_registrations,
            "verification_rate": verification_rate,
            "daily_pattern": list(daily_registrations),
            "hourly_pattern": list(hourly_registrations),
            "role_distribution": list(role_distribution),
            "country_distribution": list(country_distribution),
            "peak_registration_day": (
                max(daily_registrations, key=lambda x: x["count"])
                if daily_registrations
                else None
            ),
            "average_daily_registrations": total_registrations / 30,
        }

        # Store analysis
        cache.set("registration_analysis", analysis, timeout=86400)  # 24 hours

        logger.info("User registration pattern analysis completed")
        return analysis

    except Exception as exc:
        logger.error(f"Error analyzing registration patterns: {str(exc)}")
        return None


@shared_task
def optimize_database_performance():
    """
    Optimize database performance by cleaning up and analyzing
    """
    try:
        from django.db import connection

        optimization_results = {}

        # Clean up expired data
        expired_codes_cleaned = cleanup_expired_codes.delay().get()
        old_sessions_cleaned = cleanup_old_sessions.delay().get()
        old_attempts_cleaned = cleanup_old_reset_attempts.delay().get()

        optimization_results["cleanup"] = {
            "expired_codes": expired_codes_cleaned,
            "old_sessions": old_sessions_cleaned,
            "old_attempts": old_attempts_cleaned,
        }

        # Database statistics (PostgreSQL specific)
        try:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT 
                        schemaname,
                        tablename,
                        attname,
                        n_distinct,
                        correlation
                    FROM pg_stats 
                    WHERE schemaname = 'public' 
                    AND tablename IN ('verification_codes', 'login_sessions', 'password_reset_attempts')
                    ORDER BY tablename, attname;
                """
                )

                stats = cursor.fetchall()
                optimization_results["database_stats"] = stats
        except Exception as db_error:
            logger.warning(f"Could not gather database statistics: {str(db_error)}")
            optimization_results["database_stats"] = "Not available"

        # Update optimization timestamp
        cache.set("last_optimization", timezone.now().isoformat(), timeout=86400 * 7)

        logger.info("Database optimization completed")
        return optimization_results

    except Exception as exc:
        logger.error(f"Error optimizing database: {str(exc)}")
        return None


@shared_task
def send_weekly_summary_report():
    """
    Send weekly summary report to administrators
    """
    try:
        # Calculate week period
        end_date = timezone.now()
        start_date = end_date - timedelta(days=7)

        # Gather weekly statistics
        from .models import VerificationCode, PasswordResetAttempt, LoginSession

        # User statistics
        new_users_week = User.objects.filter(
            date_joined__gte=start_date, date_joined__lt=end_date
        ).count()

        new_clients = User.objects.filter(
            date_joined__gte=start_date, date_joined__lt=end_date, role="Client"
        ).count()

        new_guides = User.objects.filter(
            date_joined__gte=start_date, date_joined__lt=end_date, role="Guide"
        ).count()

        # Authentication activity
        verification_codes_week = VerificationCode.objects.filter(
            created_at__gte=start_date, created_at__lt=end_date
        ).count()

        password_resets_week = PasswordResetAttempt.objects.filter(
            created_at__gte=start_date, created_at__lt=end_date
        ).count()

        login_sessions_week = LoginSession.objects.filter(
            created_at__gte=start_date, created_at__lt=end_date
        ).count()

        # Top countries by registrations
        top_countries = (
            User.objects.filter(date_joined__gte=start_date, date_joined__lt=end_date)
            .exclude(country="")
            .values("country")
            .annotate(count=Count("country"))
            .order_by("-count")[:5]
        )

        # Device statistics
        top_devices = (
            LoginSession.objects.filter(
                created_at__gte=start_date, created_at__lt=end_date
            )
            .values("device_type")
            .annotate(count=Count("device_type"))
            .order_by("-count")[:3]
        )

        # Prepare report
        week_start = start_date.strftime("%Y-%m-%d")
        week_end = end_date.strftime("%Y-%m-%d")

        subject = f"TravMatch Weekly Summary Report - {week_start} to {week_end}"

        countries_text = (
            "\n".join(
                [
                    f"  - {country['country']}: {country['count']} users"
                    for country in top_countries
                ]
            )
            if top_countries
            else "  - No data available"
        )

        devices_text = (
            "\n".join(
                [
                    f"  - {device['device_type']}: {device['count']} sessions"
                    for device in top_devices
                ]
            )
            if top_devices
            else "  - No data available"
        )

        message = f"""
TravMatch Platform Weekly Summary Report
Week: {week_start} to {week_end}

USER REGISTRATIONS:
- Total new users: {new_users_week}
- New clients: {new_clients}
- New guides: {new_guides}
- Daily average: {new_users_week / 7:.1f}

AUTHENTICATION ACTIVITY:
- Verification codes sent: {verification_codes_week}
- Password reset attempts: {password_resets_week}
- Login sessions: {login_sessions_week}

TOP COUNTRIES BY REGISTRATIONS:
{countries_text}

TOP DEVICE TYPES:
{devices_text}

CURRENT SYSTEM STATUS:
- Total users: {User.objects.count()}
- Active users: {User.objects.filter(is_active=True).count()}
- Verified users: {User.objects.filter(is_verified=True).count()}
- Active sessions: {LoginSession.objects.filter(is_active=True).count()}

Generated at: {timezone.now().strftime('%Y-%m-%d %H:%M:%S UTC')}

Best regards,
TravMatch System
"""

        # Get admin emails
        admin_emails = list(
            User.objects.filter(is_staff=True, is_active=True).values_list(
                "email", flat=True
            )
        )

        if admin_emails:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=admin_emails,
                fail_silently=False,
            )

            logger.info(
                f"Weekly summary report sent to {len(admin_emails)} administrators"
            )
        else:
            logger.warning("No admin emails found for weekly summary report")

        # Store weekly data
        weekly_data = {
            "week_start": week_start,
            "week_end": week_end,
            "new_users": new_users_week,
            "new_clients": new_clients,
            "new_guides": new_guides,
            "verification_codes": verification_codes_week,
            "password_resets": password_resets_week,
            "login_sessions": login_sessions_week,
            "top_countries": list(top_countries),
            "top_devices": list(top_devices),
        }

        cache.set(
            f"weekly_report_{week_start}", weekly_data, timeout=86400 * 30
        )  # Keep for 30 days

        return weekly_data

    except Exception as exc:
        logger.error(f"Error generating weekly summary report: {str(exc)}")
        return None


@shared_task
def check_system_health():
    """
    Perform comprehensive system health check
    """
    try:
        health_status = {
            "timestamp": timezone.now().isoformat(),
            "overall_status": "healthy",
            "checks": {},
            "warnings": [],
            "errors": [],
        }

        # Database connectivity check
        try:
            User.objects.count()
            health_status["checks"]["database"] = "ok"
        except Exception as e:
            health_status["checks"]["database"] = "error"
            health_status["errors"].append(f"Database error: {str(e)}")
            health_status["overall_status"] = "unhealthy"

        # Cache connectivity check
        try:
            cache.set("health_check", "ok", timeout=1)
            cache.get("health_check")
            health_status["checks"]["cache"] = "ok"
        except Exception as e:
            health_status["checks"]["cache"] = "error"
            health_status["errors"].append(f"Cache error: {str(e)}")
            health_status["overall_status"] = "degraded"

        # Email service check
        try:
            from django.core.mail import get_connection

            connection = get_connection()
            health_status["checks"]["email"] = "ok"
        except Exception as e:
            health_status["checks"]["email"] = "error"
            health_status["warnings"].append(f"Email service error: {str(e)}")

        # Check for excessive error rates
        from .models import VerificationCode, PasswordResetAttempt

        recent_codes = VerificationCode.objects.filter(
            created_at__gte=timezone.now() - timedelta(hours=1)
        ).count()

        if recent_codes > 100:  # More than 100 codes per hour
            health_status["warnings"].append(
                f"High verification code volume: {recent_codes}/hour"
            )

        recent_failed_resets = PasswordResetAttempt.objects.filter(
            created_at__gte=timezone.now() - timedelta(hours=1), success=False
        ).count()

        if recent_failed_resets > 50:  # More than 50 failed resets per hour
            health_status["warnings"].append(
                f"High password reset failure rate: {recent_failed_resets}/hour"
            )

        # Check disk space (if available)
        try:
            import shutil

            disk_usage = shutil.disk_usage("/")
            free_space_percent = (disk_usage.free / disk_usage.total) * 100

            if free_space_percent < 10:
                health_status["errors"].append(
                    f"Low disk space: {free_space_percent:.1f}% free"
                )
                health_status["overall_status"] = "unhealthy"
            elif free_space_percent < 20:
                health_status["warnings"].append(
                    f"Disk space low: {free_space_percent:.1f}% free"
                )
        except:
            health_status["checks"]["disk_space"] = "unavailable"

        # Set overall status based on errors/warnings
        if health_status["errors"] and health_status["overall_status"] != "unhealthy":
            health_status["overall_status"] = "degraded"

        # Store health status
        cache.set("system_health_status", health_status, timeout=300)  # 5 minutes

        # Send alert if unhealthy
        if health_status["overall_status"] == "unhealthy":
            send_security_alert_email.delay(
                alert_type="system_health_critical",
                details={
                    "status": health_status["overall_status"],
                    "errors": health_status["errors"],
                    "warnings": health_status["warnings"],
                },
            )

        logger.info(f"System health check completed: {health_status['overall_status']}")
        return health_status

    except Exception as exc:
        logger.error(f"Error during system health check: {str(exc)}")
        return {
            "timestamp": timezone.now().isoformat(),
            "overall_status": "error",
            "error": str(exc),
        }


@shared_task
def export_user_data(user_id, request_type="full"):
    """
    Export user data for GDPR compliance
    """
    try:
        user = User.objects.get(id=user_id)

        export_data = {
            "user_id": str(user.id),
            "export_timestamp": timezone.now().isoformat(),
            "request_type": request_type,
            "user_data": {
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": user.role,
                "country": user.country,
                "city": user.city,
                "phone": user.phone,
                "bio": user.bio,
                "date_joined": user.date_joined.isoformat(),
                "last_login": user.last_login.isoformat() if user.last_login else None,
                "is_verified": user.is_verified,
                "is_active": user.is_active,
            },
        }

        if request_type == "full":
            # Include related data
            from .models import VerificationCode, LoginSession

            # Verification codes
            verification_codes = VerificationCode.objects.filter(
                email=user.email
            ).values("code_type", "created_at", "is_used", "expires_at")

            export_data["verification_codes"] = list(verification_codes)

            # Login sessions
            login_sessions = LoginSession.objects.filter(user=user).values(
                "ip_address", "device_type", "browser", "os", "created_at", "is_active"
            )

            export_data["login_sessions"] = list(login_sessions)

        # Store export data (in production, this would be a secure file)
        export_key = f"user_export_{user_id}_{timezone.now().strftime('%Y%m%d_%H%M%S')}"
        cache.set(export_key, export_data, timeout=86400 * 7)  # 7 days

        # Send email with export link
        subject = "TravMatch - Your Data Export is Ready"
        message = f"""
Dear {user.first_name},

Your data export request has been processed successfully.

Export ID: {export_key}
Generated: {timezone.now().strftime('%Y-%m-%d %H:%M:%S UTC')}
Expires: {(timezone.now() + timedelta(days=7)).strftime('%Y-%m-%d %H:%M:%S UTC')}

Please contact our support team with the Export ID to download your data.

Best regards,
TravMatch Team
"""

        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )

        logger.info(f"User data export completed for {user.email}")
        return export_key

    except User.DoesNotExist:
        logger.error(f"User with ID {user_id} not found for data export")
        return None
    except Exception as exc:
        logger.error(f"Error exporting user data: {str(exc)}")
        return None


@shared_task
def anonymize_user_data(user_id, retention_days=30):
    """
    Anonymize user data after account deletion
    """
    try:
        # This task runs after a user requests account deletion
        # Wait for retention period before anonymizing

        from .models import VerificationCode, PasswordResetAttempt, LoginSession

        # Anonymize verification codes
        VerificationCode.objects.filter(
            email__icontains=f"user_{user_id}@deleted"
        ).update(email=f"anonymized_{user_id}@deleted.local")

        # Anonymize password reset attempts
        PasswordResetAttempt.objects.filter(
            email__icontains=f"user_{user_id}@deleted"
        ).update(email=f"anonymized_{user_id}@deleted.local")

        # Keep login sessions for security analysis but anonymize
        LoginSession.objects.filter(user_id=user_id).update(
            user_id=None  # Remove user reference but keep session data
        )

        logger.info(f"User data anonymized for user ID {user_id}")
        return True

    except Exception as exc:
        logger.error(f"Error anonymizing user data: {str(exc)}")
        return False


# Periodic task registration (called from apps.py)
def register_periodic_tasks():
    """
    Register all periodic tasks with Celery Beat
    """
    from celery.schedules import crontab

    periodic_tasks = {
        # Cleanup tasks
        "cleanup-expired-codes": {
            "task": "apps.accounts.tasks.cleanup_expired_codes",
            "schedule": crontab(minute=0),  # Every hour
        },
        "cleanup-old-sessions": {
            "task": "apps.accounts.tasks.cleanup_old_sessions",
            "schedule": crontab(hour=2, minute=0),  # Daily at 2 AM
        },
        "cleanup-old-reset-attempts": {
            "task": "apps.accounts.tasks.cleanup_old_reset_attempts",
            "schedule": crontab(hour=3, minute=0),  # Daily at 3 AM
        },
        # Monitoring and reports
        "daily-activity-report": {
            "task": "apps.accounts.tasks.send_daily_activity_report",
            "schedule": crontab(hour=8, minute=0),  # Daily at 8 AM
        },
        "weekly-summary-report": {
            "task": "apps.accounts.tasks.send_weekly_summary_report",
            "schedule": crontab(hour=9, minute=0, day_of_week=1),  # Monday at 9 AM
        },
        "generate-statistics": {
            "task": "apps.accounts.tasks.generate_account_statistics",
            "schedule": crontab(minute="*/30"),  # Every 30 minutes
        },
        # Security monitoring
        "monitor-user-activity": {
            "task": "apps.accounts.tasks.monitor_user_activity",
            "schedule": crontab(minute="*/15"),  # Every 15 minutes
        },
        "system-health-check": {
            "task": "apps.accounts.tasks.check_system_health",
            "schedule": crontab(minute="*/5"),  # Every 5 minutes
        },
        # Maintenance
        "database-optimization": {
            "task": "apps.accounts.tasks.optimize_database_performance",
            "schedule": crontab(hour=4, minute=0),  # Daily at 4 AM
        },
        "backup-account-data": {
            "task": "apps.accounts.tasks.backup_account_data",
            "schedule": crontab(hour=1, minute=0),  # Daily at 1 AM
        },
        # User engagement
        "verification-reminders": {
            "task": "apps.accounts.tasks.send_account_verification_reminder",
            "schedule": crontab(hour=10, minute=0),  # Daily at 10 AM
        },
        "registration-analysis": {
            "task": "apps.accounts.tasks.analyze_user_registration_patterns",
            "schedule": crontab(hour=6, minute=0, day_of_week=0),  # Sunday at 6 AM
        },
    }

    return periodic_tasks
