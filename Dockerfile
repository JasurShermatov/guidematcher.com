# ────────── Base image ──────────
FROM python:3.10-slim

# ────────── Env vars ────────────
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=on

# ────────── Workdir ─────────────
WORKDIR /app

# ────────── OS deps ─────────────
#  gcc, libpq-dev  → psycopg2-binary build fallback
#  libmagic1 + file→ python-magic (MIME) ga kerak
#  curl            → healthcheck’lar uchun
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      gcc \
      libpq-dev \
      netcat-openbsd \
      libmagic1 file \
      curl \
 && rm -rf /var/lib/apt/lists/*

# ────────── Python deps ─────────
COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

# ────────── Project source ──────
COPY . .

# ────────── Entrypoint ──────────
COPY ./entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]

# ────────── Default CMD (ASGI) ──
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "config.asgi:application"]