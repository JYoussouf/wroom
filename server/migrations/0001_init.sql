-- Writer's Room — initial schema.
-- Mirrors src/types.ts. One Author owns all their rows; everything is scoped
-- by author_id and isolated per tenant by the API. Times are epoch millis (INTEGER).

PRAGMA foreign_keys = ON;

-- Users. NOTE: never store plaintext passwords. password_hash is PBKDF2-SHA256
-- output (hex); password_salt is the per-user random salt (hex).
CREATE TABLE authors (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  avatar        TEXT,
  settings      TEXT NOT NULL DEFAULT '{}', -- AuthorSettings as JSON
  created_at    INTEGER NOT NULL
);
-- Case-insensitive unique email (signup/login normalize to lower-case).
CREATE UNIQUE INDEX idx_authors_email ON authors (email);

-- Invented personas owned by an author.
CREATE TABLE characters (
  id            TEXT PRIMARY KEY,
  author_id     TEXT NOT NULL REFERENCES authors(id) ON DELETE CASCADE,
  display_name  TEXT NOT NULL,
  handle        TEXT NOT NULL,            -- unique within a room (author), no leading '@'
  bio           TEXT NOT NULL DEFAULT '',
  avatar        TEXT,
  banner        TEXT,
  accent_color  TEXT NOT NULL DEFAULT '#888888',
  pronouns      TEXT NOT NULL DEFAULT '',
  occupation    TEXT NOT NULL DEFAULT '',
  location      TEXT NOT NULL DEFAULT '',
  era_tag       TEXT NOT NULL DEFAULT '',
  voice_note    TEXT NOT NULL DEFAULT '',
  privacy       TEXT NOT NULL DEFAULT 'private',  -- 'private' | 'shareable'
  post_limit    INTEGER,                  -- nullable; falls back to author default
  tags          TEXT NOT NULL DEFAULT '[]',       -- JSON array of strings
  created_at    INTEGER NOT NULL,
  last_active_at INTEGER NOT NULL
);
CREATE INDEX idx_characters_author ON characters (author_id);
CREATE UNIQUE INDEX idx_characters_handle ON characters (author_id, handle);

-- Lightweight accounts that populate a believable world.
CREATE TABLE world_accounts (
  id           TEXT PRIMARY KEY,
  author_id    TEXT NOT NULL REFERENCES authors(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  handle       TEXT NOT NULL,
  avatar       TEXT,
  accent_color TEXT NOT NULL DEFAULT '#888888'
);
CREATE INDEX idx_world_accounts_author ON world_accounts (author_id);

-- Follows. follower is always a Character; followee is a Character or WorldAccount.
-- author_id denormalized for cheap tenant-scoped queries and isolation.
CREATE TABLE follows (
  id          TEXT PRIMARY KEY,
  author_id   TEXT NOT NULL REFERENCES authors(id) ON DELETE CASCADE,
  follower_id TEXT NOT NULL,
  followee_id TEXT NOT NULL,
  created_at  INTEGER NOT NULL
);
CREATE INDEX idx_follows_author ON follows (author_id);
CREATE UNIQUE INDEX idx_follows_edge ON follows (author_id, follower_id, followee_id);

-- Posts authored by a character.
CREATE TABLE posts (
  id            TEXT PRIMARY KEY,
  author_id     TEXT NOT NULL REFERENCES authors(id) ON DELETE CASCADE,
  character_id  TEXT NOT NULL,
  body          TEXT NOT NULL,
  parent_post_id TEXT,                    -- reply target
  thread_id     TEXT,                     -- root post id of a self-thread
  created_at    INTEGER NOT NULL
);
CREATE INDEX idx_posts_author ON posts (author_id);
CREATE INDEX idx_posts_character ON posts (author_id, character_id);
CREATE INDEX idx_posts_thread ON posts (author_id, thread_id);

-- post.likedBy / post.repostedBy arrays, normalized into join tables.
-- The actor is a Character id. author_id denormalized for tenant scoping.
CREATE TABLE post_likes (
  author_id    TEXT NOT NULL REFERENCES authors(id) ON DELETE CASCADE,
  post_id      TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  character_id TEXT NOT NULL,
  PRIMARY KEY (post_id, character_id)
);
CREATE INDEX idx_post_likes_author ON post_likes (author_id);

CREATE TABLE post_reposts (
  author_id    TEXT NOT NULL REFERENCES authors(id) ON DELETE CASCADE,
  post_id      TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  character_id TEXT NOT NULL,
  PRIMARY KEY (post_id, character_id)
);
CREATE INDEX idx_post_reposts_author ON post_reposts (author_id);

-- Per-author drafts (DraftMap: key -> text). Stored as one JSON blob per author.
CREATE TABLE drafts (
  author_id TEXT PRIMARY KEY REFERENCES authors(id) ON DELETE CASCADE,
  data      TEXT NOT NULL DEFAULT '{}'
);

-- Auth sessions. token_hash is SHA-256 of the opaque cookie token (never store raw).
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  author_id  TEXT NOT NULL REFERENCES authors(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX idx_sessions_author ON sessions (author_id);
CREATE INDEX idx_sessions_expires ON sessions (expires_at);
