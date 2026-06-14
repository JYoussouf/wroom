import { inkOn } from "./color";

/** Up-to-two-letter monogram from a display name. */
export function monogram(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** A soft gradient derived from an accent, for default banners. */
export function gradientBanner(accent: string): string {
  return `linear-gradient(135deg, ${accent} 0%, color-mix(in srgb, ${accent} 55%, #000) 100%)`;
}

/** A subtle two-stop gradient for default monogram avatars. */
export function gradientAvatar(accent: string): string {
  return `linear-gradient(150deg, color-mix(in srgb, ${accent} 88%, #fff) 0%, ${accent} 70%, color-mix(in srgb, ${accent} 70%, #000) 100%)`;
}

export function avatarInk(accent: string): string {
  return inkOn(accent);
}
