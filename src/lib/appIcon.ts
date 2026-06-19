import { useEffect } from "react";
import type { AppIcon } from "../types";

/**
 * The in-app brand mark: a transparent-background keycap used for the logo in
 * the UI (left rail, auth screen). Distinct from the selectable APP_ICONS, which
 * are the opaque variants used for the installable app icon / favicon.
 */
export const BRAND_MARK = "/icons/wroom-transparent.png";

/** The selectable app-icon variants — a pen-nib keycap on different backdrops. */
export const APP_ICONS: { key: AppIcon; label: string; src: string }[] = [
  { key: "cream", label: "Cream", src: "/icons/wroom-cream.png" },
  { key: "paper", label: "Paper", src: "/icons/wroom-paper.png" },
  { key: "sand", label: "Sand", src: "/icons/wroom-sand.png" },
];

const DEFAULT_ICON: AppIcon = "cream";

export function appIconSrc(icon: AppIcon | undefined | null): string {
  return (APP_ICONS.find((i) => i.key === icon) ?? APP_ICONS[0]).src;
}

/**
 * Keeps the browser-tab favicon and the iOS home-screen icon in sync with the
 * author's chosen app icon. (The installed PWA manifest icon is fixed at
 * install time; this updates the live document icons.)
 */
export function useAppIconController(icon: AppIcon | null | undefined) {
  useEffect(() => {
    const src = appIconSrc(icon ?? DEFAULT_ICON);
    const ensure = (rel: string) => {
      let link = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
      if (!link) {
        link = document.createElement("link");
        link.rel = rel;
        document.head.appendChild(link);
      }
      return link;
    };
    const favicon = ensure("icon");
    favicon.type = "image/png";
    favicon.href = src;
    ensure("apple-touch-icon").href = src;
  }, [icon]);
}
