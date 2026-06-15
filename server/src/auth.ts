import { Hono } from "hono";
import type { Context } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import type { Env, Variables } from "./db";
import { rowToPublicAuthor } from "./db";
import { hashPassword, newSalt, newSessionToken, signToken, timingSafeEqual } from "./crypto";

export const auth = new Hono<{ Bindings: Env; Variables: Variables }>();

export const SESSION_COOKIE = "wroom_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

/** Issue a session: store the peppered token hash, set an httpOnly cookie. */
type Ctx = Context<{ Bindings: Env; Variables: Variables }>;

async function startSession(c: Ctx, authorId: string) {
  const token = newSessionToken();
  const tokenHash = await signToken(c.env.SESSION_SECRET, token);
  const now = Date.now();
  await c.env.DB.prepare(
    "INSERT INTO sessions (token_hash, author_id, created_at, expires_at) VALUES (?,?,?,?)",
  )
    .bind(tokenHash, authorId, now, now + SESSION_TTL_MS)
    .run();

  // Secure only over https so http://localhost dev still receives the cookie.
  const secure = new URL(c.req.url).protocol === "https:";
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: "Lax",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
  // Also return the raw token so native clients (iOS/Capacitor), where the
  // cross-site cookie won't flow, can send it as `Authorization: Bearer <token>`.
  return token;
}

/**
 * The session token from either the Authorization header (preferred, used by
 * native apps) or the session cookie (web, same-origin).
 */
export function getSessionToken(c: Ctx): string | null {
  const header = c.req.header("Authorization");
  if (header && header.startsWith("Bearer ")) return header.slice(7).trim();
  return getCookie(c, SESSION_COOKIE) ?? null;
}

interface AuthorRow {
  id: string; name: string; email: string; avatar: string | null;
  settings: string; created_at: number; password_hash: string; password_salt: string;
}

/** Resolve the current author row from the session (header or cookie), or null. */
async function authedAuthor(c: Ctx): Promise<AuthorRow | null> {
  const token = getSessionToken(c);
  if (!token) return null;
  const tokenHash = await signToken(c.env.SESSION_SECRET, token);
  const session = await c.env.DB.prepare(
    "SELECT author_id, expires_at FROM sessions WHERE token_hash = ?",
  )
    .bind(tokenHash)
    .first<{ author_id: string; expires_at: number }>();
  if (!session || session.expires_at < Date.now()) return null;
  return c.env.DB.prepare("SELECT * FROM authors WHERE id = ?").bind(session.author_id).first<AuthorRow>();
}

// POST /api/auth/signup  { name, email, password }
auth.post("/signup", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!name) return c.json({ error: "Name is required." }, 400);
  if (!EMAIL_RE.test(email)) return c.json({ error: "A valid email is required." }, 400);
  if (password.length < 8) return c.json({ error: "Password must be at least 8 characters." }, 400);

  const existing = await c.env.DB.prepare("SELECT id FROM authors WHERE email = ?").bind(email).first();
  if (existing) return c.json({ error: "An account with that email already exists." }, 409);

  const salt = newSalt();
  const passwordHash = await hashPassword(password, salt);
  const id = newId("author");
  const now = Date.now();
  await c.env.DB.prepare(
    `INSERT INTO authors (id, name, email, password_hash, password_salt, avatar, settings, created_at)
     VALUES (?,?,?,?,?,?,?,?)`,
  )
    .bind(id, name, email, passwordHash, salt, null, "{}", now)
    .run();

  const token = await startSession(c, id);
  return c.json({ author: { id, name, email, settings: {}, createdAt: now }, token });
});

// POST /api/auth/login  { email, password }
auth.post("/login", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  const row = await c.env.DB.prepare("SELECT * FROM authors WHERE email = ?").bind(email).first<AuthorRow>();
  // Always run a hash to keep timing uniform whether or not the email exists.
  const salt = row?.password_salt ?? "00000000000000000000000000000000";
  const candidate = await hashPassword(password, salt);
  if (!row || !timingSafeEqual(candidate, row.password_hash)) {
    return c.json({ error: "Incorrect email or password." }, 401);
  }

  const token = await startSession(c, row.id);
  return c.json({ author: rowToPublicAuthor(row), token });
});

