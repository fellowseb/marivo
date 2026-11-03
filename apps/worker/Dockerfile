# syntax=docker/dockerfile:1
# Multi-stage Dockerfile for the worker.
#   dev        (default via compose): full source, root user, compose volume
#              mounts overlay the source for live reload
#   production: deps installed to a prefix and copied over, non-root user,
#              redis TCP healthcheck
FROM python:3.15.2-slim AS base
WORKDIR /app

FROM base AS deps
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

FROM base AS dev
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8081
ENTRYPOINT ["python3", "-u", "main.py"]

FROM base AS production
COPY --from=deps /install /usr/local
RUN useradd --create-home worker
COPY --chown=worker:worker . .
USER worker
# TCP healthcheck against redis (the worker's only runtime dependency)
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD python3 -c "import os, socket; from urllib.parse import urlparse; u = urlparse(os.environ.get('REDIS_URL', 'redis://redis:6379/0')); s = socket.create_connection((u.hostname or 'redis', u.port or 6379), timeout=3); s.close()"
EXPOSE 8081
ENTRYPOINT ["python3", "-u", "main.py"]
