#!/bin/bash
set -euo pipefail

echo "🔧 POSTGRES_HOST=${POSTGRES_HOST:-db} POSTGRES_PORT=${POSTGRES_PORT:-5432}"

# Agar DEBUG=True va black mavjud bo'lsa
if [ "${DEBUG:-False}" = "True" ] && command -v black >/dev/null 2>&1; then
    echo "🎨 Running black formatting..."
    black .
fi

POSTGRES_HOST=${POSTGRES_HOST:-db}
POSTGRES_PORT=${POSTGRES_PORT:-5432}

echo "⏳ Waiting for PostgreSQL at ${POSTGRES_HOST}:${POSTGRES_PORT}..."
while ! nc -z "$POSTGRES_HOST" "$POSTGRES_PORT"; do
    sleep 1
done
echo "✅ PostgreSQL is up!"

echo "🚀 Applying migrations..."
python manage.py migrate --noinput

echo "📦 Collecting static files..."
python manage.py collectstatic --noinput

# Superuser yaratish
echo "👤 Checking for superuser..."
if [ -n "${ADMIN_EMAIL}" ] && [ -n "${ADMIN_PASSWORD}" ]; then
    python manage.py shell -c "
from django.contrib.auth import get_user_model;
User = get_user_model();
if not User.objects.filter(email='${ADMIN_EMAIL}').exists():
    User.objects.create_superuser(email='${ADMIN_EMAIL}', password='${ADMIN_PASSWORD}')
    print('✅ Superuser created!')
else:
    print('ℹ️ Superuser already exists, skipping creation.')
"
else
    echo "⚠️ ADMIN_EMAIL or ADMIN_PASSWORD not set, skipping superuser creation."
fi

echo "🚦 Starting: $*"
exec "$@"