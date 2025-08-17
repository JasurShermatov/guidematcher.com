# ────────────────────────────────────────────────────────────────
#  Django settings – TravMatch / GuideMatcher
#  Mode-agnostic (prod & dev) konfiguratsiya
# ────────────────────────────────────────────────────────────────
import os
import sys
from pathlib import Path
from datetime import timedelta

import environ

from django.http import HttpResponse
from django.views.decorators.http import require_safe


@require_safe
def health_check(request):
    return HttpResponse("OK", status=200)


# ─── Bazaviy kataloglar ────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent
env = environ.Env(
    DEBUG=(bool, False),
    ALLOWED_HOSTS=(list, []),
)
environ.Env.read_env(BASE_DIR / ".env")  # .env ni o'qish

# ─── Asosiy parol va debug ─────────────────────────────────────
SECRET_KEY = env("DJANGO_SECRET_KEY")
DEBUG = env.bool("DEBUG")
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS")

# ─── Global lokallashuv ────────────────────────────────────────
LANGUAGE_CODE = "en-us"
TIME_ZONE = env("TIME_ZONE", default="UTC")
USE_I18N = True
USE_TZ = True

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
AUTH_USER_MODEL = "users.User"

# ╭──────────────────────────────────────────────────────────────╮
# | 1. Installed apps                                           |
# ╰──────────────────────────────────────────────────────────────╯
DJANGO_APPS = [
    "jazzmin",
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
    "django_celery_results",  # Celery natijalarini DB'da saqlash
    "channels",  # WebSocket fazasida yoqasiz
    "admin_tools_stats",
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
    "whitenoise.middleware.WhiteNoiseMiddleware",  # prod static
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

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
        "NAME": env("POSTGRES_DB", default="postgres"),
        "USER": env("POSTGRES_USER", default="postgres"),
        "PASSWORD": env("POSTGRES_PASSWORD", default="postgres"),
        "HOST": env("POSTGRES_HOST", default="db"),
        "PORT": env("POSTGRES_PORT", default="5432"),
    }
}

# ╭──────────────────────────────────────────────────────────────╮
# | 6. Static / media                                           |
# ╰──────────────────────────────────────────────────────────────╯
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# Static katalogini tekshirish
if not os.path.exists(BASE_DIR / "static"):
    os.makedirs(BASE_DIR / "static", exist_ok=True)

STATICFILES_DIRS = [BASE_DIR / "static"] if os.path.exists(BASE_DIR / "static") else []

STATICFILES_STORAGE = (
    "whitenoise.storage.CompressedManifestStaticFilesStorage"
    if not DEBUG
    else "django.contrib.staticfiles.storage.StaticFilesStorage"
)

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# ╭──────────────────────────────────────────────────────────────╮
# | 7. CORS                                                     |
# ╰──────────────────────────────────────────────────────────────╯
CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=[])
CORS_ALLOW_CREDENTIALS = True

# ╭──────────────────────────────────────────────────────────────╮
# | 8. Password validation                                      |
# ╰──────────────────────────────────────────────────────────────╯
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 8},
    },
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ╭──────────────────────────────────────────────────────────────╮
# | 9. DRF + JWT                                                |
# ╰──────────────────────────────────────────────────────────────╯
REST_FRAMEWORK = {
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication"
    ],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_FILTER_BACKENDS": ["django_filters.rest_framework.DjangoFilterBackend"],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.LimitOffsetPagination",
    "PAGE_SIZE": 20,
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
}

# ╭──────────────────────────────────────────────────────────────╮
# | 10. drf-spectacular (Swagger / Redoc)                       |
# ╰──────────────────────────────────────────────────────────────╯
SPECTACULAR_SETTINGS = {
    "TITLE": "GuideMatcher API",
    "DESCRIPTION": "TravMatch platform REST API",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

# ╭──────────────────────────────────────────────────────────────╮
# | 11. E-mail (Gmail SMTP)                                     |
# ╰──────────────────────────────────────────────────────────────╯
if DEBUG and env.bool("EMAIL_DEBUG_MODE", default=True):
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
else:
    EMAIL_BACKEND = env(
        "EMAIL_BACKEND", default="django.core.mail.backends.smtp.EmailBackend"
    )

EMAIL_HOST = env("EMAIL_HOST", default="smtp.gmail.com")
EMAIL_PORT = env.int("EMAIL_PORT", default=587)
EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=True)
EMAIL_USE_SSL = env.bool("EMAIL_USE_SSL", default=False)
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default=EMAIL_HOST_USER)
SERVER_EMAIL = DEFAULT_FROM_EMAIL

if "gmail" in EMAIL_HOST:
    EMAIL_USE_TLS = True
    EMAIL_USE_SSL = False
    EMAIL_PORT = 587

# ╭──────────────────────────────────────────────────────────────╮
# | 12. Redis cache                                             |
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
CELERY_BROKER_URL = env("CELERY_BROKER_URL", default="redis://redis:6379/0")
CELERY_RESULT_BACKEND = env("REDIS_URL", default="redis://redis:6379/1")
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = TIME_ZONE
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 30 * 60  # 30 daqiqa

CELERY_TASK_ALWAYS_EAGER = env.bool("CELERY_TASK_ALWAYS_EAGER", default=False)
CELERY_TASK_EAGER_PROPAGATES = True

# ╭──────────────────────────────────────────────────────────────╮
# | 15. Sentry (prod)                                           |
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

# ╭──────────────────────────────────────────────────────────────╮
# | 3. URL / WSGI / ASGI                                        |
# ╰──────────────────────────────────────────────────────────────╯
ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [env("CHANNEL_REDIS_URL", default="redis://redis:6379/2")],
        },
    },
}

FRONTEND_PASSWORD_RESET_URL = env.str(
    "FRONTEND_PASSWORD_RESET_URL",
    default="http://localhost:3003/reset-password",
)

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "[{asctime}] {levelname} {name}: {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
            "stream": sys.stdout,
        },
        "file": {
            "level": "INFO",
            "class": "logging.FileHandler",
            "filename": os.path.join(BASE_DIR, "logs", "project.log"),
            "formatter": "verbose",
        },
    },
    "loggers": {
        "django": {
            "handlers": ["console", "file"],
            "level": "INFO",
            "propagate": True,
        },
        "apps.chat": {
            "handlers": ["console", "file"],
            "level": "DEBUG",
            "propagate": False,
        },
    },
    "root": {
        "handlers": ["console", "file"],
        "level": "WARNING",
    },
}

ACCOUNTS_VERIFICATION_CODE_TTL_SECONDS = 300  # 5 minutes
ACCOUNTS_VERIFICATION_CODE_LENGTH = 6
DEFAULT_FROM_EMAIL = "feruzbekhamrayev2002@gmail.com"
