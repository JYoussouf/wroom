# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Writer's Room (`wroom`) is a fiction studio disguised as a social network: one author runs a *room* of invented characters, steps into one at a time, and writes inside that character's social world. **Everything is explicitly fiction** — there are deliberate safeguards (a persistent "Fiction" tag on profiles/exports, a watermark on shareable views, and no mimicry of any real platform's name/logo/verified-badge). Preserve these when touching profile, share, or export code.

## Repository layout — four parts

This is **not** a single app. It is one product with shared logic across surfaces:

- **`src/`** — the original **web app**: Vite + React 18 + TypeScript, mobile-first SPA. Wrapped as a native iOS app via **Capacitor** (`ios/`, `capacitor.config.ts`). This is the historical "web-first" build.
- **`shared/`** — the **platform-agnostic core** (in-progress extraction): `types`, pure `lib/` helpers, `store/` (persistence + React state + seed + selectors), `lib/api.ts`, `lib/shareHtml.ts`, and `platform.ts`. Imported by both web and native. Package name `@wroom/shared`.
- **`mobile/`** — the **native app**: Expo SDK 56 (React 19, RN 0.85), expo-router file-based routing in `src/app/`, native tab bar via `expo-router/unstable-native-tabs`. This is the going-forward native-first surface.
- **`server/`** — the **API**: Cloudflare Worker + Hono + D1 (SQLite). Auth (bearer-token sessions), per-author room sync. Also `POST /api/feedback` (unauthenticated) — the in-app pre-alpha feedback badge files GitHub issues through it; this requires the `GITHUB_TOKEN` and `GITHUB_REPO` Worker secrets, and returns 503 if they're unset.

### The shared-core architecture (most important thing to understand)

The web and native apps are meant to share ONE source of truth in `shared/`. The only things the core can't know on its own are injected at boot through a **platform seam** (`shared/platform.ts`): *where to persist bytes* (web `localStorage` / native `AsyncStorage`) and *the API origin*. Call `configurePlatform({ storage, apiBaseUrl })` exactly once before the store mounts (native does this in `mobile/src/config/platform.ts`).

Consequences to respect:
- The store hydrates **asynchronously** (`loadDB()` is async, gated on a `hydrated` flag) because native storage has no synchronous read. Don't reintroduce synchronous `localStorage` reads into shared code.
- The API client uses **bearer tokens** (not cookies) so it works on native, which can't receive cross-site cookies. `initApi()` must be awaited once at boot to load the persisted token.
- Keep shared code free of DOM/`window`/`import.meta.env`/`btoa` — anything platform-specific goes behind the seam.

### Data model

One `Author` owns a room of `Character`s plus lightweight `WorldAccount`s. Characters `Follow` each other/world accounts and publish `Post`s (replies via `parentPostId`, self-threads via `threadId`). The whole room is one `WroomDB` blob; `store/selectors.ts` derives timelines/feeds/threads from it. See `shared/types.ts`.

## Commands

Web app (repo root):
```bash
npm run dev          # Vite dev server
npm run build        # tsc -b && vite build
npm run typecheck    # tsc -b --noEmit
npm run ios          # build + cap sync + open Xcode (Capacitor wrapper)
```

Native app (`mobile/`):
```bash
npm run ios          # expo start --ios (simulator)
npm start            # expo start (then press i / a / w)
npm run typecheck    # tsc --noEmit -p tsconfig.json
npx expo export --platform ios --output-dir /tmp/x   # full Metro bundle check (no simulator needed)
```

Server (`server/`, also proxied from root as `server:*`):
```bash
npm run dev              # wrangler dev (local Worker + D1)
npm run deploy           # wrangler deploy
npm run migrate:local    # apply D1 migrations locally
npm run migrate:remote   # apply D1 migrations to the deployed DB
```

There is **no test suite**. Verification is: typecheck, plus for the native app a full `expo export` (proves Metro resolves the shared core end to end), plus running in a simulator.

## Native app gotchas

- **`mobile/AGENTS.md` is binding**: Expo SDK 56 is newer than most training data. Read the versioned docs at `https://docs.expo.dev/versions/v56.0.0/` before writing router/navigation/theming code rather than relying on memory.
- **`@wroom/shared` resolves via a `file:../shared` dependency** in `mobile/package.json`. Do **not** hand-create a bare symlink in `node_modules` — `npm`/`expo install` prune it *destructively* and will delete through it into the real `shared/` source. If imports of `@wroom/shared` break after an install, re-run `npm install` in `mobile/`. Metro is pointed at the workspace via `watchFolders` in `mobile/metro.config.js`.
- Theme tokens live in `mobile/src/theme/theme.ts`, ported from the web app's CSS custom properties in `src/index.css`. Keep the two palettes in sync.
- Icons: `@expo/vector-icons` (Feather) for in-content icons; SF Symbols / Material symbols for the native tab bar.

## Web app conventions

- Styling is plain CSS via custom properties in `src/index.css` / `src/screens.css` — **no CSS framework** despite Tailwind being installed. Accent color is per-character and set through the `--accent` custom property contextually when you "step into" a character.
- Navigation is a hand-rolled stack (`src/nav.tsx`) with a `Route` discriminated union, not a router library.
