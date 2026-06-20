import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env, Variables } from "./db";
import { auth } from "./auth";
import { sync } from "./sync";
import { feedback } from "./feedback";
import { legal } from "./privacy";
import { requireAuth } from "./middleware";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// CORS locked to the configured origins, with credentials so the session
// cookie is sent/accepted cross-origin (web app + Capacitor shells).
app.use("/api/*", async (c, next) => {
  const allowed = (c.env.ALLOWED_ORIGINS ?? "").split(",").map((o) => o.trim()).filter(Boolean);
  return cors({
    origin: (origin) => (allowed.includes(origin) ? origin : null),
    credentials: true,
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })(c, next);
});

app.get("/", (c) => c.json({ name: "wroom-api", ok: true }));
app.get("/health", (c) => c.json({ ok: true }));

// Public legal pages (privacy policy) served as HTML — linked from the App Store.
app.route("/", legal);

app.route("/api/auth", auth);

// In-app feature-request form — unauthenticated, files a GitHub issue.
app.route("/api/feedback", feedback);

// Everything under /api/sync requires a valid session.
app.use("/api/sync/*", requireAuth);
app.use("/api/sync", requireAuth);
app.route("/api/sync", sync);

export default app;
