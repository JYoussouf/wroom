import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  Author,
  AuthorSettings,
  Character,
  Post,
  Relationship,
  WorldAccount,
  WroomDB,
} from "../types";
import { uid } from "../lib/id";
import { randomAccent, accentFromSeed } from "../lib/color";
import { api, ApiError, type RoomPayload } from "../lib/api";
import {
  DB_VERSION,
  emptyDB,
  exportJSON,
  importJSON,
  loadDB,
  saveDB,
  STORAGE_OK,
} from "./db";
import { buildSeedDB, DEMO_EMAIL } from "./seed";

export type SyncStatus = "idle" | "syncing" | "saved" | "error" | "offline";

function defaultSettings(): AuthorSettings {
  return {
    theme: "dark",
    cardDensity: "comfortable",
    defaultPostLimit: 280,
    defaultPrivacy: "private",
    composerFont: "serif",
    autosave: true,
    keepEverythingPrivate: true,
    appIcon: "cream",
  };
}

/** Map an API author (no password; loose settings) to the client Author shape. */
function toClientAuthor(a: {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  createdAt: number;
  settings: unknown;
}): Author {
  const s = (a.settings && typeof a.settings === "object" ? a.settings : {}) as Partial<AuthorSettings>;
  return {
    id: a.id,
    name: a.name,
    email: a.email,
    avatar: a.avatar,
    password: "", // server is the source of truth; never hold credentials locally
    createdAt: a.createdAt,
    settings: { ...defaultSettings(), ...s },
  };
}

/** Build a WroomDB from a server pull, normalizing the author + post arrays. */
function roomFromServer(room: WroomDB, fallbackAuthor: Author): WroomDB {
  const serverAuthor = room.authors?.[0];
  const author = serverAuthor ? toClientAuthor(serverAuthor) : fallbackAuthor;
  return {
    version: DB_VERSION,
    authors: [author],
    characters: room.characters ?? [],
    worldAccounts: room.worldAccounts ?? [],
    follows: room.follows ?? [],
    posts: (room.posts ?? []).map((p) => ({
      ...p,
      authorId: p.authorId ?? author.id,
      replyScope: p.replyScope ?? "open",
      replyAllowlist: p.replyAllowlist ?? [],
      likedBy: p.likedBy ?? [],
      repostedBy: p.repostedBy ?? [],
    })),
    blocks: room.blocks ?? [],
    relationships: room.relationships ?? [],
    drafts: room.drafts ?? {},
    session: { authorId: author.id },
  };
}

/** One author's slice of the DB, as sent to POST /api/sync (no credentials). */
function scopedRoom(d: WroomDB, authorId: string): RoomPayload {
  const a = d.authors.find((x) => x.id === authorId);
  const characters = d.characters.filter((c) => c.authorId === authorId);
  const charIds = new Set(characters.map((c) => c.id));
  const worldAccounts = d.worldAccounts.filter((w) => w.authorId === authorId);
  const follows = d.follows.filter((f) => charIds.has(f.followerId));
  const posts = d.posts.filter((p) => charIds.has(p.characterId));
  // A bond is in this author's slice if either side is one of their characters.
  const relationships = d.relationships.filter(
    (r) => charIds.has(r.aId) || charIds.has(r.bId)
  );
  const authors = a
    ? [{ id: a.id, name: a.name, email: a.email, avatar: a.avatar, settings: a.settings, createdAt: a.createdAt }]
    : [];
  return { authors, characters, worldAccounts, follows, posts, relationships, drafts: d.drafts };
}

export interface NewCharacterInput {
  displayName: string;
  handle: string;
  bio?: string;
  avatar?: string;
  banner?: string;
  accentColor?: string;
  pronouns?: string;
  occupation?: string;
  location?: string;
  eraTag?: string;
  voiceNote?: string;
  privacy?: Character["privacy"];
  postLimit?: number;
  tags?: string[];
}

