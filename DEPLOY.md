# Deploying LoopHole with Docker

Two services, orchestrated by [docker-compose.yml](docker-compose.yml):

- **backend** (`backend/`) — Bun + Express + SQLite, listens on `4000` inside the compose network. Data (SQLite DB + per-user vault files) lives on the named volume `backend_data`, mounted at `/app/data`.
- **frontend** (`frontend/`) — built with Vite, served by nginx on `80` inside the container, published on host port `8080`. Nginx proxies `/api/*` to `http://backend:4000` (see [frontend/nginx.conf](frontend/nginx.conf)), so the browser only ever talks to one origin and CORS isn't a concern in production.

## Prerequisites

- Docker Engine with Docker Compose v2 (`docker compose version`)
- Host port `8080` free

## 1. Build from scratch

1. Clone the repo and `cd` into it (this directory, next to `docker-compose.yml`).

2. Nothing to configure — `JWT_SECRET` and `VAULT_KEY` are no longer supplied by hand. [backend/entrypoint.sh](backend/entrypoint.sh) generates both (`bun -e "crypto.randomBytes(32)..."`, 32 random bytes each) the first time the backend container boots, and persists them to `/app/data/secrets.env` — on the `backend_data` volume, never inside the image, so they don't show up in `docker history` and survive every later restart/redeploy. See [the "no automated way?" discussion below](#why-secrets-are-generated-at-startup-not-build) for why this happens at container *startup* rather than at `docker build`.

   You only need `backend/.env` if you want to **override** the generated values (e.g. a fixed `JWT_SECRET` shared across multiple backend replicas, or a non-default `PORT`):

   ```
   PORT=4000
   JWT_SECRET=<random secret>
   VAULT_KEY=<64-char hex string>
   ```

   Anything set there wins over the auto-generated value; anything left out is filled in automatically. This file is optional — `docker-compose.yml` uses `env_file: ... required: false`, so its absence is not an error.

   `frontend/.env` (`VITE_API_BASE_URL`) is unrelated — it's only used for local `bun run dev`. For the Docker build, `docker-compose.yml` passes `VITE_API_BASE_URL=""` as a build arg so the frontend calls the API same-origin through nginx — no `.env` needed for the frontend image.

3. Build both images:

   ```
   docker compose build
   ```

4. Start the stack:

   ```
   docker compose up -d
   ```

5. Verify:

   ```
   docker compose ps
   docker compose logs -f backend frontend
   ```

   Open `http://<host>:8080` and register a user to confirm everything works end to end.

## 2. Redeploying after a version change

1. Pull the new code:

   ```
   git pull
   ```

   (or `git checkout <tag/commit>` to deploy a specific version)

2. Rebuild the images:

   ```
   docker compose build
   ```

   Add `--no-cache` if a `Dockerfile` itself changed in a way Docker's layer cache won't pick up correctly.

3. Recreate the containers with the new images:

   ```
   docker compose up -d
   ```

   This only replaces the containers — the `backend_data` volume (SQLite DB + vault files) is untouched, so existing subscriptions/users survive the redeploy.

4. Confirm the new version is healthy:

   ```
   docker compose logs -f backend frontend
   ```

   Backend schema changes (new columns, etc.) are applied automatically on startup — [backend/src/database/connection.js](backend/src/database/connection.js) runs idempotent `ALTER TABLE ... ADD COLUMN` checks each time the process boots, so no manual migration step is needed for column-level changes shipped there.

### Rolling back

```
git checkout <previous tag/commit>
docker compose build
docker compose up -d
```

## Useful commands

| Command | Effect |
|---|---|
| `docker compose ps` | Show running services |
| `docker compose logs -f backend` | Tail one service's logs |
| `docker compose restart backend` | Restart a single service without rebuilding |
| `docker compose down` | Stop and remove containers, **keeps** the `backend_data` volume |
| `docker compose down -v` | ⚠️ Also deletes `backend_data` — wipes the database, vault, **and the generated `JWT_SECRET`/`VAULT_KEY`**. Every user is logged out and any stored vault credentials become unrecoverable. Only for a full reset. |
| `docker system prune` | Clean up dangling images left behind by repeated rebuilds |

## Cross-host deployment

If the frontend and backend ever run on different hosts/domains (not the default same-origin nginx setup above), build the frontend with the backend's public URL instead of an empty string:

```
docker compose build --build-arg VITE_API_BASE_URL=https://api.example.com frontend
```

You'd also need to add CORS handling on the backend for the frontend's origin, since they'd no longer be same-origin behind nginx.

## Why secrets are generated at startup, not build

`docker compose build` can run at any time, including on every redeploy — baking `JWT_SECRET`/`VAULT_KEY` in at build time (via `ARG`/`ENV`) would silently rotate them on every rebuild, which:

- invalidates every user's login token (`JWT_SECRET` changed), and
- makes every already-encrypted vault file permanently undecryptable (`VAULT_KEY` changed) — real data loss.

Build-time `ARG`/`ENV` values are also baked into the image layers and stay visible forever via `docker history`, the opposite of "removed from the build."

Instead, [entrypoint.sh](backend/entrypoint.sh) generates both secrets once, the first time the container ever starts, and writes them to `secrets.env` on the persistent `backend_data` volume — not the image. Every later start (including after a redeploy) finds the file already there and reuses it, so tokens stay valid and vault data stays decryptable. An explicit `JWT_SECRET`/`VAULT_KEY` in `backend/.env` still overrides the generated value if you ever need one (e.g. running multiple backend replicas that must share the same secret).
