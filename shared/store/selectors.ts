import type {
  Account,
  Character,
  Notification,
  NotificationKind,
  NotificationPrefs,
  Post,
  WorldAccount,
  WroomDB,
} from "../types";

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

/**
 * The "For you" feed for the whole wroom: every top-level post by any of the
 * author's characters, newest first. A god's-eye view of your fiction world.
 */
export function wroomFeed(db: WroomDB, authorId: string): Post[] {
  const charIds = new Set(
    db.characters.filter((c) => c.authorId === authorId).map((c) => c.id)
  );
  return db.posts
    .filter((p) => !p.parentPostId && charIds.has(p.characterId))
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

/**
 * Derive notification events for an author from existing data — likes/reposts,
 * replies, new followers, and pending relationship requests targeting any of
 * the author's characters. Newest first. No events are persisted; this is
 * recomputed from the room blob each time.
 *
 * Self-actions are excluded (your own personas liking/replying to each other
 * don't notify). `prefs`, when given, filters out disabled sources.
 *
 * Timestamp note: likes/reposts carry no time in the model (`likedBy` /
 * `repostedBy` are bare id arrays), so those events are dated by the target
 * post's `createdAt` as a proxy.
 */
export function notificationsFor(
  db: WroomDB,
  authorId: string,
  prefs?: NotificationPrefs
): Notification[] {
  const myChars = db.characters.filter((c) => c.authorId === authorId);
  const myCharIds = new Set(myChars.map((c) => c.id));
  if (myCharIds.size === 0) return [];

  const want = (kind: NotificationKind): boolean => {
    if (!prefs) return true;
    switch (kind) {
      case "like":
      case "repost":
        return prefs.likes;
      case "reply":
        return prefs.replies;
      case "follow":
        return prefs.follows;
      case "relationship":
        return prefs.relationships;
    }
  };

  const out: Notification[] = [];
  const postById = new Map(db.posts.map((p) => [p.id, p]));

  // Likes / reposts / replies against my characters' posts.
  for (const post of db.posts) {
    if (!myCharIds.has(post.characterId)) continue;

    if (want("like")) {
      for (const actorId of post.likedBy ?? []) {
        if (myCharIds.has(actorId)) continue;
        out.push({
          id: `like:${post.id}:${actorId}`,
          kind: "like",
          actorId,
          subjectCharacterId: post.characterId,
          postId: post.id,
          createdAt: post.createdAt,
        });
      }
    }
    if (want("repost")) {
      for (const actorId of post.repostedBy ?? []) {
        if (myCharIds.has(actorId)) continue;
        out.push({
          id: `repost:${post.id}:${actorId}`,
          kind: "repost",
          actorId,
          subjectCharacterId: post.characterId,
          postId: post.id,
          createdAt: post.createdAt,
        });
      }
    }
  }

  // Replies whose parent belongs to one of my characters.
  if (want("reply")) {
    for (const reply of db.posts) {
      if (!reply.parentPostId) continue;
      if (myCharIds.has(reply.characterId)) continue; // my own reply
      const parent = postById.get(reply.parentPostId);
      if (!parent || !myCharIds.has(parent.characterId)) continue;
      out.push({
        id: `reply:${reply.id}`,
        kind: "reply",
        actorId: reply.characterId,
        subjectCharacterId: parent.characterId,
        postId: reply.id,
        createdAt: reply.createdAt,
      });
    }
  }

  // New followers of my characters.
  if (want("follow")) {
    for (const f of db.follows) {
      if (!myCharIds.has(f.followeeId)) continue;
      if (myCharIds.has(f.followerId)) continue; // my own follow
      out.push({
        id: `follow:${f.id}`,
        kind: "follow",
        actorId: f.followerId,
        subjectCharacterId: f.followeeId,
        createdAt: f.createdAt,
      });
    }
  }

  // Pending relationship requests awaiting my confirmation.
  if (want("relationship")) {
    for (const r of db.relationships) {
      if (r.status !== "pending") continue;
      if (r.requestedBy && myCharIds.has(r.requestedBy)) continue; // I asked
      // The target is whichever side is mine.
      const mineIsB = myCharIds.has(r.bId);
      const mineIsA = myCharIds.has(r.aId);
      if (!mineIsA && !mineIsB) continue;
      const subjectCharacterId = mineIsB ? r.bId : r.aId;
      const actorId = mineIsB ? r.aId : r.bId;
      if (myCharIds.has(actorId)) continue;
      out.push({
        id: `rel:${r.id}`,
        kind: "relationship",
        actorId,
        subjectCharacterId,
        relationshipId: r.id,
        createdAt: r.createdAt,
      });
    }
  }

  return out.sort((a, b) => b.createdAt - a.createdAt);
}

/** Count of notifications newer than `readAt` (the unread badge number). */
export function unreadNotificationCount(
  notifications: Notification[],
  readAt = 0
): number {
  return notifications.reduce((n, x) => (x.createdAt > readAt ? n + 1 : n), 0);
}

export function getCharacter(db: WroomDB, id: string): Character | null {
  return db.characters.find((c) => c.id === id) ?? null;
}

export function getWorldAccount(db: WroomDB, id: string): WorldAccount | null {
  return db.worldAccounts.find((w) => w.id === id) ?? null;
}
