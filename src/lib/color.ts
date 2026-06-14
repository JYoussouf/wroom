/** Color helpers for the character-driven accent system. */

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "").trim();
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  const n = parseInt(h, 16);
  if (Number.isNaN(n) || h.length !== 6) return [180, 83, 42];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Relative luminance per WCAG, 0–1. */
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Pick black or white ink for legible text on the given accent. */
export function inkOn(hex: string): string {
  return luminance(hex) > 0.5 ? "#1b1714" : "#ffffff";
}

/** A pleasant default accent palette for new characters. */
export const ACCENT_PALETTE = [
  "#b4532a", // terracotta
  "#2f6f5e", // pine
  "#3a5a9c", // lapis
  "#8a4f9e", // plum
  "#a8324a", // garnet
  "#c08a2e", // ochre
  "#4a6b3a", // moss
  "#9c5a3a", // umber
  "#37718e", // teal-blue
  "#7b4f8a", // wine
];

export function randomAccent(): string {
  return ACCENT_PALETTE[Math.floor(Math.random() * ACCENT_PALETTE.length)];
}

/** Deterministic accent from a string seed (for world accounts / fallbacks). */
export function accentFromSeed(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return ACCENT_PALETTE[h % ACCENT_PALETTE.length];
}
