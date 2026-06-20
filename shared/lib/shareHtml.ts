import type { Character, Post } from "../types";
import { relativeTime } from "./time";
import { monogram } from "./avatars";
import { inkOn } from "./color";
import { inlineMarkupToHtml } from "./markup";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * A self-contained, watermarked HTML rendering of a shareable character.
 * Clearly marked as fiction created in Writer's Room — never implying a real
 * or verified account.
 */
export function buildShareHtml(character: Character, posts: Post[]): string {
  const accent = character.accentColor;
  const ink = inkOn(accent);
  const avatar = character.avatar
    ? `<img class="av" src="${esc(character.avatar)}" alt="">`
    : `<div class="av mono" style="background:${accent};color:${ink}">${esc(
        monogram(character.displayName)
      )}</div>`;
  const banner = character.banner
    ? `background:url('${esc(character.banner)}') center/cover`
    : `background:linear-gradient(135deg, ${accent}, color-mix(in srgb, ${accent} 55%, #000))`;

  const flavor = [character.pronouns, character.occupation, character.location, character.eraTag]
    .filter(Boolean)
    .map((f) => `<span class="pill">${esc(f)}</span>`)
    .join("");

  const postsHtml = posts
    .map(
      (p) => `
      <article class="post">
        <div class="phead">
          <strong>${esc(character.displayName)}</strong>
          <span class="muted">@${esc(character.handle)} · ${esc(relativeTime(p.createdAt))}</span>
        </div>
        <p>${inlineMarkupToHtml(p.body)}</p>
      </article>`
    )
    .join("");

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(character.displayName)} — Fiction by Writer's Room</title>
<style>
  :root{--accent:${accent}}
  *{box-sizing:border-box}
  body{margin:0;background:#faf8f5;color:#1b1714;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;line-height:1.5}
  .wrap{max-width:600px;margin:0 auto;background:#fff;min-height:100vh;box-shadow:0 0 40px rgba(0,0,0,.06)}
  .banner{height:150px;${banner}}
  .body{padding:0 20px 40px}
  .av{width:84px;height:84px;border-radius:50%;margin-top:-42px;border:3px solid #fff;display:block;object-fit:cover}
  .av.mono{display:flex;align-items:center;justify-content:center;font-size:34px;font-weight:600;font-family:Georgia,serif}
  h1{font-family:Georgia,"Times New Roman",serif;margin:12px 0 0;font-size:28px}
  .handle{color:#948b7f}
  .fiction{display:inline-flex;gap:5px;align-items:center;font-size:.68rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:3px 8px;border-radius:999px;background:#f1ece5;color:#5d564e;border:1px solid #e7e0d6;margin-top:14px}
  .bio{font-family:Georgia,serif;font-size:18px;margin-top:12px}
  .pill{display:inline-block;font-size:.8rem;font-weight:600;padding:4px 10px;border-radius:999px;background:#f6f2ec;color:#5d564e;margin:4px 6px 0 0}
  .post{padding:18px 0;border-bottom:1px solid #e7e0d6}
  .post p{font-family:Georgia,serif;font-size:18px;margin:6px 0 0;white-space:pre-wrap}
  .phead{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}
  .muted{color:#948b7f;font-weight:400}
  .voice{font-family:Georgia,serif;font-style:italic;color:var(--accent);margin-top:12px}
  .watermark{position:sticky;bottom:0;background:rgba(27,23,20,.92);color:#faf8f5;text-align:center;padding:12px;font-size:.78rem;font-weight:600}
</style></head>
<body><div class="wrap">
  <div class="banner"></div>
  <div class="body">
    ${avatar}
    <h1>${esc(character.displayName)}</h1>
    <div class="handle">@${esc(character.handle)}</div>
    <div><span class="fiction">✦ Fictional character</span></div>
    ${character.bio ? `<p class="bio">${inlineMarkupToHtml(character.bio)}</p>` : ""}
    ${flavor ? `<div>${flavor}</div>` : ""}
    ${character.voiceNote ? `<p class="voice">“${esc(character.voiceNote)}”</p>` : ""}
    <h2 style="font-family:Georgia,serif;margin-top:28px">Posts</h2>
    ${postsHtml || '<p class="muted">No posts yet.</p>'}
  </div>
  <div class="watermark">✦ Fictional content — created in Writer's Room. Every character and post here is invented.</div>
</div></body></html>`;
}
