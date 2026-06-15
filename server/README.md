# Writer's Room — API (Cloudflare Worker + D1)

The backend for wroom: user accounts, posts, and the rest of a room, stored in
**Cloudflare D1** (serverless SQLite) behind a **Cloudflare Worker**. Runs on
Cloudflare's free tier — D1 (5 GB storage, 5M row reads/day, 100K writes/day)
and Workers (100K requests/day) — so there is **no charge before launch**.

This phase stands up the backend and secure email+password auth. The web/iOS
client is wired to it in a later phase; today the app still runs fully local.

## Layout

```
server/
  wrangler.toml        Worker + D1 binding + CORS origins
  migrations/          D1 schema (0001_init.sql)
  src/
    index.ts           entry: CORS, routing
    auth.ts            signup / login / logout / me  (PBKDF2 + sessions)
    middleware.ts      requireAuth — resolves session, scopes to author
    sync.ts            GET/POST /api/sync  (pull/push the WroomDB room)
    db.ts              env bindings + row <-> WroomDB mapping
    crypto.ts          PBKDF2 hashing + session-token signing (Web Crypto)
```

## One-time setup

```bash
cd server
npm install
npx wrangler login                       # opens browser; uses YOUR Cloudflare account

# Create the D1 database, then paste the returned database_id into wrangler.toml
npx wrangler d1 create wroom

# Local secret for `wrangler dev` (gitignored). Generate a strong value:
cp .dev.vars.example .dev.vars
#   then edit .dev.vars and set SESSION_SECRET, e.g.  openssl rand -base64 48

# Apply the schema
npx wrangler d1 migrations apply wroom --local     # local dev DB
npx wrangler d1 migrations apply wroom --remote     # production DB
```

## Run locally

```bash
npx wrangler dev          # serves the API at http://localhost:8787
```

## Deploy (free)

```bash
npx wrangler secret put SESSION_SECRET   # production secret (separate from .dev.vars)
npx wrangler deploy
```

Before launch, add your deployed web origin to `ALLOWED_ORIGINS` in `wrangler.toml`.

## Endpoints

| Method | Path              | Auth | Purpose                                   |
| ------ | ----------------- | ---- | ----------------------------------------- |
| POST   | `/api/auth/signup`| —    | Create account, start session             |
| POST   | `/api/auth/login` | —    | Sign in, start session                    |
| POST   | `/api/auth/logout`| —    | Revoke current session                    |
| GET    | `/api/auth/me`    | —    | Current author (401 if not signed in)     |
| GET    | `/api/sync`       | ✓    | Pull the author's room (WroomDB shape)    |
| POST   | `/api/sync`       | ✓    | Replace the author's room with the body   |

Sessions are an opaque token in an `HttpOnly; Secure; SameSite=Lax` cookie; only
an HMAC of the token is stored. Passwords are PBKDF2-SHA256 with a per-user salt;
plaintext is never stored or returned. All `/api/sync` queries are scoped to the
session's author, so accounts cannot read each other's data.

## Smoke test (local)

```bash
BASE=http://localhost:8787
# signup
curl -s -c jar -X POST $BASE/api/auth/signup \
  -H 'content-type: application/json' \
  -d '{"name":"Ada","email":"ada@example.com","password":"hunter2hunter"}'
# who am I
curl -s -b jar $BASE/api/auth/me
# push a room, then pull it back
curl -s -b jar -X POST $BASE/api/sync -H 'content-type: application/json' \
  -d '{"characters":[{"id":"c1","displayName":"Nyx","handle":"nyx"}],"posts":[]}'
curl -s -b jar $BASE/api/sync
```
