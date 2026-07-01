# wroom — fix-later pile

Deferred items as of 2026-06-27. None block the current no-ads App Store /
Play internal submissions (those use manually-attached build 5 / manual AAB).

## CI
- [ ] **Fix CI auto-submit auth (iOS).** `eas.json` `submit.production.ios` lists
  `appleId`, so CI tries Apple-ID auth (needs 2FA) → 401. Drop `appleId` (keep
  `ascAppId` + `appleTeamId`) so CI uses the ASC API key stored on EAS. Needs a
  build to verify.

## Ads (AdMob) — currently shipping the NO-ADS build first
- [ ] Put real AdMob **App IDs** into the `react-native-google-mobile-ads` plugin
  in `app.json` (currently Google sample IDs).
- [ ] Put real native **ad unit IDs** into `REAL_NATIVE_AD_UNIT` in
  `src/config/ads.ts` (currently test ads).
- [ ] Update **App Privacy** (Apple) + **Data safety** (Play): declare Advertising
  ID / Device ID, data shared with Google for ads, and tracking → triggers ATT.
- [ ] Update privacy policy page with an advertising/tracking paragraph.
- [ ] Set App Store **Content Rights** to "contains third-party content" (ads).

## Server
- [ ] **Deploy the Worker** (`npm run server:deploy`) so the updated privacy page
  (contact@joseppy.ca) and the new `/delete-account` page go live. Verify both URLs.

## Android / Play
- [ ] First **manual AAB upload** to Internal testing (unblocks the submit API).
- [ ] Create Play **service account**, grant "Release to testing tracks", download
  JSON (saved as `../play-service-account.json`, gitignored).
- [ ] Wire **Android CI jobs** into `.eas/workflows/deploy.yml` (ready-to-paste
  YAML in `ANDROID.md`).
- [ ] Replace padded tablet screenshots with real tablet captures before
  production (fine for internal testing as-is).

## Apple
- [ ] Optional: org conversion / D-U-N-S so the developer name shows "wroom"
  instead of the legal name (cosmetic; do before public launch if wanted).