// POST /api/auth/logout — revoke the current session.
auth.post("/logout", async (c) => {
  const token = getSessionToken(c);
  if (token) {
    const tokenHash = await signToken(c.env.SESSION_SECRET, token);
    await c.env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(tokenHash).run();
  }
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
  return c.json({ ok: true });
});

// GET /api/auth/me — current author, or 401.
auth.get("/me", async (c) => {
  const token = getSessionToken(c);
  if (!token) return c.json({ error: "Not authenticated." }, 401);
  const tokenHash = await signToken(c.env.SESSION_SECRET, token);
  const session = await c.env.DB.prepare(
    "SELECT author_id, expires_at FROM sessions WHERE token_hash = ?",
  )
    .bind(tokenHash)
    .first<{ author_id: string; expires_at: number }>();
  if (!session || session.expires_at < Date.now()) return c.json({ error: "Not authenticated." }, 401);

  const row = await c.env.DB.prepare("SELECT * FROM authors WHERE id = ?").bind(session.author_id).first<AuthorRow>();
  if (!row) return c.json({ error: "Not authenticated." }, 401);
  return c.json({ author: rowToPublicAuthor(row) });
});

// POST /api/auth/change-password  { currentPassword, newPassword }
auth.post("/change-password", async (c) => {
  const row = await authedAuthor(c);
  if (!row) return c.json({ error: "Not authenticated." }, 401);
  const body = await c.req.json().catch(() => ({}));
  const current = String(body.currentPassword ?? "");
  const next = String(body.newPassword ?? "");
  if (next.length < 8) return c.json({ error: "New password must be at least 8 characters." }, 400);
  const candidate = await hashPassword(current, row.password_salt);
  if (!timingSafeEqual(candidate, row.password_hash)) {
    return c.json({ error: "Current password is incorrect." }, 401);
  }
  const salt = newSalt();
  const hash = await hashPassword(next, salt);
  await c.env.DB.prepare("UPDATE authors SET password_hash = ?, password_salt = ? WHERE id = ?")
    .bind(hash, salt, row.id)
    .run();
  return c.json({ ok: true });
});

// POST /api/auth/change-email  { password, newEmail }
auth.post("/change-email", async (c) => {
  const row = await authedAuthor(c);
  if (!row) return c.json({ error: "Not authenticated." }, 401);
  const body = await c.req.json().catch(() => ({}));
  const password = String(body.password ?? "");
  const newEmail = String(body.newEmail ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(newEmail)) return c.json({ error: "A valid email is required." }, 400);
  const candidate = await hashPassword(password, row.password_salt);
  if (!timingSafeEqual(candidate, row.password_hash)) {
    return c.json({ error: "Password is incorrect." }, 401);
  }
  const existing = await c.env.DB.prepare("SELECT id FROM authors WHERE email = ? AND id <> ?")
    .bind(newEmail, row.id)
    .first();
  if (existing) return c.json({ error: "That email is already in use." }, 409);
  await c.env.DB.prepare("UPDATE authors SET email = ? WHERE id = ?").bind(newEmail, row.id).run();
  return c.json({ author: rowToPublicAuthor({ ...row, email: newEmail }) });
});

// DELETE /api/auth/account — permanently delete the current author and all
// their data. Child rows are removed explicitly (not relying on FK cascade).
auth.delete("/account", async (c) => {
  const token = getSessionToken(c);
  if (!token) return c.json({ error: "Not authenticated." }, 401);
  const tokenHash = await signToken(c.env.SESSION_SECRET, token);
  const session = await c.env.DB.prepare("SELECT author_id FROM sessions WHERE token_hash = ?")
    .bind(tokenHash)
    .first<{ author_id: string }>();
  if (!session) return c.json({ error: "Not authenticated." }, 401);

  const aid = session.author_id;
  const tables = ["post_likes", "post_reposts", "posts", "follows", "world_accounts", "characters", "drafts", "sessions"];
  await c.env.DB.batch([
    ...tables.map((t) => c.env.DB.prepare(`DELETE FROM ${t} WHERE author_id = ?`).bind(aid)),
    c.env.DB.prepare("DELETE FROM authors WHERE id = ?").bind(aid),
  ]);
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
  return c.json({ ok: true });
});
