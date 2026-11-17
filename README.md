# echo · listening practice

A listening-practice app for a study group: 20 recordings, an answer sheet per
lesson, a word bank (235 words in 6 topics, English → Uzbek, with flashcards and
quizzes), XP, streaks and a group league.

The word bank comes from `src/data/words.json`. Replace that file to change the words.

- **Frontend:** Vue 3 + Tailwind v4 (`src/`)
- **Backend:** Go + PostgreSQL (`cmd/server/`)

## Accounts

Sign-up is deliberately simple: **name → username → 4-digit PIN**.
The device remembers the last account, so coming back only needs the PIN.

A 4-digit PIN can be guessed by brute force, so after 5 wrong tries an account
is locked for 30 s, doubling each time (up to 15 min). PINs are stored as bcrypt
hashes and session tokens as SHA-256 hashes. That's fine for a study group;
don't reuse the setup for anything sensitive.

## Run locally

```sh
# 1. database (once)
createdb echo_listening

# 2. API on :8080 (creates tables on start)
go run ./cmd/server

# 3. web app on :5173 (proxies /api to :8080)
pnpm install
pnpm dev
```

Server settings (environment variables):

| Variable       | Default                                                     |
| -------------- | ----------------------------------------------------------- |
| `DATABASE_URL` | `postgres://localhost:5432/echo_listening?sslmode=disable`  |
| `PORT`         | `8080`                                                      |
| `STATIC_DIR`   | `dist` if it exists. The server also serves the built app from it |

## Laravel Cloud

Deployed as a **Go** application with **Serverless Postgres** attached (Cloud
injects `DATABASE_URL` and `PORT`).

- Build command: `bash scripts/cloud-build.sh` (builds `dist/` and `./app`)
- Start command: `./app`

## Put it online with Docker

On any server with Docker:

```sh
DB_PASSWORD='something-long' docker compose up -d --build
```

The app is then on port 8080 (set `PORT` to change it): one container serves the API, the app and the
audio, with PostgreSQL next to it. Put it behind HTTPS (e.g. Caddy or a
Cloudflare tunnel) before sharing the link.

## API

| Method | Path                         | Auth | Purpose                               |
| ------ | ---------------------------- | ---- | ------------------------------------- |
| POST   | `/api/register`              |      | `{name, username, pin}` → token       |
| POST   | `/api/login`                 |      | `{username, pin}` → token             |
| GET    | `/api/username-available?u=` |      | live check while signing up           |
| POST   | `/api/logout`                | ✓    |                                       |
| GET    | `/api/me`                    | ✓    | current user                          |
| GET    | `/api/state`                 | ✓    | all lesson progress + XP per day      |
| PUT    | `/api/progress/{lesson-NN}`  | ✓    | save one lesson's state               |
| PUT    | `/api/progress/words`        | ✓    | save word-bank progress               |
| POST   | `/api/xp`                    | ✓    | `{day, amount}` add XP for a day      |
| GET    | `/api/leaderboard`           | ✓    | group ranking                         |

Send the token as `Authorization: Bearer <token>`.
