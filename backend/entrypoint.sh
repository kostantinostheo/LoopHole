#!/bin/sh
set -e

SECRETS_FILE="/app/data/secrets.env"
mkdir -p "$(dirname "$SECRETS_FILE")"

if [ ! -f "$SECRETS_FILE" ]; then
  echo "[entrypoint] No persisted secrets found — generating JWT_SECRET and VAULT_KEY."
  echo "[entrypoint] Stored at $SECRETS_FILE on the backend_data volume, never baked into the image."
  cat > "$SECRETS_FILE" <<EOF
JWT_SECRET=$(bun -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
VAULT_KEY=$(bun -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
EOF
  chmod 600 "$SECRETS_FILE"
fi

# Anything already in the environment (env_file, `-e`, compose `environment:`)
# wins; the persisted file only fills in whatever wasn't explicitly provided.
GENERATED_JWT_SECRET=$(grep '^JWT_SECRET=' "$SECRETS_FILE" | cut -d= -f2-)
GENERATED_VAULT_KEY=$(grep '^VAULT_KEY=' "$SECRETS_FILE" | cut -d= -f2-)
export JWT_SECRET="${JWT_SECRET:-$GENERATED_JWT_SECRET}"
export VAULT_KEY="${VAULT_KEY:-$GENERATED_VAULT_KEY}"

exec "$@"
