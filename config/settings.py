# ────────────────────────────────────────────────────────────────
#  Django settings – TravMatch / GuideMatcher
#  Mode-agnostic (prod & dev) konfiguratsiya
# ────────────────────────────────────────────────────────────────
import os
from pathlib import Path
from datetime import timedelta

import environ

# ─── Bazaviy kataloglar ────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent
env = environ.Env(
    DEBUG=(bool, False),
    ALLOWED_HOSTS=(list, []),
)
environ.Env.read_env(BASE_DIR / ".env")          # .env ni o‘qish

# ─── Asosiy parol va debug ─────────────────────────────────────
SECRET_KEY       = env("DJANGO_SECRET_KEY")
DEBUG            = env.bool("DEBUG")
ALLOWED_HOSTS    = env.list("ALLOWED_HOSTS")

# ─── Global lokallashuv ────────────────────────────────────────
LANGUAGE_CODE    = "en-us"
TIME_ZONE        = env("TIME_ZONE", default="UTC")
USE_I18N         = True
USE_TZ           = True

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
AUTH_USER_MODEL    = "users.User"

# ╭──────────────────────────────────────────────────────────────╮
# | 1. Installed apps                                           |
# ╰──────────────────────────────────────────────────────────────╯
DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "django_filters",
    "corsheaders",
    "drf_spectacular",
    "django_celery_results",        # Celery natijalarini DB’da saqlash
    # "channels",                   # WebSocket fazasida yoqasiz
]

LOCAL_APPS = [
    "apps.common",
    "apps.users",
    "apps.profiles",
    "apps.bookings",
    "apps.chat",
    "apps.reviews",
    "apps.notifications",
    "apps.disputes",
    "apps.accounts",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# ╭──────────────────────────────────────────────────────────────╮
# | 2. Middleware                                               |
# ╰──────────────────────────────────────────────────────────────╯
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",          # prod static
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

# ╭──────────────────────────────────────────────────────────────╮
# | 3. URL / WSGI / ASGI                                        |
# ╰──────────────────────────────────────────────────────────────╯
ROOT_URLCONF   = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
# ASGI_APPLICATION = "config.asgi.application"     # Channels-ga o‘tganda

# ╭──────────────────────────────────────────────────────────────╮
# | 4. Templates                                                |
# ╰──────────────────────────────────────────────────────────────╯
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# ╭──────────────────────────────────────────────────────────────╮
# | 5. Database (PostgreSQL)                                    |
# ╰──────────────────────────────────────────────────────────────╯
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME":     env("POSTGRES_DB",       default="postgres"),
        "USER":     env("POSTGRES_USER",     default="postgres"),
        "PASSWORD": env("POSTGRES_PASSWORD", default="postgres"),
        "HOST":     env("POSTGRES_HOST",     default="db"),
        "PORT":     env("POSTGRES_PORT",     default="5432"),
    }
}

# ╭──────────────────────────────────────────────────────────────╮
# | 6. Static / media                                           |
# ╰──────────────────────────────────────────────────────────────╯
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [BASE_DIR / "static"]
STATICFILES_STORAGE = (
    "whitenoise.storage.CompressedManifestStaticFilesStorage"
    if not DEBUG
    else "django.contrib.staticfiles.storage.StaticFilesStorage"
)

MEDIA_URL  = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# ╭──────────────────────────────────────────────────────────────╮
# | 7. CORS                                                     |
# ╰──────────────────────────────────────────────────────────────╯
CORS_ALLOWED_ORIGINS  = env.list("CORS_ALLOWED_ORIGINS", default=[])
CORS_ALLOW_CREDENTIALS = True

# ╭──────────────────────────────────────────────────────────────╮
# | 8. Password validation                                      |
# ╰──────────────────────────────────────────────────────────────╯
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 8}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ╭──────────────────────────────────────────────────────────────╮
# | 9. DRF + JWT                                                |
# ╰──────────────────────────────────────────────────────────────╯
REST_FRAMEWORK = {
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_AUTHENTICATION_CLASSES": ["rest_framework_simplejwt.authentication.JWTAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_FILTER_BACKENDS": ["django_filters.rest_framework.DjangoFilterBackend"],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.LimitOffsetPagination",
    "PAGE_SIZE": 20,
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME":  timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS":  True,
    "BLACKLIST_AFTER_ROTATION": True,
}

# ╭──────────────────────────────────────────────────────────────╮
# | 10. drf-spectacular (Swagger / Redoc)                       |
# ╰──────────────────────────────────────────────────────────────╯
SPECTACULAR_SETTINGS = {
    "TITLE":       "GuideMatcher API",
    "DESCRIPTION": "TravMatch platform REST API",
    "VERSION":     "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

# ╭──────────────────────────────────────────────────────────────╮
# | 11. E-mail (SendGrid / SMTP)                                |
# ╰──────────────────────────────────────────────────────────────╯
EMAIL_BACKEND       = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST          = env("EMAIL_HOST", default="smtp.sendgrid.net")
EMAIL_PORT          = env.int("EMAIL_PORT", default=587)
EMAIL_USE_TLS       = True
EMAIL_HOST_USER     = env("EMAIL_HOST_USER")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD")
DEFAULT_FROM_EMAIL  = env("DEFAULT_FROM_EMAIL", default="noreply@guidematcher.com")

# ╭──────────────────────────────────────────────────────────────╮
# | 12. Redis cache (foydali, optional)                         |
# ╰──────────────────────────────────────────────────────────────╯
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": env("REDIS_URL", default="redis://redis:6379/1"),
    }
}

# ╭──────────────────────────────────────────────────────────────╮
# | 13. Celery konfiguratsiyasi                                 |
# ╰──────────────────────────────────────────────────────────────╯
CELERY_BROKER_URL        = env("CELERY_BROKER_URL", default="redis://redis:6379/0")
CELERY_RESULT_BACKEND    = "django-db"       # django-celery-results
CELERY_ACCEPT_CONTENT    = ["json"]
CELERY_TASK_SERIALIZER   = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE          = TIME_ZONE

# Misol uchun: xatlar ketishini fonda yuborish
# CELERY_BEAT_SCHEDULE = {
#     "clear-expired-verification-codes": {
#         "task": "apps.accounts.tasks.clear_expired_verifications",
#         "schedule": crontab(minute=0, hour="*/6"),
#     },
# }

# ╭──────────────────────────────────────────────────────────────╮
# | 14. Sentry (prod)                                           |
# ╰──────────────────────────────────────────────────────────────╯
SENTRY_DSN = env("SENTRY_DSN", default="")
if SENTRY_DSN and not DEBUG:
    import sentry_sdk
    from sentry_sdk.integrations.django import DjangoIntegration

    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[DjangoIntegration()],
        traces_sample_rate=0.2,
        send_default_pii=False,
    )