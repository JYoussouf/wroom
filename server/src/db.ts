// Worker environment bindings, request-scoped context, and the row <-> WroomDB
// mapping used by the sync endpoints. The client speaks the WroomDB shape from
// the app's src/types.ts; we translate to/from the relational schema here.

export interface Env {
  DB: D1Database;
  SESSION_SECRET: string;
  ALLOWED_ORIGINS: string;
}

/** Hono context variables set by requireAuth middleware. */
export interface Variables {
  authorId: string;
}

/** Author as returned to clients — never includes password material. */
export interface PublicAuthor {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  settings: unknown;
  createdAt: number;
}

// ---- Row shapes (snake_case, as stored) ------------------------------------

interface AuthorRow {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  settings: string;
  created_at: number;
}
interface CharacterRow {
  id: string; author_id: string; display_name: string; handle: string; bio: string;
  avatar: string | null; banner: string | null; accent_color: string; pronouns: string;
  occupation: string; location: string; era_tag: string; voice_note: string;
  privacy: string; post_limit: number | null; tags: string; created_at: number; last_active_at: number;
}
interface WorldAccountRow {
  id: string; author_id: string; name: string; handle: string;
  avatar: string | null; accent_color: string;
}
interface FollowRow {
  id: string; author_id: string; follower_id: string; followee_id: string; created_at: number;
}
interface PostRow {
  id: string; author_id: string; character_id: string; body: string;
  parent_post_id: string | null; thread_id: string | null; created_at: number;
}
interface ActorRow { post_id: string; character_id: string }

// ---- Mapping: rows -> WroomDB-shaped JSON ----------------------------------

function parseJSON<T>(text: string, fallback: T): T {
  try { return JSON.parse(text) as T; } catch { return fallback; }
}

export function rowToPublicAuthor(r: AuthorRow): PublicAuthor {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    avatar: r.avatar ?? undefined,
    settings: parseJSON<unknown>(r.settings, {}),
    createdAt: r.created_at,
  };
}

function rowToCharacter(r: CharacterRow) {
  return {
    id: r.id, authorId: r.author_id, displayName: r.display_name, handle: r.handle,
    bio: r.bio, avatar: r.avatar ?? undefined, banner: r.banner ?? undefined,
    accentColor: r.accent_color, pronouns: r.pronouns, occupation: r.occupation,
    location: r.location, eraTag: r.era_tag, voiceNote: r.voice_note,
    privacy: r.privacy, postLimit: r.post_limit ?? undefined,
    tags: parseJSON<string[]>(r.tags, []),
    createdAt: r.created_at, lastActiveAt: r.last_active_at,
  };
}

function rowToWorldAccount(r: WorldAccountRow) {
  return {
    id: r.id, authorId: r.author_id, name: r.name, handle: r.handle,
    avatar: r.avatar ?? undefined, accentColor: r.accent_color,
  };
}

function rowToFollow(r: FollowRow) {
  return { id: r.id, followerId: r.follower_id, followeeId: r.followee_id, createdAt: r.created_at };
}

/** Pull the full WroomDB-shaped room for one author. */
export async function pullRoom(db: D1Database, authorId: string) {
  const [author, characters, worldAccounts, follows, posts, likes, reposts, draftsRow] =
    await Promise.all([
      db.prepare("SELECT * FROM authors WHERE id = ?").bind(authorId).first<AuthorRow>(),
      db.prepare("SELECT * FROM characters WHERE author_id = ?").bind(authorId).all<CharacterRow>(),
      db.prepare("SELECT * FROM world_accounts WHERE author_id = ?").bind(authorId).all<WorldAccountRow>(),
      db.prepare("SELECT * FROM follows WHERE author_id = ?").bind(authorId).all<FollowRow>(),
      db.prepare("SELECT * FROM posts WHERE author_id = ?").bind(authorId).all<PostRow>(),
      db.prepare("SELECT post_id, character_id FROM post_likes WHERE author_id = ?").bind(authorId).all<ActorRow>(),
      db.prepare("SELECT post_id, character_id FROM post_reposts WHERE author_id = ?").bind(authorId).all<ActorRow>(),
      db.prepare("SELECT data FROM drafts WHERE author_id = ?").bind(authorId).first<{ data: string }>(),
    ]);

  const likesByPost = new Map<string, string[]>();
  for (const r of likes.results) (likesByPost.get(r.post_id) ?? likesByPost.set(r.post_id, []).get(r.post_id)!).push(r.character_id);
  const repostsByPost = new Map<string, string[]>();
  for (const r of reposts.results) (repostsByPost.get(r.post_id) ?? repostsByPost.set(r.post_id, []).get(r.post_id)!).push(r.character_id);

  const postsOut = posts.results.map((r) => ({
    id: r.id, characterId: r.character_id, body: r.body,
    parentPostId: r.parent_post_id ?? undefined, threadId: r.thread_id ?? undefined,
    createdAt: r.created_at,
    likedBy: likesByPost.get(r.id) ?? [],
    repostedBy: repostsByPost.get(r.id) ?? [],
  }));

  return {
    version: 1,
    authors: author ? [rowToPublicAuthor(author)] : [],
    characters: characters.results.map(rowToCharacter),
    worldAccounts: worldAccounts.results.map(rowToWorldAccount),
    follows: follows.results.map(rowToFollow),
    posts: postsOut,
    drafts: draftsRow ? parseJSON<Record<string, string>>(draftsRow.data, {}) : {},
    session: { authorId },
  };
}
