-- Writer's Room — shared social network upgrade.
--
-- v1 was single-tenant: every row was scoped by author_id and a post was only
-- ever visible to its owning author (sync was a full-replace of one author's
-- room). v2 makes personas (characters) from different authors share ONE graph:
-- reads are globally visible subject to blocks, and writes are authorized
-- per-row at the API. author_id stays on every row as the OWNERSHIP key (who
-- may edit/delete), not a visibility fence.

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- 1. Handles become globally unique. A persona is now addressable across the
--    whole network, so @handle must be unique everywhere, not just per room.
--    NOTE: if any pre-existing rows share a handle across authors, this index
--    will fail to create — run a one-off de-dup before applying in that case.
-- ---------------------------------------------------------------------------
DROP INDEX IF EXISTS idx_characters_handle;
CREATE UNIQUE INDEX idx_characters_handle ON characters (handle);

-- ---------------------------------------------------------------------------
-- 2. Per-post reply gating (visibility is unchanged — every non-blocked viewer
--    can READ a post; reply_scope only governs who may REPLY).
--      'open'       — anyone, modulo blocks, may reply.
--      'restricted' — only personas in post_reply_allowlist (plus the post's
--                     own persona, so an author can continue their own thread).
--    The allowlist may name the poster's own personas AND other users' personas.
-- ---------------------------------------------------------------------------
ALTER TABLE posts ADD COLUMN reply_scope TEXT NOT NULL DEFAULT 'open';

CREATE TABLE post_reply_allowlist (
  post_id      TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, character_id)
);
CREATE INDEX idx_reply_allowlist_char ON post_reply_allowlist (character_id);

-- ---------------------------------------------------------------------------
-- 3. Blocks. Blocking is a USER (author) action — "block other users, not just
--    their personas" — but the target may be a whole author (all their personas)
--    OR a single persona. Mutual full hide: when A blocks B, neither side's
--    personas may see, reply to, like, repost, or follow the other; enforced at
--    query time in BOTH directions from this one-directional row.
-- ---------------------------------------------------------------------------
CREATE TABLE blocks (
  id                TEXT PRIMARY KEY,
  blocker_author_id TEXT NOT NULL REFERENCES authors(id) ON DELETE CASCADE,
  target_type       TEXT NOT NULL,            -- 'author' | 'persona'
  target_id         TEXT NOT NULL,            -- authors.id or characters.id
  created_at        INTEGER NOT NULL
);
CREATE UNIQUE INDEX idx_blocks_edge ON blocks (blocker_author_id, target_type, target_id);
-- Reverse lookup: "who has blocked this author/persona?" for the mirror-hide.
CREATE INDEX idx_blocks_target ON blocks (target_type, target_id);

-- ---------------------------------------------------------------------------
-- 4. The 100-personas-per-author cap is enforced in the API on persona create
--    (SELECT count(*) FROM characters WHERE author_id = ?), not as a schema
--    constraint — SQLite can't express it cleanly and the limit is a product
--    rule we may want to tune per plan.
-- ---------------------------------------------------------------------------
