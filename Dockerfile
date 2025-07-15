# Python image
FROM python:3.10

# App papkasi
WORKDIR /app

# Python sozlamalari
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# System package-larni o‘rnatish
RUN apt-get update && apt-get install -y \
    netcat-openbsd \
    gcc \
    postgresql-client \
 && rm -rf /var/lib/apt/lists/*

# requirements.txt faylni copy qilish va install
COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

# Proyekt fayllarni ko‘chirish
COPY . .

# Entry point faylni ko‘chirish va ruxsat berish
COPY ./entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]