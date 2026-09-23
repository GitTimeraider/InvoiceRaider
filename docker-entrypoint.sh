#!/bin/sh
# Startup checks for the data directory and optional PUID/PGID handling.
#
# Two ways to pick the runtime UID:GID:
#   1. Docker's user option (recommended, works with --cap-drop=ALL):
#        --user 99:100   /   compose: user: "99:100"
#   2. PUID/PGID environment variables. This needs the container to start as
#      root (--user 0:0) with CAP_CHOWN, CAP_SETUID and CAP_SETGID, so it can
#      fix ownership of the data directory and then drop to PUID:PGID.
set -e

DB_PATH="${DATABASE_PATH:-/app/data/invio.db}"
DATA_DIR="$(dirname "$DB_PATH")"
uid="$(id -u)"
gid="$(id -g)"

log() { echo "[entrypoint] $*" >&2; }

if [ "$uid" = "0" ]; then
  if [ -n "$PUID" ] || [ -n "$PGID" ]; then
    PUID="${PUID:-1000}"
    PGID="${PGID:-1000}"
    mkdir -p "$DATA_DIR"
    if ! chown -R "$PUID:$PGID" "$DATA_DIR"; then
      log "ERROR: could not chown $DATA_DIR to $PUID:$PGID (missing CAP_CHOWN?)."
      log "Add: --cap-add=CHOWN --cap-add=SETUID --cap-add=SETGID"
      log "or use --user $PUID:$PGID instead of PUID/PGID and chown the data on the host."
      exit 1
    fi
    log "Running as $PUID:$PGID (from PUID/PGID)"
    if ! exec setpriv --reuid="$PUID" --regid="$PGID" --clear-groups "$@"; then
      log "ERROR: could not switch to $PUID:$PGID (missing CAP_SETUID/CAP_SETGID?)."
      exit 1
    fi
  fi
  log "WARNING: running as root. Set --user / compose user: (or PUID/PGID) to run unprivileged."
  exec "$@"
fi

if { [ -n "$PUID" ] && [ "$PUID" != "$uid" ]; } || { [ -n "$PGID" ] && [ "$PGID" != "$gid" ]; }; then
  log "WARNING: PUID=${PUID:-} PGID=${PGID:-} are set, but the container runs as $uid:$gid."
  log "PUID/PGID only apply when the container starts as root. Use --user ${PUID:-$uid}:${PGID:-$gid}"
  log "(compose: user: \"${PUID:-$uid}:${PGID:-$gid}\", Unraid: Extra Parameters) instead."
fi

if [ ! -w "$DATA_DIR" ] || { [ -e "$DB_PATH" ] && [ ! -w "$DB_PATH" ]; }; then
  log "ERROR: running as $uid:$gid, but $DATA_DIR is not writable by this user:"
  ls -lnd "$DATA_DIR" >&2 || true
  ls -ln "$DATA_DIR" >&2 2>/dev/null || true
  log "Fix it once on the Docker host, then restart the container:"
  log "  named volume: docker run --rm -v <volume>:/data debian:13-slim chown -R $uid:$gid /data"
  log "  bind mount:   sudo chown -R $uid:$gid /path/to/data"
  exit 1
fi

exec "$@"
