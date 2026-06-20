/* Inline text formatting for post bodies and bios — a tiny, forgiving subset
   of Markdown shared by every surface (web, native, and the HTML export).

   Supported: **bold**, *italic*, ~~strike~~, `code`. Marks nest. Plain text
   (every pre-existing post and bio) passes straight through, so this is fully
   backward compatible. This module is pure — no DOM, no React, no platform
   APIs — so each surface can render the same spans its own way.

   NOTE: this is the web app's copy. The platform-agnostic core keeps the
   canonical version at `shared/lib/markup.ts`, mirroring the `shareHtml.ts`
   convention. Keep the two in sync. */

export interface MarkSpan {
  text: string;
  bold?: boolean;
  italic?: boolean;
  strike?: boolean;
  code?: boolean;
}

type Mark = "bold" | "italic" | "strike" | "code";

interface Rule {
  marks: Mark[];
  re: RegExp;
  /** Whether the delimited content may itself contain more markup. */
  recurse: boolean;
}

/* Ordered by precedence: code is literal (nothing nests inside it); the
   triple-star `***…***` (bold+italic, the result of bolding then italicizing
   the same selection) must beat `**`, which must beat `*`. Each pattern
   requires a non-space character just inside its delimiters so stray
   punctuation in prose ("5 * 3", "a ~ b") isn't mistaken for formatting. */
const RULES: Rule[] = [
  { marks: ["code"], re: /`([^`\n]+?)`/, recurse: false },
  { marks: ["bold", "italic"], re: /\*\*\*(\S(?:[^]*?\S)?)\*\*\*/, recurse: true },
  { marks: ["bold"], re: /\*\*(\S(?:[^]*?\S)?)\*\*/, recurse: true },
  { marks: ["strike"], re: /~~(\S(?:[^]*?\S)?)~~/, recurse: true },
  { marks: ["italic"], re: /\*(\S(?:[^]*?\S)?)\*/, recurse: true },
];

function span(text: string, active: ReadonlySet<Mark>): MarkSpan {
  const s: MarkSpan = { text };
  if (active.has("bold")) s.bold = true;
  if (active.has("italic")) s.italic = true;
  if (active.has("strike")) s.strike = true;
  if (active.has("code")) s.code = true;
  return s;
}

function walk(text: string, active: Set<Mark>, out: MarkSpan[]): void {
  let best: { rule: Rule; m: RegExpExecArray } | null = null;
  for (const rule of RULES) {
    // Don't re-open marks that are already fully active on this text.
    if (rule.marks.every((mk) => active.has(mk))) continue;
    const m = rule.re.exec(text);
    if (m && (best === null || m.index < best.m.index)) best = { rule, m };
  }

  if (!best) {
    if (text) out.push(span(text, active));
    return;
  }

  const { rule, m } = best;
  if (m.index > 0) out.push(span(text.slice(0, m.index), active));

  const next = new Set(active);
  rule.marks.forEach((mk) => next.add(mk));
  if (rule.recurse) walk(m[1], next, out);
  else out.push(span(m[1], next));

  const rest = text.slice(m.index + m[0].length);
  if (rest) walk(rest, active, out);
}

/** Parse inline markup into a flat list of styled spans. Pure and total. */
export function parseInlineMarkup(text: string): MarkSpan[] {
  const out: MarkSpan[] = [];
  walk(text, new Set(), out);
  return out;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Render inline markup to escaped, safe HTML (used by the shareable export). */
export function inlineMarkupToHtml(text: string): string {
  return parseInlineMarkup(text)
    .map((s) => {
      let html = escapeHtml(s.text);
      if (s.code) html = `<code>${html}</code>`;
      if (s.strike) html = `<s>${html}</s>`;
      if (s.italic) html = `<em>${html}</em>`;
      if (s.bold) html = `<strong>${html}</strong>`;
      return html;
    })
    .join("");
}
