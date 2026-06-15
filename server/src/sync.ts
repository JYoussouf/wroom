import { Hono } from "hono";
import type { Env, Variables } from "./db";
import { pullRoom } from "./db";

export const sync = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /api/sync — pull the authenticated author's full room as a WroomDB blob.
sync.get("/", async (c) => {
  const authorId = c.get("authorId");
  const room = await pullRoom(c.env.DB, authorId);
  return c.json(room);
});

// ---- Push (full replace of the author's room) ------------------------------

type Json = Record<string, unknown>;
const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);
const num = (v: unknown, fallback = 0): number => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const strArr = (v: unknown): string[] => arr(v).filter((x): x is string => typeof x === "string");

// POST /api/sync — replace this author's characters/world accounts/follows/posts/
// likes/reposts/drafts with the pushed room. Author identity (email/password) is
// NEVER mutated here; only profile fields (name/avatar/settings) are updated.
sync.post("/", async (c) => {
  const authorId = c.get("authorId");
  let payload: Json;
  try {
    payload = (await c.req.json()) as Json;
  } catch {
    return c.json({ error: "Invalid JSON." }, 400);
  }

  const db = c.env.DB;
  const statements: D1PreparedStatement[] = [];

  // Update the author's profile fields only (scoped to this author).
  const me = (arr(payload.authors).find((a) => (a as Json)?.id === authorId) ?? {}) as Json;
  if (Object.keys(me).length > 0) {
    statements.push(
      db.prepare("UPDATE authors SET name = ?, avatar = ?, settings = ? WHERE id = ?").bind(
        str(me.name, ""),
        me.avatar == null ? null : str(me.avatar),
        JSON.stringify(me.settings ?? {}),
        authorId,
      ),
    );
  }

  // Wipe the author's child collections, then re-insert from the payload.
  for (const table of ["post_likes", "post_reposts", "posts", "follows", "world_accounts", "characters", "drafts"]) {
    statements.push(db.prepare(`DELETE FROM ${table} WHERE author_id = ?`).bind(authorId));
  }

  for (const raw of arr(payload.characters)) {
    const ch = raw as Json;
    if (typeof ch.id !== "string") continue;
    statements.push(
      db
        .prepare(
          `INSERT INTO characters (id, author_id, display_name, handle, bio, avatar, banner,
            accent_color, pronouns, occupation, location, era_tag, voice_note, privacy,
            post_limit, tags, created_at, last_active_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        )
        .bind(
          ch.id, authorId, str(ch.displayName), str(ch.handle), str(ch.bio),
          ch.avatar == null ? null : str(ch.avatar), ch.banner == null ? null : str(ch.banner),
          str(ch.accentColor, "#888888"), str(ch.pronouns), str(ch.occupation), str(ch.location),
          str(ch.eraTag), str(ch.voiceNote), str(ch.privacy, "private"),
          typeof ch.postLimit === "number" ? ch.postLimit : null,
          JSON.stringify(strArr(ch.tags)), num(ch.createdAt, Date.now()), num(ch.lastActiveAt, Date.now()),
        ),
    );
  }

  for (const raw of arr(payload.worldAccounts)) {
    const w = raw as Json;
    if (typeof w.id !== "string") continue;
    statements.push(
      db
        .prepare("INSERT INTO world_accounts (id, author_id, name, handle, avatar, accent_color) VALUES (?,?,?,?,?,?)")
        .bind(w.id, authorId, str(w.name), str(w.handle), w.avatar == null ? null : str(w.avatar), str(w.accentColor, "#888888")),
    );
  }

  for (const raw of arr(payload.follows)) {
    const f = raw as Json;
    if (typeof f.id !== "string") continue;
    statements.push(
      db
        .prepare("INSERT INTO follows (id, author_id, follower_id, followee_id, created_at) VALUES (?,?,?,?,?)")
        .bind(f.id, authorId, str(f.followerId), str(f.followeeId), num(f.createdAt, Date.now())),
    );
  }

  for (const raw of arr(payload.posts)) {
    const p = raw as Json;
    if (typeof p.id !== "string") continue;
    statements.push(
      db
        .prepare(
          `INSERT INTO posts (id, author_id, character_id, body, parent_post_id, thread_id, created_at)
           VALUES (?,?,?,?,?,?,?)`,
        )
        .bind(
          p.id, authorId, str(p.characterId), str(p.body),
          p.parentPostId == null ? null : str(p.parentPostId),
          p.threadId == null ? null : str(p.threadId),
          num(p.createdAt, Date.now()),
        ),
    );
    for (const cid of strArr(p.likedBy)) {
      statements.push(
        db.prepare("INSERT OR IGNORE INTO post_likes (author_id, post_id, character_id) VALUES (?,?,?)").bind(authorId, p.id, cid),
      );
    }
    for (const cid of strArr(p.repostedBy)) {
      statements.push(
        db.prepare("INSERT OR IGNORE INTO post_reposts (author_id, post_id, character_id) VALUES (?,?,?)").bind(authorId, p.id, cid),
      );
    }
  }

  // Drafts: one JSON blob per author.
  if (payload.drafts && typeof payload.drafts === "object") {
    statements.push(
      db.prepare("INSERT INTO drafts (author_id, data) VALUES (?, ?)").bind(authorId, JSON.stringify(payload.drafts)),
    );
  }

  await db.batch(statements);
  const room = await pullRoom(db, authorId);
  return c.json(room);
});
