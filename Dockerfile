# ---------- Base image ----------
FROM python:3.10-slim

# ---------- Env vars ----------
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=on \
    PIP_NO_CACHE_DIR=on

# ---------- Workdir ----------
WORKDIR /app

# ---------- OS deps (eng yengil variant) ----------
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      netcat-openbsd \
      gcc \
      libpq-dev \
 && rm -rf /var/lib/apt/lists/*

# ---------- Python deps (cache-friendly) ----------
COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

# ---------- Project source ----------
COPY . .

# ---------- Entrypoint ----------
COPY ./entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]