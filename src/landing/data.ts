// Data + geometry + easing math for the Wroom landing page.
// Reframed from a marketplace of artworks to one author's cast of characters:
// the seven scroll cards are invented personas, not products.

export interface LandingCharacter {
  name: string;
  handle: string;
  role: string;
  accent: string; // base accent (gradient top)
  accentDeep: string; // gradient bottom
}

/** The seven cards in the scroll choreography — one author's invented cast. */
export const CHARACTERS: LandingCharacter[] = [
  { name: "Vera Sloane", handle: "verasloane", role: "Night-shift detective", accent: "#c0392b", accentDeep: "#7a1f12" },
  { name: "Auguste Pell", handle: "augustepell", role: "Clockwork inventor", accent: "#4d7eff", accentDeep: "#22357a" },
  { name: "Mira Okonkwo", handle: "miraokonkwo", role: "Solarpunk botanist", accent: "#3dbf7a", accentDeep: "#1c6b43" },
  { name: "Cassius Vane", handle: "cassiusvane", role: "Exiled cartographer", accent: "#8a5cf6", accentDeep: "#43287d" },
  { name: "Lark Bellamy", handle: "larkbellamy", role: "Travelling musician", accent: "#e08a5f", accentDeep: "#8a3a1f" },
  { name: "Ondine Marsh", handle: "ondinemarsh", role: "Lighthouse keeper", accent: "#2bb3c0", accentDeep: "#155b63" },
  { name: "Rosa Calderón", handle: "rosacalderon", role: "Revolution poet", accent: "#d4a017", accentDeep: "#7a5c0a" },
];

export const CARD_SIZE = 220;
export const HERO_ROW_Y = 522;

/** Easing tokens (cubic-bezier control points). */
export const smoothEase: [number, number, number, number] = [0.22, 1, 0.36, 1];
export const hoverEase: [number, number, number, number] = [0.34, 1.56, 0.64, 1];

export interface Slot {
  x: number;
  y: number;
  rotate: number;
  scale: number;
  z: number;
}

/** Section 1 fan slots, relative to viewport center x and HERO_ROW_Y on y. */
export const FAN: Slot[] = [
  { x: -480, y: 18, rotate: -18, scale: 0.88, z: 1 },
  { x: -310, y: 6, rotate: -10, scale: 0.92, z: 2 },
  { x: -155, y: -2, rotate: -4, scale: 0.96, z: 3 },
  { x: 0, y: -8, rotate: 0, scale: 1, z: 4 },
  { x: 160, y: -2, rotate: 5, scale: 0.96, z: 3 },
  { x: 320, y: 6, rotate: 12, scale: 0.92, z: 2 },
  { x: 480, y: 18, rotate: 20, scale: 0.88, z: 1 },
];

export interface CascadeStep {
  top: number;
  left: number;
  rotate: number;
  z: number;
}

/** Section 2 diagonal ladder (upper-left to lower-right), relative to wrapper. */
export const CASCADE: CascadeStep[] = Array.from({ length: 7 }, (_, i) => ({
  top: 300 + i * 70,
  left: 20 + i * 150,
  rotate: -3 + i * 3,
  z: 7 - i,
}));

// ---- intro choreography timing (seconds) ----
export const introDelay = 0.8;
export const introDuration = 0.72;
export const travelToRightDuration = 0.6;
export const sweepLeftDuration = 1.6;
export const totalDuration = introDuration + travelToRightDuration + sweepLeftDuration;

// ---- cubic-bezier inversion (find the time at which an eased value is reached) ----

function bezierAxis(s: number, p1: number, p2: number): number {
  const mt = 1 - s;
  return 3 * mt * mt * s * p1 + 3 * mt * s * s * p2 + s * s * s;
}

/**
 * Given a normalized eased value (0..1), return the normalized time (0..1) at
 * which a cubic-bezier easing reaches it. Used so the other cards reveal exactly
 * as the lead card sweeps past their slot.
 */
export function getTimeForProgress(progress: number, ease: [number, number, number, number]): number {
  const [x1, y1, x2, y2] = ease;
  let lo = 0;
  let hi = 1;
  let s = progress;
  for (let i = 0; i < 30; i++) {
    s = (lo + hi) / 2;
    if (bezierAxis(s, y1, y2) < progress) lo = s;
    else hi = s;
  }
  return bezierAxis(s, x1, x2);
}

export const clamp = (v: number, lo: number, hi: number): number => Math.min(Math.max(v, lo), hi);
