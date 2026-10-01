#!/bin/sh
# Starts the backend (Deno) and frontend (Bun) and restarts either one if it
# exits, like supervisord did, without keeping a ~24 MB Python process around.
#
# The backend is started with `deno run` directly instead of `deno task start`:
# `deno task` stays resident as a parent process (~17 MB of its own heap) for
# the whole lifetime of the container. Keep the permission flags in sync with
# the "start" task in backend/deno.json.
set -u

log() { echo "[start] $*" >&2; }

# supervise NAME DIR CMD... - run CMD in DIR, restart it whenever it exits and
# forward SIGTERM/SIGINT to it so `docker stop` shuts it down cleanly.
# Must be started with `&`, which runs it in its own subshell.
supervise() {
  name=$1
  dir=$2
  shift 2
  cd "$dir" || exit 1
  child=""
  trap 'trap - TERM INT; [ -n "$child" ] && kill -TERM "$child" 2>/dev/null; wait "$child" 2>/dev/null; exit 0' TERM INT
  while :; do
    "$@" &
    child=$!
    wait "$child"
    status=$?
    log "$name exited with status $status, restarting in 1s"
    sleep 1
  done
}

supervise backend /app/backend \
  deno run --allow-read --allow-write --allow-net --allow-env --allow-run src/app.ts &
backend=$!

# PORT/HOST are only for the frontend; the backend also reads PORT.
supervise frontend /app/frontend \
  env PORT=8000 HOST=0.0.0.0 BODY_SIZE_LIMIT=10M \
  bun --smol --no-install build/index.js &
frontend=$!

trap 'log "stopping"; kill -TERM "$backend" "$frontend" 2>/dev/null; wait; exit 0' TERM INT
wait
