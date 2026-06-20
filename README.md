# Writer's Room (`wroom`)

A fiction studio disguised as a social network. You run a **room** of invented
characters, step fully into one at a time, and live inside that character's
social world — their followers, the people they follow, their timeline, their
voice. **One author, many identities.**

This is unambiguously a tool for **fiction**. Every character is invented and
every post is fictional craft.

## Stack

- **Expo (React Native)** native-first app — see `mobile/`.
- **`@wroom/shared`** — a platform-agnostic TypeScript core (domain model,
  store, selectors, API client) in `shared/`, consumed by the app.
- **Cloudflare Worker + Hono + D1** backend in `server/` — bearer-token auth and
  per-author room sync.

> A Vite/React web app wrapped for iOS via Capacitor used to live here; it was
> removed in favor of native-first. It remains in git history (`git log -- src/`).

## Run the app

```bash
cd mobile
npm install
npm run ios     # expo start --ios (simulator)
```

Or from the repo root, `npm run ios` / `npm start` proxy into `mobile/`.

## Run the backend

```bash
cd server
npm install
npm run dev            # wrangler dev (local Worker + D1)
npm run migrate:local  # apply D1 migrations locally
```

## Project layout

```
shared/   platform-agnostic core: types, store (persistence + state + seed +
          selectors), lib/ helpers, api client, platform seam
mobile/   the native app: Expo SDK 56, expo-router file-based routing in src/app/
server/   Cloudflare Worker API (Hono + D1): auth, per-author room sync, feedback
```

## Fiction safeguards

A persistent “Fiction” tag rides on profiles and exports; shareable views carry
a clear *“Fictional content — created in Writer's Room”* watermark. The app never
mimics a real platform's name, logo, or verified-badge iconography.
