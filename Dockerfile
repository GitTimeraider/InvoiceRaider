# ---------- Frontend build (Bun) ----------
FROM oven/bun:1 AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package.json frontend/bun.lock ./
RUN bun install --frozen-lockfile

COPY frontend .
COPY NAME /app/NAME

RUN cp /app/NAME static/NAME 2>/dev/null || true
RUN bun run build


# ---------- Base runtime (Debian + deps + Deno + Bun + Supervisor) ----------
FROM debian:13-slim

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl fontconfig python3 weasyprint \
    fonts-dejavu fonts-liberation fonts-noto \
    libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz0b libharfbuzz-subset0 \
    libcairo2 libglib2.0-0 libexpat1 \
    supervisor \
  && rm -rf /var/lib/apt/lists/*

# Install Deno
COPY --from=denoland/deno:bin-2.6.8 /deno /usr/local/bin/deno

# Install Bun
COPY --from=oven/bun:1 /usr/local/bin/bun /usr/local/bin/bun

# ---------- App setup ----------
WORKDIR /app

# Backend
COPY backend ./backend

# Frontend build output
COPY --from=frontend-builder /app/frontend/build ./frontend/build
# Frontend runtime manifest for production dependency install
COPY frontend/package.json frontend/bun.lock ./frontend/
RUN cd /app/frontend && bun install --frozen-lockfile --production

# Shared files
COPY NAME ./NAME

# Pre-fetch backend dependencies at build time so the container never needs
# to download or write into its module cache at runtime.
ENV DENO_DIR=/app/.deno
RUN cd /app/backend && deno cache src/app.ts

# Unprivileged runtime user. Running as non-root means the app works with
# `--cap-drop=ALL` (root without CAP_DAC_OVERRIDE cannot open files it does not
# own, which is what breaks a root container under cap-drop).
ARG APP_UID=1000
ARG APP_GID=1000
RUN groupadd --gid ${APP_GID} invoiceraider \
  && useradd --uid ${APP_UID} --gid ${APP_GID} --create-home --shell /usr/sbin/nologin invoiceraider \
  && mkdir -p /app/data \
  && chown -R ${APP_UID}:${APP_GID} /app/data /app/.deno
ENV HOME=/home/invoiceraider
VOLUME ["/app/data"]


# ---------- Config ----------
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

EXPOSE 8000

USER ${APP_UID}:${APP_GID}

CMD ["/usr/bin/supervisord", "-n", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
