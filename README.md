# LoopHole

LoopHole tracks your recurring subscriptions and reminds you on Telegram before they renew.

You add each subscription (Netflix, cloud storage, a gym, and so on) with its price, billing cycle and next renewal date. You choose when to be reminded, for example 3 days before at 9:00 in your own timezone. LoopHole sends the reminder to your Telegram, moves the renewal date forward on its own once it passes, and shows what you spend each month and over the next year.

It installs as a PWA, so it works like an app on a phone.

## Features

- **Subscription list**: price, monthly or yearly cycle, category, next renewal, an optional end date, and a running monthly total.
- **Reminders**: any number per subscription (1, 2, 3, 7 or 14 days before, at a time you choose). They're sent in your timezone, which is detected from your browser each time you log in.
- **Telegram delivery**: each user connects their own Telegram bot. Message the bot and it replies with the chat ID to paste into Settings.
- **Calendar**: month and week views of every upcoming renewal, colour-coded by category.
- **Statistics**: monthly and yearly spend, spend by category, the split between monthly and yearly billing, and a 12-month projection.
- **Settings**: change your email, password, display currency (USD, EUR, GBP) and timezone, and manage your Telegram connection.
- **Sandbox mode**: `/sandbox` lets anyone try the dashboard without an account. Nothing is saved, and a refresh resets it.
- **PWA**: installable, and the app itself loads offline. API data is never cached.

## How it's built

```
LoopHole/
├── frontend/            Frontend: React 19 + Vite, served by nginx in production
├── backend/             Backend: Bun + Express 5 + SQLite
├── docker-compose.yml   Runs both services together
├── dev.sh               Runs both in development mode
└── DEPLOY.md            Full deployment guide
```

```
browser ──► nginx (frontend container, :8080 on the host)
              ├── /         → the built React app
              └── /api/*    → backend container (:4000, not exposed to the host)
                                 ├── SQLite database   (users, subscriptions, reminders)
                                 ├── encrypted vault   (Telegram bot token and chat ID, per user)
                                 └── reminder jobs     (one timer per reminder, plus a nightly reschedule)
```

**Frontend** (`frontend/src`)

| Folder | Contents |
|---|---|
| `pages/` | Dashboard, Calendar, Statistics, Settings, Login/Register |
| `components/` | Shared UI: modals, form fields, subscription card and form, account menu |
| `context/AuthContext.jsx` | Logged-in user and the login, register and account actions |
| `hooks/useSubscriptions.js` | Loads and saves subscriptions (kept in memory only in sandbox mode) |
| `api/client.js` | `fetch` wrapper that attaches the login token |
| `utils/` | Date maths, money formatting, categories, statistics |

**Backend** (`backend/src`)

| Folder | Contents |
|---|---|
| `server.js` | Express app. Starts the reminder scheduler and each user's Telegram bot. |
| `routes/` | `/api/auth`, `/api/account`, `/api/subscriptions`, `/api/vault`, `/api/test-telegram` |
| `database/` | SQLite connection and table setup, plus user and subscription queries |
| `services/authService.js` | bcrypt password hashing (with a per-user secret) and JWT login tokens (valid 30 days) |
| `services/reminderScheduler.js` | Schedules reminders and moves past renewal dates forward |
| `services/telegramService.js` | Runs each user's bot and sends reminder messages |
| `services/vaultService.js` | Encrypts Telegram credentials with AES-256-GCM, one file per user, kept outside the database |

The backend uses Bun's built-in SQLite (`bun:sqlite`), so it **must run on Bun**. It won't run on Node.

## Running locally (development)

### Requirements

