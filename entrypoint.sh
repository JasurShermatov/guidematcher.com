#!/bin/bash
set -e

echo "🔧  POSTGRES_HOST=$POSTGRES_HOST  POSTGRES_PORT=$POSTGRES_PORT"


if [ "$DJANGO_DEBUG" = "True" ] && command -v black >/dev/null 2>&1; then
  echo "🎨  Running black …"
  black .
fi

: "${POSTGRES_HOST:=db}"
: "${POSTGRES_PORT:=5432}"

echo "⏳  Waiting for PostgreSQL at ${POSTGRES_HOST}:${POSTGRES_PORT} …"
while ! nc -z "$POSTGRES_HOST" "$POSTGRES_PORT"; do
  sleep 1
done
echo "✅  PostgreSQL is up!"

echo "🚀  Applying migrations …"
python manage.py migrate --noinput

echo "📦  Collecting static files …"
python manage.py collectstatic --noinput

echo "🚦  Starting: $*"
exec "$@"