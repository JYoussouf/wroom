import { useEffect } from "react";
import { inkOn } from "./color";
import type { ThemePref } from "../types";

/** Resolve a theme preference to a concrete light/dark value. */
function resolve(pref: ThemePref): "light" | "dark" {
  if (pref === "system") {
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return pref;
}

/**
 * Applies the resolved theme and the active accent to <html> as CSS variables.
 * The accent drives the entire UI; when stepped into a character it recolors
 * to that character's chosen accent (the theatrical "putting on the mask").
 */
export function useThemeController(pref: ThemePref, accent: string | null) {
  // Theme (light / dark / system, reacting to OS changes).
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => root.setAttribute("data-theme", resolve(pref));
    apply();
    if (pref === "system" && window.matchMedia) {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
  }, [pref]);

  // Accent — falls back to the editorial default defined in :root.
  useEffect(() => {
    const root = document.documentElement;
    if (accent) {
      root.style.setProperty("--accent", accent);
      root.style.setProperty("--accent-ink", inkOn(accent));
    } else {
      root.style.removeProperty("--accent");
      root.style.removeProperty("--accent-ink");
    }
    // Update the iOS status-bar / theme color to match.
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta && accent) meta.setAttribute("content", accent);
  }, [accent]);
}
