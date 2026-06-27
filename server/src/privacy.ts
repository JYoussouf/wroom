import { Hono } from "hono";
import type { Env, Variables } from "./db";

// Contact address shown on the policy. Change this if you set up a dedicated
// privacy/support inbox (e.g. privacy@yourdomain).
const CONTACT_EMAIL = "contact@joseppy.ca";
const LAST_UPDATED = "June 20, 2026";
const ISSUES_URL = "https://github.com/JYoussouf/wroom/issues";

export const legal = new Hono<{ Bindings: Env; Variables: Variables }>();

const page = (title: string, body: string) => `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} — wroom</title>
<style>
  :root { color-scheme: light dark; }
  body {
    margin: 0; padding: 0;
    background: #faf8f5; color: #1b1714;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    line-height: 1.6;
  }
  .wrap { max-width: 680px; margin: 0 auto; padding: 48px 22px 80px; }
  h1 { font-family: Georgia, "Times New Roman", serif; font-size: 32px; margin: 0 0 4px; }
  h2 { font-size: 18px; margin: 32px 0 8px; }
  .muted { color: #6b6359; font-size: 14px; margin-top: 0; }
  a { color: #b4532a; }
  .tag {
    display: inline-block; font-size: 12px; font-weight: 600; letter-spacing: .04em;
    color: #b4532a; text-transform: uppercase; margin-bottom: 12px;
  }
  ul { padding-left: 20px; }
  @media (prefers-color-scheme: dark) {
    body { background: #0c0a09; color: #e7e1da; }
    .muted { color: #9a9088; }
  }
</style>
</head><body><div class="wrap">${body}</div></body></html>`;

legal.get("/privacy", (c) =>
  c.html(
    page(
      "Privacy Policy",
      `
  <div class="tag">✦ Fiction studio</div>
  <h1>Privacy Policy</h1>
  <p class="muted">Last updated ${LAST_UPDATED}</p>

  <p>wroom is a tool for authoring fiction. You create a private room of invented
  characters and write make-believe posts inside it. This policy explains what
  data wroom collects, why, and your choices. We keep it minimal on purpose.</p>

  <h2>Information we collect</h2>
  <ul>
    <li><strong>Account information</strong> — your email address and a username,
      provided when you sign up. Your password is never stored in plain text; we
      keep only a salted cryptographic hash of it.</li>
    <li><strong>Content you create</strong> — the fictional characters, posts,
      profiles, and any images (avatars or banners) you add to your room. This is
      yours; it is stored so your room syncs across your devices.</li>
    <li><strong>Feedback you choose to send</strong> — if you use the in-app
      feedback option, the message you write is submitted to our public issue
      tracker on GitHub so we can act on it.</li>
  </ul>
  <p>wroom does not include third-party advertising or analytics SDKs, and we do
  not sell your data.</p>

  <h2>Photos</h2>
  <p>If you choose an image for a character avatar or banner, the app accesses your
  photo library only to let you pick that image. We use it solely as part of the
  content you created.</p>

  <h2>How we use your information</h2>
  <ul>
    <li>To create and secure your account and authenticate you.</li>
    <li>To store and sync your room across your devices.</li>
    <li>To respond to feedback or support requests you send us.</li>
  </ul>

  <h2>Where your data is stored</h2>
  <p>Account data and content are stored using Cloudflare (database and hosting).
  App delivery and optional push notifications are handled through Apple and
  Expo. Feedback you submit is stored on GitHub. These providers process data on
  our behalf to run the service.</p>

  <h2>Data retention and deletion</h2>
  <p>We keep your account and content until you ask us to delete them. To delete
  your account and all associated data, email
  <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a> from your account email
  and we will remove it.</p>

  <h2>Children</h2>
  <p>wroom is not directed to children under 13, and we do not knowingly collect
  personal information from them.</p>

  <h2>Changes</h2>
  <p>If this policy changes, we will update the date above and post the revised
  version at this URL.</p>

  <h2>Contact</h2>
  <p>Questions about privacy? Email
  <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>, or open an issue at
  <a href="${ISSUES_URL}">${ISSUES_URL}</a>.</p>
`
    )
  )
);

legal.get("/delete-account", (c) =>
  c.html(
    page(
      "Delete your account",
      `
  <div class="tag">✦ Fiction studio</div>
  <h1>Delete your wroom account</h1>
  <p class="muted">How to delete your account and data from wroom</p>

  <p>You can permanently delete your wroom account and all of its data at any
  time, directly inside the app. No request or waiting period is required.</p>

  <h2>Steps</h2>
  <ul>
    <li>Open the <strong>wroom</strong> app and sign in.</li>
    <li>Go to the <strong>Settings</strong> tab.</li>
    <li>Tap <strong>“Delete my account”</strong>.</li>
    <li>Confirm. Your account and all associated data are deleted immediately.</li>
  </ul>

  <h2>What is deleted</h2>
  <p>Deleting your account permanently removes <strong>all</strong> data
  associated with it, including:</p>
  <ul>
    <li>Your account (email address and username).</li>
    <li>Every character, world account, post, reply, follow, and relationship in
      your room.</li>
    <li>Any images (avatars or banners) you added.</li>
  </ul>
  <p>This action is immediate and cannot be undone. We do not retain a backup of
  your content after deletion. (Feedback you previously chose to send to our
  public GitHub issue tracker is separate from your account and is not removed
  automatically — contact us to have it deleted.)</p>

  <h2>No longer have the app?</h2>
  <p>If you can’t access the app, email
  <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a> from your account’s email
  address and we will delete your account and all associated data for you.</p>
`
    )
  )
);
