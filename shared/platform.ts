/* =========================================================================
   Platform seam.

   The shared core (types, store, api, selectors) is platform-agnostic. The two
   things it cannot know on its own — *where* to persist bytes and *which* API
   origin to talk to — are injected here at app boot:

     - web  (Vite)  → localStorage + import.meta.env.VITE_API_URL
     - native (Expo) → AsyncStorage + Expo config / env

   Call `configurePlatform(...)` exactly once, before the store mounts.
   ========================================================================= */

export interface PlatformStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface Platform {
  /** Async key/value store (localStorage on web, AsyncStorage on native). */
  storage: PlatformStorage;
  /** Origin of the wroom API (no trailing slash). */
  apiBaseUrl: string;
}

const DEFAULT_API_BASE = "https://wroom-api.joseppy-workers.workers.dev";

let current: Platform | null = null;

export function configurePlatform(p: Partial<Platform> & { storage: PlatformStorage }): void {
  current = {
    storage: p.storage,
    apiBaseUrl: (p.apiBaseUrl ?? DEFAULT_API_BASE).replace(/\/$/, ""),
  };
}

export function platform(): Platform {
  if (!current) {
    throw new Error(
      "Platform not configured. Call configurePlatform({ storage, apiBaseUrl }) at app boot."
    );
  }
  return current;
}

/** Convenience accessors used throughout the shared core. */
export const storage: PlatformStorage = {
  getItem: (k) => platform().storage.getItem(k),
  setItem: (k, v) => platform().storage.setItem(k, v),
  removeItem: (k) => platform().storage.removeItem(k),
};

export function apiBaseUrl(): string {
  return platform().apiBaseUrl;
}
