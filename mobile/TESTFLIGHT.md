# Shipping Writer's Room to TestFlight

Everything in the repo is configured for an iOS production build. What's left
are the steps that need *your* Expo and Apple credentials — they can't be done
from the codebase.

## Already configured (in `app.json` / `eas.json`)

- App name **Writer's Room**, slug `wroom`, version `1.0.0`.
- iOS bundle identifier **`io.wroom.app`**.
- Opaque 1024×1024 marketing icon (`wroom-icon-ios.png`) — no alpha channel, so
  it won't trip the "Invalid large app icon" rejection. (The `icon`/`adaptiveIcon`
  used elsewhere keep their transparency for Android/web.)
- `NSPhotoLibraryUsageDescription` — required because the app picks images for
  avatars/banners. Camera/microphone strings are deliberately **not** added.
- `ITSAppUsesNonExemptEncryption: false` — the app only uses standard HTTPS, so
  TestFlight won't ask the export-compliance question on every build.
- Production API URL baked in via `extra.apiBaseUrl`.
- **Push notifications** (`expo-notifications`) — the client side is wired
  (permission flow + Expo push-token fetch). Expo adds the `aps-environment`
  entitlement automatically at build time. Two things to know: the in-app push
  token only resolves once the EAS project is linked (`eas init`), and **remote
  delivery is a server follow-up** — the Worker doesn't send pushes on events
  yet, so push toggles work but won't deliver until that lands.
- `eas.json` has a `production` build profile (remote app version, auto-increment
  build number) and a `production` submit profile.

## One-time prerequisites (you)

1. **Apple Developer Program** membership ($99/yr) on the Apple ID you'll submit with.
2. **Expo account** — the EAS project isn't linked yet (no `extra.eas.projectId`).
3. **App Store Connect app record** for `io.wroom.app`. The public App Store
   *name* must be globally unique — "Writer's Room" may be taken, so have a
   fallback display name ready (the bundle id and in-app name can stay).
4. Decide on App Privacy answers: the app collects an **email + password**
   (account) and stores user-authored content; you'll fill the Data Collection
   questionnaire in App Store Connect.
5. **Push key (APNs)** — since the app ships with `expo-notifications`, the first
   `eas build` will offer to set up a Push Notifications key. Let EAS create and
   manage it (or attach an existing one via `eas credentials`). Not required to
   install on TestFlight, but needed before push can actually deliver.

## Build & submit

Run from `mobile/`:

```bash
# 1. Authenticate and link the EAS project (writes extra.eas.projectId)
npx eas-cli@latest login
npx eas-cli@latest init

# 2. Cloud build the production iOS app (creates/uses your distribution cert
#    + provisioning profile; let EAS manage credentials when prompted)
npx eas-cli@latest build --platform ios --profile production

# 3. Upload the finished build to App Store Connect / TestFlight
npx eas-cli@latest submit --platform ios --profile production --latest
```

`eas submit` will prompt for the Apple ID, team, and App Store Connect app the
first time; to make later runs non-interactive, fill `submit.production.ios`
in `eas.json` with `appleId`, `ascAppId`, and `appleTeamId` (or attach an App
Store Connect API key).

## After upload

- The build appears in **App Store Connect → TestFlight** after Apple finishes
  processing (a few minutes).
- **Internal testers** (up to 100, on your team) can install immediately — no
  review.
- **External testers** require a one-time **Beta App Review** and a filled-in
  "Test Information" section (feedback email, what to test).

## Re-validating config after changes

```bash
npx expo config --type public --json   # confirm ios.icon / infoPlist / version
npx expo export --platform ios --output-dir /tmp/x   # prove Metro bundles
```
