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
  tags: string[];
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
  body: string;
  parentPostId?: string; // reply target
  threadId?: string; // root post id of a self-thread
  createdAt: number;
  /** Character ids who liked / reposted (fictional, local). */
  likedBy: string[];
  repostedBy: string[];
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
  drafts: DraftMap;
  session: Session;
}

/** Any account that can appear in a timeline or be followed. */
export type Account =
  | (Character & { kind: "character" })
  | (WorldAccount & { kind: "world" });
