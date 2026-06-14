import type { Account, Character, Post, WorldAccount, WroomDB } from "../types";

/** Resolve any account id (character or world) to a unified Account. */
export function resolveAccount(db: WroomDB, id: string): Account | null {
  const c = db.characters.find((x) => x.id === id);
  if (c) return { ...c, kind: "character" };
  const w = db.worldAccounts.find((x) => x.id === id);
  if (w) return { ...w, kind: "world" };
  return null;
}

export function accountName(acc: Account | null): string {
  if (!acc) return "Unknown";
  return acc.kind === "character" ? acc.displayName : acc.name;
}

/** Ids a character follows. */
export function followingIds(db: WroomDB, characterId: string): string[] {
  return db.follows
    .filter((f) => f.followerId === characterId)
    .map((f) => f.followeeId);
}

/** Character ids that follow the given account. */
export function followerIds(db: WroomDB, accountId: string): string[] {
  return db.follows
    .filter((f) => f.followeeId === accountId)
    .map((f) => f.followerId);
}

export function followingCount(db: WroomDB, characterId: string): number {
  return db.follows.filter((f) => f.followerId === characterId).length;
}

export function followerCount(db: WroomDB, accountId: string): number {
  return db.follows.filter((f) => f.followeeId === accountId).length;
}

/** All top-level posts (not replies) by a character, for counts. */
export function postCount(db: WroomDB, characterId: string): number {
  return db.posts.filter((p) => p.characterId === characterId).length;
}

function byNewest(a: Post, b: Post): number {
  return b.createdAt - a.createdAt;
}

/**
 * The home timeline for a stepped-in character: top-level posts from accounts
 * they follow, plus their own top-level posts, newest first.
 */
export function homeTimeline(db: WroomDB, characterId: string): Post[] {
  const follows = new Set(followingIds(db, characterId));
  follows.add(characterId); // include own posts
  return db.posts
    .filter((p) => !p.parentPostId && follows.has(p.characterId))
    .sort(byNewest);
}

/** Profile timeline: a character's own posts and replies, newest first. */
export function profileTimeline(db: WroomDB, characterId: string): Post[] {
  return db.posts.filter((p) => p.characterId === characterId).sort(byNewest);
}

/** Only top-level posts by a character (for a cleaner profile "Posts" tab). */
export function profilePosts(db: WroomDB, characterId: string): Post[] {
  return db.posts
    .filter((p) => p.characterId === characterId && !p.parentPostId)
    .sort(byNewest);
}

export function getPost(db: WroomDB, id: string): Post | null {
  return db.posts.find((p) => p.id === id) ?? null;
}

/** Direct replies to a post, oldest first (reads like a conversation). */
export function repliesTo(db: WroomDB, postId: string): Post[] {
  return db.posts
    .filter((p) => p.parentPostId === postId)
    .sort((a, b) => a.createdAt - b.createdAt);
}

/** The ancestor chain of a post (root → ... → parent), for thread context. */
export function ancestorsOf(db: WroomDB, postId: string): Post[] {
  const chain: Post[] = [];
  let cur = getPost(db, postId);
  const seen = new Set<string>();
  while (cur?.parentPostId && !seen.has(cur.parentPostId)) {
    seen.add(cur.parentPostId);
    const parent = getPost(db, cur.parentPostId);
    if (!parent) break;
    chain.unshift(parent);
    cur = parent;
  }
  return chain;
}

/** Aggregate stats across an author's whole room. */
export interface RoomStats {
  characters: number;
  posts: number;
  worldAccounts: number;
  follows: number;
}

export function roomStats(db: WroomDB, authorId: string): RoomStats {
  const chars = db.characters.filter((c) => c.authorId === authorId);
  const charIds = new Set(chars.map((c) => c.id));
  return {
    characters: chars.length,
    posts: db.posts.filter((p) => charIds.has(p.characterId)).length,
    worldAccounts: db.worldAccounts.filter((w) => w.authorId === authorId).length,
    follows: db.follows.filter((f) => charIds.has(f.followerId)).length,
  };
}

/** Recent activity across all of an author's characters, newest first. */
export function recentActivity(
  db: WroomDB,
  authorId: string,
  limit = 12
): Post[] {
  const charIds = new Set(
    db.characters.filter((c) => c.authorId === authorId).map((c) => c.id)
  );
  return db.posts
    .filter((p) => charIds.has(p.characterId))
    .sort(byNewest)
    .slice(0, limit);
}

export function getCharacter(db: WroomDB, id: string): Character | null {
  return db.characters.find((c) => c.id === id) ?? null;
}

export function getWorldAccount(db: WroomDB, id: string): WorldAccount | null {
  return db.worldAccounts.find((w) => w.id === id) ?? null;
}