- [Bun](https://bun.sh) 1.x

### 1. Create the backend secrets

When the backend runs outside Docker, nothing generates its secrets for you. Create `backend/.env` (git ignores it):

```bash
cd backend
cat > .env <<EOF
PORT=4000
JWT_SECRET=$(bun -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
VAULT_KEY=$(bun -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
EOF
cd ..
```

| Variable | Required | Purpose |
|---|---|---|
| `JWT_SECRET` | yes | Signs login tokens. Without it, login and registration fail. |
| `VAULT_KEY` | for Telegram | 64 hex characters (32 bytes). Encrypts the Telegram credentials. Without it, the app works but Telegram is disabled. |
| `PORT` | no | Defaults to `4000`. |
| `DB_PATH` | no | Defaults to `subscriptions.db` in the folder you start the backend from. |
| `VAULT_DIR` | no | Defaults to `vault-data/` in the folder you start the backend from. |

> Changing `VAULT_KEY` later makes every saved Telegram setup unreadable. Changing `JWT_SECRET` logs everyone out.

The frontend needs no setup. `frontend/.env` sets `VITE_API_BASE_URL=` (empty), so the app calls `/api` on its own address and Vite forwards those calls to the backend.

### 2. Start everything

```bash
./dev.sh
```

This installs dependencies on the first run, then starts both servers with prefixed, interleaved output:

- Backend: http://localhost:4000 (restarts on file changes)
- Frontend: http://localhost:5173 (hot reload)

Ctrl+C stops both. Vite runs with `--host`, so you can open the app from a phone on the same network using the LAN address Vite prints.

To run them separately:

```bash
cd backend && bun install && bun run dev   # backend
cd frontend && bun install && bun run dev        # frontend
```

### Other frontend scripts

```bash
cd frontend
bun run lint      # oxlint
bun run build     # production build into dist/
bun run preview   # serve the production build locally
```

## Setting up Telegram reminders

1. In Telegram, talk to [@BotFather](https://t.me/BotFather), send `/newbot` and copy the **bot token**.
2. In LoopHole, go to **Settings → Integrations**, paste the token and save. The server starts that bot right away.
3. Open your new bot in Telegram, press **Start** and send it any message. It replies with your **chat ID**.
4. Paste the chat ID into Settings, save, then press **Send test Telegram message**.

Each user brings their own bot. Tokens are stored encrypted on the server and are never shared between users.

## Deploying (Docker)

Requirements: Docker with Compose v2, and port `8080` free on the host.

```bash
docker compose build
docker compose up -d
```

Open `http://<host>:8080` and register an account.

- **No configuration needed.** On first start, the backend generates `JWT_SECRET` and `VAULT_KEY` and stores them on the `backend_data` volume, so they survive rebuilds and redeploys. Use `backend/.env` only if you want to set them yourself.
- **All data** (the database, Telegram credentials and generated secrets) lives in the `backend_data` volume. `docker compose down` keeps it. **`docker compose down -v` deletes it permanently.**
- **Updating:** run `git pull && docker compose build && docker compose up -d`. Database changes apply automatically when the backend starts.

See **[DEPLOY.md](DEPLOY.md)** for the full guide: redeploying, rolling back, running the frontend and backend on different domains, and why the secrets are generated at startup instead of build time.

## How reminders work

- Only the **next** renewal date is stored. When it passes, the backend moves it forward by one cycle (stopping at the end date, if one is set). The calendar and the projection work out the other dates from it.
- When the server starts, and every night at 00:05 server time, the backend recalculates every subscription and schedules a timer for each reminder still due. Saving or deleting a subscription reschedules its reminders immediately.
- Each reminder records which renewal it was last sent for, so restarting the server never sends a reminder twice.
- Timers are held in memory. Anything due while the server is down is skipped, not sent late, and the dashboard marks it as "Missed".

## Troubleshooting

| Problem | Likely cause |
|---|---|
| Login or registration fails with a server error | `JWT_SECRET` isn't set (local development only) |
| Backend log says "VAULT_KEY not set"; Settings shows a vault error | `VAULT_KEY` is missing or not 64 hex characters |
| The bot doesn't reply with a chat ID | Wrong token, or the backend was down. Save the token again to restart the bot. |
| A reminder was never sent | No chat ID saved, the time had already passed when it was scheduled, or the server was down at that moment |
| Port 8080 or 4000 is already in use | Change the `ports:` mapping in `docker-compose.yml`, or `PORT` for development |
