import { createMiddleware } from "hono/factory";
import type { Env, Variables } from "./db";
import { signToken } from "./crypto";
import { getSessionToken } from "./auth";

/**
 * Resolve the session cookie to an author and pin it on the context. Every
 * protected route reads c.get("authorId") and scopes all queries to it, so a
 * request can only ever touch its own author's rows (tenant isolation).
 */
export const requireAuth = createMiddleware<{ Bindings: Env; Variables: Variables }>(async (c, next) => {
  const token = getSessionToken(c);
  if (!token) return c.json({ error: "Not authenticated." }, 401);

  const tokenHash = await signToken(c.env.SESSION_SECRET, token);
  const session = await c.env.DB.prepare(
    "SELECT author_id, expires_at FROM sessions WHERE token_hash = ?",
  )
    .bind(tokenHash)
    .first<{ author_id: string; expires_at: number }>();

  if (!session || session.expires_at < Date.now()) {
    return c.json({ error: "Session expired." }, 401);
  }

  c.set("authorId", session.author_id);
  await next();
});