type Result = { ok: true } | { ok: false; error: string };

interface StoreValue {
  db: WroomDB;
  storageOK: boolean;

  // ---- session / author ----
  currentAuthor: Author | null;
  signUp: (name: string, email: string, password: string) => Promise<Result>;
  logIn: (email: string, password: string) => Promise<Result>;
  enterDemo: () => void;
  logOut: () => void;
  /** Background sync state for the cloud account (offline/demo stays "idle"). */
  syncStatus: SyncStatus;
  updateAuthor: (patch: Partial<Omit<Author, "id" | "settings">>) => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<Result>;
  changeEmail: (password: string, newEmail: string) => Promise<Result>;
  updateSettings: (patch: Partial<AuthorSettings>) => void;

  // ---- active (stepped-in) character ----
  activeCharacterId: string | null;
  activeCharacter: Character | null;
  stepInto: (characterId: string) => void;
  stepOut: () => void;

  // ---- characters ----
  myCharacters: Character[];
  myWorldAccounts: WorldAccount[];
  normalizeHandle: (raw: string) => string;
  isHandleAvailable: (handle: string, exceptId?: string) => boolean;
  createCharacter: (input: NewCharacterInput) => Character;
  updateCharacter: (id: string, patch: Partial<Character>) => void;
  deleteCharacter: (id: string) => void;

  // ---- world accounts ----
  createWorldAccount: (name: string, handle: string, avatar?: string) => WorldAccount;
  updateWorldAccount: (id: string, patch: Partial<WorldAccount>) => void;
  deleteWorldAccount: (id: string) => void;

  // ---- follows ----
  isFollowing: (followerId: string, followeeId: string) => boolean;
  toggleFollow: (followerId: string, followeeId: string) => void;

  // ---- relationships (typed, consented bonds) ----
  requestRelationship: (aId: string, bId: string, type: string) => Relationship | null;
  confirmRelationship: (id: string) => void;
  declineRelationship: (id: string) => void;
  removeRelationship: (id: string) => void;
  updateRelationshipType: (id: string, type: string) => void;

  // ---- posts ----
  createPost: (input: {
    characterId: string;
    body: string;
    parentPostId?: string;
    threadId?: string;
  }) => Post;
  deletePost: (id: string) => void;
  toggleLike: (postId: string, byCharacterId: string) => void;
  toggleRepost: (postId: string, byCharacterId: string) => void;

  // ---- drafts ----
  getDraft: (key: string) => string;
  setDraft: (key: string, body: string) => void;
  clearDraft: (key: string) => void;

  // ---- ephemeral UI ----
  /** Post id to briefly highlight after publishing (the "slides in" feel). */
  flashPostId: string | null;
  flashPost: (id: string) => void;
  toast: string | null;
  showToast: (message: string) => void;

  // ---- data management ----
  exportRoom: () => string;
  importRoom: (text: string) => Result;
  resetEverything: () => void;
  reseedDemo: () => void;
  deleteAccount: () => void;
}

const Ctx = createContext<StoreValue | null>(null);

