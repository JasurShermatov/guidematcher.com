#!/bin/bash

# Kodni avtomatik formatlash
black .

# PostgreSQL tayyor bo‘lguncha kutish
echo "Waiting for postgres..."
while ! nc -z db 5432; do
  sleep 1
done
echo "PostgreSQL started"

# Django migration va collectstatic
python manage.py migrate
python manage.py collectstatic --noinput

exec "$@"