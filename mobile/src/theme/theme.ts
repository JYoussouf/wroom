/* Writer's Room theme tokens, ported from the web app's CSS custom properties
   (src/index.css). Warm paper in light mode, deep stone at night. The per-
   character accent overrides `accent` contextually when stepped in. */
import { Platform, useColorScheme } from "react-native";

export interface WroomPalette {
  accent: string;
  accentInk: string;
  bg: string;
  bgElevated: string;
  bgSunken: string;
  surface: string;
  surface2: string;
  ink: string;
  ink2: string;
  ink3: string;
  danger: string;
  border: string;
}

const light: WroomPalette = {
  accent: "#b4532a",
  accentInk: "#ffffff",
  bg: "#faf8f5",
  bgElevated: "#ffffff",
  bgSunken: "#f1ece5",
  surface: "#ffffff",
  surface2: "#f6f2ec",
  ink: "#1b1714",
  ink2: "#5d564e",
  ink3: "#948b7f",
  danger: "#c0392b",
  border: "rgba(27,23,20,0.10)",
};

const dark: WroomPalette = {
  accent: "#b4532a",
  accentInk: "#ffffff",
  bg: "#0c0a09",
  bgElevated: "#18140f",
  bgSunken: "#060504",
  surface: "#18140f",
  surface2: "#221c16",
  ink: "#f4efe8",
  ink2: "#b7ac9d",
  ink3: "#7c7264",
  danger: "#e1664f",
  border: "rgba(244,239,232,0.10)",
};

export const palettes = { light, dark };

/** Type scale (px), matching the web --step-* ramp closely enough for parity. */
export const type = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 19,
  xl: 23,
  xxl: 28,
  display: 34,
} as const;

/** Spacing scale (px), matching the web --s-* ramp. */
export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 24,
  6: 32,
  7: 48,
} as const;

export const radius = { sm: 8, md: 12, lg: 18, pill: 999 } as const;

export const fonts = Platform.select({
  ios: { serif: "Georgia", sans: "system-ui", mono: "Menlo" },
  android: { serif: "serif", sans: "sans-serif", mono: "monospace" },
  default: { serif: "serif", sans: "System", mono: "monospace" },
})!;

export function useWroomTheme(): WroomPalette {
  const scheme = useColorScheme();
  return scheme === "light" ? light : dark;
}
