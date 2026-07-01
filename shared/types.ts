/* =========================================================================
   Domain model for Writer's Room.
   One Author owns a Room of Characters (and lightweight WorldAccounts).
   Characters follow each other / world accounts and publish Posts.
   Everything here is fiction.
   ========================================================================= */

export type ThemePref = "light" | "dark" | "system";
export type Privacy = "private" | "shareable";
export type ComposerFont = "serif" | "sans";
export type CardDensity = "comfortable" | "compact";

/** Kinds of activity that surface in the notification center / bell. */
export type NotificationKind = "like" | "repost" | "reply" | "follow" | "relationship";

/** Who may REPLY to a post. Visibility is unaffected — anyone not blocked can read it. */
export type ReplyScope = "open" | "restricted";

/** What a block targets: a whole user (all their personas) or one persona. */
export type BlockTargetType = "author" | "persona";

/** A relationship is established (mutually confirmed) or awaiting the other
 *  party's confirmation. Same-author bonds are created already accepted. */
export type RelationshipStatus = "pending" | "accepted";

/** Max personas (characters) a single author may hold at once. */
export const MAX_PERSONAS_PER_AUTHOR = 100;

/** Per-author notification preferences. Email is intentionally absent —
 *  Writer's Room never sends email. `inApp` gates the bell/badge; `push` gates
 *  device (out-of-app) notifications; the rest toggle individual sources. */
export interface NotificationPrefs {
  inApp: boolean;
  push: boolean;
  likes: boolean;
  replies: boolean;
  follows: boolean;
  relationships: boolean;
}

export interface AuthorSettings {
  theme: ThemePref;
  cardDensity: CardDensity;
  /** Default post-length limit applied to new rooms/characters. */
  defaultPostLimit: number;
  /** Privacy applied to newly created characters. */
  defaultPrivacy: Privacy;
  composerFont: ComposerFont;
  autosave: boolean;
  /** Master assurance that nothing leaves the device unless explicitly shared. */
  keepEverythingPrivate: boolean;
  /** Notification preferences. Optional for back-compat; defaulted on load. */
  notifications?: NotificationPrefs;
  /** Epoch ms the author last opened the notification center. Anything newer
   *  counts as unread. Optional/0 means "everything is unread". */
  notificationsReadAt?: number;
}

export interface Author {
  id: string;
  name: string;
  email: string;
  /** Local-only, lightly obfuscated — this is a fiction tool, not a vault. */
  password: string;
  avatar?: string; // data URL / object URL
  settings: AuthorSettings;
  createdAt: number;
}

export interface Character {
  id: string;
  authorId: string;
  displayName: string;
  handle: string; // unique within the room, no leading '@'
  bio: string;
  avatar?: string;
  banner?: string;
  accentColor: string; // hex, drives the UI when stepped in
  pronouns: string;
  occupation: string;
  location: string;
  eraTag: string; // era / world flavor
  voiceNote: string; // one-line note on how they speak
  privacy: Privacy;
  /** Per-character post length override; falls back to author default. */
  postLimit?: number;
  /** Curated preset tags (see shared/lib/tags.ts). Optional; treat missing as []. */
  tags?: string[];
  createdAt: number;
  lastActiveAt: number;
}

/** Lightweight account used to populate a believable world. Not a full persona. */
export interface WorldAccount {
  id: string;
  authorId: string;
  name: string;
  handle: string;
  avatar?: string;
  accentColor: string;
}

export interface Follow {
  id: string;
  /** Always a Character id (only characters can follow). */
  followerId: string;
  /** A Character id or a WorldAccount id. */
  followeeId: string;
  createdAt: number;
}

export interface Post {
  id: string;
  characterId: string;
  /** Owning author of characterId. Denormalized so the shared graph can apply
   *  blocks and attribute a post to a user without a join. */
  authorId: string;
  body: string;
  parentPostId?: string; // reply target
  threadId?: string; // root post id of a self-thread
  createdAt: number;
  /** Who may reply. 'open' = anyone (not blocked); 'restricted' = replyAllowlist only. */
  replyScope: ReplyScope;
  /** Persona ids allowed to reply when replyScope === 'restricted'. May include
   *  the author's own personas and/or other users'. Empty/ignored when 'open'. */
  replyAllowlist: string[];
  /** Character ids who liked / reposted. */
  likedBy: string[];
  repostedBy: string[];
}

/** A consented, *typed* bond between two characters — explicitly not a follow.
 *  A follow is a one-way readership; a relationship is a mutual, named connection
 *  ("sister", "rival", "mentor"…) that both parties acknowledge.
 *
 *  Consent: a relationship across two different authors starts `pending` and only
 *  becomes `accepted` when the other author confirms it. When both characters
 *  belong to the same author, it's created `accepted` immediately. */
export interface Relationship {
  id: string;
  /** The requesting character (always the initiator). */
  aId: string;
  /** The other character in the bond. */
  bId: string;
  /** Free-form label for the bond, e.g. "sister", "rival", "old flame". */
  type: string;
  status: RelationshipStatus;
  /** Character id that initiated the request — always equal to aId. */
  requestedBy: string;
  createdAt: number;
  /** When the bond was confirmed. Set on accept (immediately for same-author). */
  acceptedAt?: number;
}

/** A user-initiated block. blockerAuthorId is always an author (the acting user);
 *  the target is a whole author or a single persona. Mutual full hide is derived
 *  from this one-directional row at query time. */
export interface Block {
  id: string;
  blockerAuthorId: string;
  targetType: BlockTargetType;
  /** authors.id when targetType === 'author', else characters.id. */
  targetId: string;
  createdAt: number;
}

/** A draft, keyed per character (and optionally per reply target). */
export type DraftMap = Record<string, string>;

export interface Session {
  authorId: string | null;
}

export interface WroomDB {
  version: number;
  authors: Author[];
  characters: Character[];
  worldAccounts: WorldAccount[];
  follows: Follow[];
  posts: Post[];
  /** Blocks initiated by the authors in this view (typically just the session user). */
  blocks: Block[];
  /** Typed, consented bonds between characters (distinct from follows). */
  relationships: Relationship[];
  drafts: DraftMap;
  session: Session;
}

/** Any account that can appear in a timeline or be followed.
 *
 *  The author's own "main account" surfaces as `kind: "author"`. Authors have a
 *  `name` but no `handle`/`accentColor`, so those are derived (see
 *  `authorAccount` in selectors) and attached here so every Account exposes a
 *  `handle` and `accentColor` uniformly — consumers don't special-case it. */
export type Account =
  | (Character & { kind: "character" })
  | (WorldAccount & { kind: "world" })
  | (Author & { kind: "author"; handle: string; accentColor: string });

/** A derived activity event for the notification center. Not persisted — these
 *  are computed from posts/follows/relationships at read time (see
 *  `notificationsFor`). `id` is stable so lists can key/dedupe on it. */
export interface Notification {
  id: string;
  kind: NotificationKind;
  /** The character/world account that acted (liker, replier, follower, requester). */
  actorId: string;
  /** One of the author's characters that the action targeted. */
  subjectCharacterId: string;
  /** Post involved (the liked/reposted/replied-to post, or the reply itself). */
  postId?: string;
  /** Relationship involved, for `kind: "relationship"`. */
  relationshipId?: string;
  /** Best-available time. Real for replies/follows/relationships; for
   *  likes/reposts it falls back to the target post's createdAt (the model
   *  stores no per-like timestamp). */
  createdAt: number;
}
