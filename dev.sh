#!/usr/bin/env bash
# Run backend (backend/, bun --watch on :4000) and frontend (frontend/, vite) together in dev mode.
# Ctrl+C stops both.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACK="$ROOT/backend"
FRONT="$ROOT/frontend"

command -v bun >/dev/null 2>&1 || { echo "bun is required (https://bun.sh)"; exit 1; }

for dir in "$BACK" "$FRONT"; do
  if [ ! -d "$dir/node_modules" ]; then
    echo "[dev] Installing dependencies in $(basename "$dir")..."
    (cd "$dir" && bun install)
  fi
done

pids=()
cleanup() {
  trap - INT TERM EXIT
  echo
  echo "[dev] Stopping..."
  for pid in "${pids[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
}
trap cleanup INT TERM EXIT

# Prefix each line of output so the two streams are distinguishable.
prefix() { sed -u "s/^/[$1] /"; }

(cd "$BACK" && exec bun run dev) > >(prefix back) 2>&1 &
pids+=($!)

(cd "$FRONT" && exec bun run dev) > >(prefix front) 2>&1 &
pids+=($!)

echo "[dev] Backend:  http://localhost:4000"
echo "[dev] Frontend: http://localhost:5173 (see vite output for the exact URL)"

# Exit as soon as either process dies; the trap then stops the other one.
wait -n
