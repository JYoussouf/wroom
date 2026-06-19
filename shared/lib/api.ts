// Client for the wroom Cloudflare Worker API. Sessions use a bearer token (web
// could rely on an httpOnly cookie, but native can't receive a cross-site
// cookie, so the token is stored via the platform seam and sent in the
// Authorization header on every request — one path that works everywhere).
import type { Author, WroomDB } from "../types";
import { apiBaseUrl, storage } from "../platform";

const TOKEN_KEY = "wroom.auth.token";
let authToken: string | null = null;

/**
 * Load any persisted token from storage. Must be awaited once at app boot
 * (storage is async on native), before the first authenticated request.
 */
export async function initApi(): Promise<void> {
  try {
    authToken = await storage.getItem(TOKEN_KEY);
  } catch {
    authToken = null;
  }
}

function setToken(token: string | null): void {
  authToken = token;
  // Fire-and-forget persistence; the in-memory token covers this session.
  if (token) void storage.setItem(TOKEN_KEY, token).catch(() => {});
  else void storage.removeItem(TOKEN_KEY).catch(() => {});
}

/** A scoped room as sent to POST /api/sync — one author's slice of the DB. */
export interface RoomPayload {
  authors: unknown[];
  characters: unknown[];
  worldAccounts: unknown[];
  follows: unknown[];
  posts: unknown[];
  /** Typed, consented bonds between characters. Optional until the server persists them. */
  relationships?: unknown[];
  drafts: Record<string, string>;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${apiBaseUrl()}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    // Network / CORS failure — surfaced as a recognizable offline error.
    throw new ApiError("Can't reach the server. Check your connection.", 0);
  }

  let body: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!res.ok) {
    const message =
      (body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : null) ?? `Request failed (${res.status}).`;
    throw new ApiError(message, res.status);
  }
  return body as T;
}

/** Author as returned by the API (no password material; settings is loose JSON). */
type ServerAuthor = Omit<Author, "password" | "settings"> & { settings: unknown };

export const api = {
  async signup(name: string, email: string, password: string): Promise<ServerAuthor> {
    const { author, token } = await request<{ author: ServerAuthor; token: string }>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
    setToken(token);
    return author;
  },

  async login(email: string, password: string): Promise<ServerAuthor> {
    const { author, token } = await request<{ author: ServerAuthor; token: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setToken(token);
    return author;
  },

  async logout(): Promise<void> {
    try {
      await request("/api/auth/logout", { method: "POST" });
    } finally {
      setToken(null);
    }
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await request("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  async changeEmail(password: string, newEmail: string): Promise<ServerAuthor> {
    const { author } = await request<{ author: ServerAuthor }>("/api/auth/change-email", {
      method: "POST",
      body: JSON.stringify({ password, newEmail }),
    });
    return author;
  },

  /** Permanently delete the current account and all its data on the server. */
  async deleteAccount(): Promise<void> {
    try {
      await request("/api/auth/account", { method: "DELETE" });
    } finally {
      setToken(null);
    }
  },

  /** Current author, or null if not authenticated (401). Re-throws other errors. */
  async me(): Promise<ServerAuthor | null> {
    try {
      const { author } = await request<{ author: ServerAuthor }>("/api/auth/me");
      return author;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return null;
      throw err;
    }
  },

  /** Pull the authenticated author's full room (WroomDB shape). */
  async pull(): Promise<WroomDB> {
    return request<WroomDB>("/api/sync");
  },

  /** Replace the authenticated author's room with the given slice. */
  async push(room: RoomPayload): Promise<WroomDB> {
    return request<WroomDB>("/api/sync", {
      method: "POST",
      body: JSON.stringify(room),
    });
  },
};