function obfuscate(pw: string): string {
  // Lightly obfuscated, not secure — this is a local fiction tool.
  try {
    return btoa(unescape(encodeURIComponent(`wr:${pw}`)));
  } catch {
    return `wr:${pw}`;
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<WroomDB>(() => loadDB());
  const [activeCharacterId, setActiveCharacterId] = useState<string | null>(null);
  const [flashPostId, setFlashPostId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const saveTimer = useRef<number | null>(null);
  const flashTimer = useRef<number | null>(null);
  const toastTimer = useRef<number | null>(null);
  // "server" = cloud account (syncs); "local" = demo room (offline only).
  const sessionModeRef = useRef<"server" | "local" | null>(null);
  // Set when we've just hydrated from the server, so we don't immediately echo
  // the pulled room back with a push.
  const skipNextPushRef = useRef(false);

  // Debounced persistence to localStorage (offline cache) on every change.
  useEffect(() => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => saveDB(db), 180);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [db]);

  // On boot, confirm the session with the server and hydrate the room. If the
  // request fails (offline) or there's no session (401), we keep the local
  // cache and stay in whatever state loadDB() produced.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sa = await api.me();
        if (cancelled || !sa) return;
        const room = await api.pull();
        if (cancelled) return;
        sessionModeRef.current = "server";
        skipNextPushRef.current = true;
        setActiveCharacterId(null);
        setDb(roomFromServer(room, toClientAuthor(sa)));
        setSyncStatus("saved");
      } catch {
        // Offline or unexpected error — keep the local cache untouched.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Debounced push of the current author's room to the server (cloud accounts
  // only). The localStorage cache above still holds everything for offline use.
  useEffect(() => {
    if (sessionModeRef.current !== "server") return;
    const authorId = db.session.authorId;
    if (!authorId) return;
    if (skipNextPushRef.current) {
      skipNextPushRef.current = false;
      return;
    }
    setSyncStatus("syncing");
    const timer = window.setTimeout(() => {
      api
        .push(scopedRoom(db, authorId))
        .then(() => setSyncStatus("saved"))
        .catch((err) =>
          setSyncStatus(err instanceof ApiError && err.status === 0 ? "offline" : "error")
        );
    }, 700);
    return () => window.clearTimeout(timer);
  }, [db]);

  const currentAuthor = useMemo(
    () => db.authors.find((a) => a.id === db.session.authorId) ?? null,
    [db.authors, db.session.authorId]
  );

  const myCharacters = useMemo(
    () =>
      currentAuthor
        ? db.characters.filter((c) => c.authorId === currentAuthor.id)
        : [],
    [db.characters, currentAuthor]
  );

  const myWorldAccounts = useMemo(
    () =>
      currentAuthor
        ? db.worldAccounts.filter((w) => w.authorId === currentAuthor.id)
        : [],
    [db.worldAccounts, currentAuthor]
  );

  const activeCharacter = useMemo(
    () => myCharacters.find((c) => c.id === activeCharacterId) ?? null,
    [myCharacters, activeCharacterId]
  );

  // ---- session / author ----
  const signUp = useCallback(
    async (name: string, email: string, password: string): Promise<Result> => {
      const e = email.trim().toLowerCase();
      if (!name.trim()) return { ok: false, error: "Tell us your name." };
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e))
        return { ok: false, error: "That email doesn't look right." };
      if (password.length < 8)
        return { ok: false, error: "Use at least 8 characters for your password." };
      try {
        const author = toClientAuthor(await api.signup(name.trim(), e, password));
        sessionModeRef.current = "server";
        skipNextPushRef.current = false; // push once to persist default settings
        setActiveCharacterId(null);
        setDb({
          version: DB_VERSION,
          authors: [author],
          characters: [],
          worldAccounts: [],
          follows: [],
          posts: [],
          blocks: [],
          relationships: [],
          drafts: {},
          session: { authorId: author.id },
        });
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Could not create your account.",
        };
      }
    },
    []
  );

  const logIn = useCallback(
    async (email: string, password: string): Promise<Result> => {
      const e = email.trim().toLowerCase();
      try {
        const author = toClientAuthor(await api.login(e, password));
        const room = await api.pull();
        sessionModeRef.current = "server";
        skipNextPushRef.current = true; // we just hydrated; don't echo it back
        setActiveCharacterId(null);
        setDb(roomFromServer(room, author));
        setSyncStatus("saved");
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Could not sign in.",
        };
      }
    },
    []
  );

  /** Load the local demo room without a cloud account (offline, never synced). */
  const enterDemo = useCallback(() => {
    sessionModeRef.current = "local";
    setSyncStatus("idle");
    const seed = buildSeedDB();
    const demo = seed.authors.find((a) => a.email.toLowerCase() === DEMO_EMAIL.toLowerCase());
    setActiveCharacterId(null);
    setDb({ ...seed, session: { authorId: demo?.id ?? null } });
  }, []);

  const logOut = useCallback(() => {
    const wasServer = sessionModeRef.current === "server";
    sessionModeRef.current = null;
    setSyncStatus("idle");
    setActiveCharacterId(null);
    setDb(emptyDB());
    if (wasServer) api.logout().catch(() => {});
  }, []);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string): Promise<Result> => {
      if (sessionModeRef.current !== "server")
        return { ok: false, error: "Sign in to a cloud account to change your password." };
      try {
        await api.changePassword(currentPassword, newPassword);
        return { ok: true };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : "Could not update password." };
      }
    },
    []
  );

  const changeEmail = useCallback(
    async (password: string, newEmail: string): Promise<Result> => {
      if (sessionModeRef.current !== "server")
        return { ok: false, error: "Sign in to a cloud account to change your email." };
      try {
        const sa = await api.changeEmail(password, newEmail);
        setDb((d) => ({
          ...d,
          authors: d.authors.map((a) =>
            a.id === d.session.authorId ? { ...a, email: sa.email } : a
          ),
        }));
        return { ok: true };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : "Could not update email." };
      }
    },
    []
  );

  const updateAuthor = useCallback(
    (patch: Partial<Omit<Author, "id" | "settings">>) => {
      setDb((d) => ({
        ...d,
        authors: d.authors.map((a) =>
          a.id === d.session.authorId
            ? {
                ...a,
                ...patch,
                password: patch.password ? obfuscate(patch.password) : a.password,
              }
            : a
        ),
      }));
    },
    []
  );

  const updateSettings = useCallback((patch: Partial<AuthorSettings>) => {
    setDb((d) => ({
      ...d,
      authors: d.authors.map((a) =>
        a.id === d.session.authorId
          ? { ...a, settings: { ...a.settings, ...patch } }
          : a
      ),
    }));
  }, []);

  // ---- active character ----
  const stepInto = useCallback((characterId: string) => {
    setActiveCharacterId(characterId);
    setDb((d) => ({
      ...d,
      characters: d.characters.map((c) =>
        c.id === characterId ? { ...c, lastActiveAt: Date.now() } : c
      ),
    }));
  }, []);

  const stepOut = useCallback(() => setActiveCharacterId(null), []);

  // ---- handles ----
  const normalizeHandle = useCallback((raw: string): string => {
    return raw
      .trim()
      .replace(/^@+/, "")
      .toLowerCase()
      .replace(/[^a-z0-9._]/g, "")
      .slice(0, 24);
  }, []);

  const isHandleAvailable = useCallback(
    (handle: string, exceptId?: string): boolean => {
      const h = handle.toLowerCase();
      if (!h) return false;
      const authorId = db.session.authorId;
      const charClash = db.characters.some(
        (c) => c.authorId === authorId && c.handle.toLowerCase() === h && c.id !== exceptId
      );
      const worldClash = db.worldAccounts.some(
        (w) => w.authorId === authorId && w.handle.toLowerCase() === h && w.id !== exceptId
      );
      return !charClash && !worldClash;
    },
    [db.characters, db.worldAccounts, db.session.authorId]
  );

  // ---- characters ----
  const createCharacter = useCallback(
    (input: NewCharacterInput): Character => {
      const author = db.authors.find((a) => a.id === db.session.authorId)!;
      const accent = input.accentColor || randomAccent();
      const character: Character = {
        id: uid("char"),
        authorId: author.id,
        displayName: input.displayName.trim() || "Untitled character",
        handle: input.handle,
        bio: input.bio?.trim() ?? "",
        avatar: input.avatar,
        banner: input.banner,
        accentColor: accent,
        pronouns: input.pronouns?.trim() ?? "",
        occupation: input.occupation?.trim() ?? "",
        location: input.location?.trim() ?? "",
        eraTag: input.eraTag?.trim() ?? "",
        voiceNote: input.voiceNote?.trim() ?? "",
        privacy: input.privacy ?? author.settings.defaultPrivacy,
        postLimit: input.postLimit,
        tags: input.tags ?? [],
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
      };
      setDb((d) => ({ ...d, characters: [...d.characters, character] }));
      return character;
    },
    [db.authors, db.session.authorId]
  );

  const updateCharacter = useCallback((id: string, patch: Partial<Character>) => {
    setDb((d) => ({
      ...d,
      characters: d.characters.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  }, []);

  const deleteCharacter = useCallback(
    (id: string) => {
      setActiveCharacterId((cur) => (cur === id ? null : cur));
      setDb((d) => {
        const postIds = new Set(
          d.posts.filter((p) => p.characterId === id).map((p) => p.id)
        );
        return {
          ...d,
          characters: d.characters.filter((c) => c.id !== id),
          follows: d.follows.filter(
            (f) => f.followerId !== id && f.followeeId !== id
          ),
          relationships: d.relationships.filter(
            (r) => r.aId !== id && r.bId !== id
          ),
          posts: d.posts
            .filter((p) => p.characterId !== id)
            .filter((p) => !(p.parentPostId && postIds.has(p.parentPostId)))
            .map((p) => ({
              ...p,
              likedBy: p.likedBy.filter((x) => x !== id),
              repostedBy: p.repostedBy.filter((x) => x !== id),
            })),
        };
      });
    },
    []
  );

  // ---- world accounts ----
  const createWorldAccount = useCallback(
    (name: string, handle: string, avatar?: string): WorldAccount => {
      const w: WorldAccount = {
        id: uid("world"),
        authorId: db.session.authorId!,
        name: name.trim() || "World account",
        handle,
        avatar,
        accentColor: accentFromSeed(handle || name),
      };
      setDb((d) => ({ ...d, worldAccounts: [...d.worldAccounts, w] }));
      return w;
    },
    [db.session.authorId]
  );

  const updateWorldAccount = useCallback(
    (id: string, patch: Partial<WorldAccount>) => {
      setDb((d) => ({
        ...d,
        worldAccounts: d.worldAccounts.map((w) =>
          w.id === id ? { ...w, ...patch } : w
        ),
      }));
    },
    []
  );

  const deleteWorldAccount = useCallback((id: string) => {
    setDb((d) => ({
      ...d,
      worldAccounts: d.worldAccounts.filter((w) => w.id !== id),
      follows: d.follows.filter((f) => f.followeeId !== id),
    }));
  }, []);

  // ---- follows ----
  const isFollowing = useCallback(
    (followerId: string, followeeId: string) =>
      db.follows.some(
        (f) => f.followerId === followerId && f.followeeId === followeeId
      ),
    [db.follows]
  );

  const toggleFollow = useCallback((followerId: string, followeeId: string) => {
    if (followerId === followeeId) return;
    setDb((d) => {
      const existing = d.follows.find(
        (f) => f.followerId === followerId && f.followeeId === followeeId
      );
      if (existing) {
        return { ...d, follows: d.follows.filter((f) => f.id !== existing.id) };
      }
      return {
        ...d,
        follows: [
          ...d.follows,
          { id: uid("follow"), followerId, followeeId, createdAt: Date.now() },
        ],
      };
    });
  }, []);

  // ---- relationships (typed, consented bonds — not follows) ----
  /** Resolve any account id to its owning author (character or world account). */
  const ownerOf = useCallback(
    (accountId: string): string | null => {
      const c = db.characters.find((x) => x.id === accountId);
      if (c) return c.authorId;
      const w = db.worldAccounts.find((x) => x.id === accountId);
      return w ? w.authorId : null;
    },
    [db.characters, db.worldAccounts]
  );

  /** Propose a bond from `aId` to `bId`. Same-author pairs are confirmed instantly
   *  (you own both sides); cross-author pairs stay pending until the other party
   *  confirms. No-ops if a bond already exists between the two. */
  const requestRelationship = useCallback(
    (aId: string, bId: string, type: string): Relationship | null => {
      if (aId === bId) return null;
      const exists = db.relationships.find(
        (r) =>
          (r.aId === aId && r.bId === bId) || (r.aId === bId && r.bId === aId)
      );
      if (exists) return exists;
      const sameAuthor =
        ownerOf(aId) !== null && ownerOf(aId) === ownerOf(bId);
      const now = Date.now();
      const rel: Relationship = {
        id: uid("rel"),
        aId,
        bId,
        type: type.trim() || "connection",
        status: sameAuthor ? "accepted" : "pending",
        requestedBy: aId,
        createdAt: now,
        acceptedAt: sameAuthor ? now : undefined,
      };
      setDb((d) => ({ ...d, relationships: [...d.relationships, rel] }));
      return rel;
    },
    [db.relationships, ownerOf]
  );

  const confirmRelationship = useCallback((id: string) => {
    setDb((d) => ({
      ...d,
      relationships: d.relationships.map((r) =>
        r.id === id ? { ...r, status: "accepted", acceptedAt: Date.now() } : r
      ),
    }));
  }, []);

  /** Decline a pending request — removes the row entirely. */
  const declineRelationship = useCallback((id: string) => {
    setDb((d) => ({
      ...d,
      relationships: d.relationships.filter((r) => r.id !== id),
    }));
  }, []);

  /** Sever an established bond (or cancel one you requested). */
  const removeRelationship = useCallback((id: string) => {
    setDb((d) => ({
      ...d,
      relationships: d.relationships.filter((r) => r.id !== id),
    }));
  }, []);

  const updateRelationshipType = useCallback((id: string, type: string) => {
    setDb((d) => ({
      ...d,
      relationships: d.relationships.map((r) =>
        r.id === id ? { ...r, type: type.trim() || "connection" } : r
      ),
    }));
  }, []);

  // ---- posts ----
  const createPost = useCallback(
    (input: {
      characterId: string;
      body: string;
      parentPostId?: string;
      threadId?: string;
      replyScope?: Post["replyScope"];
      replyAllowlist?: string[];
    }): Post => {
      const owner = db.characters.find((c) => c.id === input.characterId);
      const restricted = input.replyScope === "restricted";
      const post: Post = {
        id: uid("post"),
        characterId: input.characterId,
        authorId: owner?.authorId ?? db.session.authorId ?? "",
        body: input.body,
        parentPostId: input.parentPostId,
        threadId: input.threadId,
        createdAt: Date.now(),
        replyScope: restricted ? "restricted" : "open",
        replyAllowlist: restricted ? input.replyAllowlist ?? [] : [],
        likedBy: [],
        repostedBy: [],
      };
      setDb((d) => ({
        ...d,
        posts: [...d.posts, post],
        characters: d.characters.map((c) =>
          c.id === input.characterId ? { ...c, lastActiveAt: Date.now() } : c
        ),
      }));
      return post;
    },
    [db.characters, db.session.authorId]
  );

  const deletePost = useCallback((id: string) => {
    setDb((d) => ({
      ...d,
      posts: d.posts
        .filter((p) => p.id !== id)
        .filter((p) => p.parentPostId !== id),
    }));
  }, []);

  const toggleLike = useCallback((postId: string, byCharacterId: string) => {
    setDb((d) => ({
      ...d,
      posts: d.posts.map((p) =>
        p.id === postId
          ? {
              ...p,
              likedBy: p.likedBy.includes(byCharacterId)
                ? p.likedBy.filter((x) => x !== byCharacterId)
                : [...p.likedBy, byCharacterId],
            }
          : p
      ),
    }));
  }, []);

  const toggleRepost = useCallback((postId: string, byCharacterId: string) => {
    setDb((d) => ({
      ...d,
      posts: d.posts.map((p) =>
        p.id === postId
          ? {
              ...p,
              repostedBy: p.repostedBy.includes(byCharacterId)
                ? p.repostedBy.filter((x) => x !== byCharacterId)
                : [...p.repostedBy, byCharacterId],
            }
          : p
      ),
    }));
  }, []);

  // ---- drafts ----
  const getDraft = useCallback((key: string) => db.drafts[key] ?? "", [db.drafts]);
  const setDraft = useCallback((key: string, body: string) => {
    setDb((d) => ({ ...d, drafts: { ...d.drafts, [key]: body } }));
  }, []);
  const clearDraft = useCallback((key: string) => {
    setDb((d) => {
      const next = { ...d.drafts };
      delete next[key];
      return { ...d, drafts: next };
    });
  }, []);

  // ---- data management ----
  const exportRoom = useCallback(() => exportJSON(db), [db]);

  const importRoom = useCallback((text: string): Result => {
    try {
      const next = importJSON(text);
      next.version = DB_VERSION;
      setActiveCharacterId(null);
      setDb(next);
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Could not read that file.",
      };
    }
  }, []);

  const resetEverything = useCallback(() => {
    setActiveCharacterId(null);
    setDb(emptyDB());
  }, []);

  const reseedDemo = useCallback(() => {
    setActiveCharacterId(null);
    setDb(buildSeedDB());
  }, []);

  const deleteAccount = useCallback(() => {
    if (sessionModeRef.current === "server") api.deleteAccount().catch(() => {});
    sessionModeRef.current = null;
    setSyncStatus("idle");
    setActiveCharacterId(null);
    setDb((d) => {
      const authorId = d.session.authorId;
      if (!authorId) return d;
      const charIds = new Set(
        d.characters.filter((c) => c.authorId === authorId).map((c) => c.id)
      );
      const worldIds = new Set(
        d.worldAccounts.filter((w) => w.authorId === authorId).map((w) => w.id)
      );
      return {
        ...d,
        authors: d.authors.filter((a) => a.id !== authorId),
        characters: d.characters.filter((c) => c.authorId !== authorId),
        worldAccounts: d.worldAccounts.filter((w) => w.authorId !== authorId),
        follows: d.follows.filter(
          (f) => !charIds.has(f.followerId) && !charIds.has(f.followeeId) && !worldIds.has(f.followeeId)
        ),
        relationships: d.relationships.filter(
          (r) =>
            !charIds.has(r.aId) && !charIds.has(r.bId) &&
            !worldIds.has(r.aId) && !worldIds.has(r.bId)
        ),
        posts: d.posts.filter((p) => !charIds.has(p.characterId)),
        session: { authorId: null },
      };
    });
  }, []);

  // ---- ephemeral UI ----
  const flashPost = useCallback((id: string) => {
    setFlashPostId(id);
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlashPostId(null), 1400);
  }, []);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  const value: StoreValue = {
    db,
    storageOK: STORAGE_OK,
    currentAuthor,
    signUp,
    logIn,
    enterDemo,
    logOut,
    syncStatus,
    updateAuthor,
    changePassword,
    changeEmail,
    updateSettings,
    activeCharacterId,
    activeCharacter,
    stepInto,
    stepOut,
    myCharacters,
    myWorldAccounts,
    normalizeHandle,
    isHandleAvailable,
    createCharacter,
    updateCharacter,
    deleteCharacter,
    createWorldAccount,
    updateWorldAccount,
    deleteWorldAccount,
    isFollowing,
    toggleFollow,
    requestRelationship,
    confirmRelationship,
    declineRelationship,
    removeRelationship,
    updateRelationshipType,
    createPost,
    deletePost,
    toggleLike,
    toggleRepost,
    getDraft,
    setDraft,
    clearDraft,
    flashPostId,
    flashPost,
    toast,
    showToast,
    exportRoom,
    importRoom,
    resetEverything,
    reseedDemo,
    deleteAccount,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
