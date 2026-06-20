# Shipping wroom to Android (Google Play internal testing)

Android is the **same Expo app** as iOS — no separate codebase. What's left is a
Google Play account, a first manual upload, a service account for the submit API,
and then wiring CI. This doc is the resume guide + the ready-to-paste artifacts.

## Already configured (committed)

- `app.json` → `android.package = "io.wroom.app"` (matches the iOS bundle id).
- `app.json` → adaptive icon (foreground/background/monochrome) already set.
- `eas.json` → `submit.production.android = { "track": "internal" }`.

## Prerequisites (you)

1. **Google Play Developer account** — one-time $25. New *personal* accounts go
   through identity verification (can take days). _Status: account made, pending
   device/verification._
2. **A test Android device** — needed to verify the account and to install the
   internal build. (Not needed to *build* — EAS builds in the cloud.)

> Note on the production gate (not internal): new personal Play accounts must run
> a closed test with ~12–20 testers for 14 days before they can apply for
> production access. Internal testing is exempt — so the beta is unaffected, but
> start internal testing early because that 14-day clock blocks public launch.

## The order (Google differs from Apple)

Google blocks the submit **API** until an app has had its **first release created
by hand** in the Play Console. So the first AAB is uploaded manually; everything
after that (EAS submit + CI) is automated.

### 1. Build the AAB (in a real terminal — first run sets up the upload keystore)

```bash
npx eas-cli@latest build --platform android --profile production
```

When prompted to generate an **Android Keystore**, let EAS manage it (same as we
did for the iOS credentials).

### 2. Create the app in the Play Console

Play Console → **Create app** → name `wroom`, default language, **App** (not
game), **Free**. Accept the declarations.

### 3. Manually upload the first AAB to Internal testing

Play Console → your app → **Testing → Internal testing** → **Create new release**
→ upload the `.aab` from step 1 → add release notes (below) → **Save / Review /
Roll out to Internal testing**. (You may be asked to opt into Play App Signing —
accept; it's standard.)

### 4. Set up a service account for the submit API

So `eas submit` / CI can upload future builds without the console:

1. Play Console → **Setup → API access** → create/link a **Google Cloud project**.
2. Create a **service account** in Google Cloud, then in Play Console grant it
   access with at least **"Release to testing tracks"** + **"Manage testing
   track users"** permissions.
3. Download the service account **JSON key**.
4. Give it to EAS — either:
   - run `npx eas-cli@latest credentials` (Android → Google Service Account), or
   - save the JSON in the repo (gitignored!) and add
     `"serviceAccountKeyPath": "./path/to/key.json"` under
     `submit.production.android` in `eas.json`.

After this, `npx eas-cli@latest submit --platform android --profile production
--latest` works non-interactively.

### 5. Add testers

Internal testing track → **Testers** → add an email list (or share the opt-in
URL). Testers install via the Play Store after accepting the invite. No review
wait on the internal track.

### 6. Turn on CI (do this only after step 4)

Replace `mobile/.eas/workflows/deploy.yml` with the version below — it adds the
Android build/submit jobs and switches the OTA update to cover both platforms.
Validate with `npx eas-cli@latest workflow:validate .eas/workflows/deploy.yml`.

```yaml
name: Deploy to TestFlight & Play

on:
  push:
    branches: [main]

jobs:
  fingerprint:
    name: Fingerprint native layer
    type: fingerprint
    environment: production

  # ---- iOS ----
  get_ios_build:
    name: Look up existing iOS build
    needs: [fingerprint]
    type: get-build
    params:
      platform: ios
      profile: production
      fingerprint_hash: ${{ needs.fingerprint.outputs.ios_fingerprint_hash }}

  build_ios:
    name: Build iOS (native changed)
    needs: [get_ios_build]
    if: ${{ !needs.get_ios_build.outputs.build_id }}
    type: build
    params:
      platform: ios
      profile: production

  submit_ios:
    name: Submit to TestFlight
    needs: [build_ios]
    type: submit
    params:
      build_id: ${{ needs.build_ios.outputs.build_id }}
      profile: production

  # ---- Android ----
  get_android_build:
    name: Look up existing Android build
    needs: [fingerprint]
    type: get-build
    params:
      platform: android
      profile: production
      fingerprint_hash: ${{ needs.fingerprint.outputs.android_fingerprint_hash }}

  build_android:
    name: Build Android (native changed)
    needs: [get_android_build]
    if: ${{ !needs.get_android_build.outputs.build_id }}
    type: build
    params:
      platform: android
      profile: production

  submit_android:
    name: Submit to Play (internal)
    needs: [build_android]
    type: submit
    params:
      build_id: ${{ needs.build_android.outputs.build_id }}
      profile: production

  # ---- OTA: only when NEITHER platform needs a native build ----
  publish_update:
    name: Publish OTA update (JS only)
    needs: [get_ios_build, get_android_build]
    if: ${{ needs.get_ios_build.outputs.build_id && needs.get_android_build.outputs.build_id }}
    type: update
    params:
      platform: all
      branch: production
      message: ${{ github.event.head_commit.message }}
```

## Play Console copy (paste-ready)

**App name** (≤30 chars): `wroom`

**Short description** (≤80 chars):
> Invent a cast of characters and write fiction in their social world.

**Full description** (≤4000 chars):
> wroom is a fiction studio disguised as a social network.
>
> Invent a cast of characters, step into one at a time, and write inside their
> world — posts, replies, profiles, the whole social texture of a life that
> doesn't exist. It's a sandbox for writers, worldbuilders, and roleplayers who
> think in voices and want somewhere to let them talk.
>
> Run a private room of personas. Give each one a handle, a look, a way of
> speaking. Follow, reply, and build threads between them until the world feels
> real on the page.
>
> Everything in wroom is openly fiction. Profiles and exports carry a "Fiction"
> tag, shared views are watermarked, and wroom never imitates any real platform's
> name, logo, or badges. It's a place to make believe on purpose — not to deceive
> anyone.
>
> • A room of invented characters, all yours
> • Write as any character, one at a time
> • Replies, self-threads, and a believable feed
> • Private by default; share or export with clear fiction labels
> • Built for writers, worldbuilders, and roleplayers

**Internal testing release notes:**
> Early Android beta. Try creating a couple of characters, posting and replying
> as each, and building a thread. Tap "Explore the demo wroom" to see a populated
> room without signing up. Tell me what's confusing or broken — thanks for testing!

**Category:** Entertainment (Lifestyle works too). **Free.**
**Privacy policy URL:** https://wroom-api.joseppy-workers.workers.dev/privacy

## Play Data safety form (mirrors the iOS App Privacy answers)

Declare **collected, not shared**, each "for app functionality":
- **Personal info → Email address** (signup email)
- **Personal info → User IDs** (username/account id)
- **App activity / Other user-generated content** — characters, posts, and any
  avatar/banner images.

Everything else → not collected. No analytics/ads SDKs. Data is encrypted in
transit; users can request deletion in-app (Settings → Delete my account).
