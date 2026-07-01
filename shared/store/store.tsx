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
  Notification,
  NotificationPrefs,
  Post,
  WorldAccount,
  WroomDB,
} from "../types";
import { uid } from "../lib/id";
import { randomAccent, accentFromSeed } from "../lib/color";
import { api, ApiError, initApi, type RoomPayload } from "../lib/api";
import { notificationsFor, unreadNotificationCount } from "./selectors";
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

type Timer = ReturnType<typeof setTimeout>;

function defaultSettings(): AuthorSettings {
  return {
    theme: "dark",
    cardDensity: "comfortable",
    defaultPostLimit: 280,
    defaultPrivacy: "private",
    composerFont: "serif",
    autosave: true,
    keepEverythingPrivate: true,
    notifications: defaultNotificationPrefs(),
    notificationsReadAt: 0,
  };
}

function defaultNotificationPrefs(): NotificationPrefs {
  return {
    inApp: true,
    push: false,
    likes: true,
    replies: true,
    follows: true,
    relationships: true,
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
    settings: {
      ...defaultSettings(),
      ...s,
      notifications: { ...defaultNotificationPrefs(), ...(s.notifications ?? {}) },
    },
  };
}

/** Build a WroomDB from a server pull, normalizing the author + post arrays. */
function roomFromServer(room: WroomDB, fallbackAuthor: Author): WroomDB {
  const serverAuthor = room.authors?.[0];
  const author = serverAuthor ? toClientAuthor(serverAuthor) : fallbackAuthor;
  return {
    version: DB_VERSION,
    authors: [author],
    characters: (room.characters ?? []).map((c) => ({ ...c, tags: c.tags ?? [] })),
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
  // Include the author's own main-account posts (characterId === authorId)
  // alongside their characters' posts, so they aren't dropped on sync.
  const posts = d.posts.filter((p) => charIds.has(p.characterId) || p.characterId === authorId);
  const authors = a
    ? [{ id: a.id, name: a.name, email: a.email, avatar: a.avatar, settings: a.settings, createdAt: a.createdAt }]
    : [];
  const relationships = d.relationships.filter(
    (r) => charIds.has(r.aId) || charIds.has(r.bId)
  );
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
  /** False until the persisted room has loaded from storage on boot. */
  hydrated: boolean;

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

  // ---- notifications ----
  /** Derived activity events for the bell + notification center, newest first. */
  notifications: Notification[];
  /** Unread count (0 when in-app notifications are disabled). */
  unreadNotificationCount: number;
  /** Mark the notification center as seen now (clears the unread badge). */
  markNotificationsRead: () => void;

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

  // ---- posts ----
  createPost: (input: {
    characterId: string;
    body: string;
    parentPostId?: string;
    threadId?: string;
    replyScope?: Post["replyScope"];
    replyAllowlist?: string[];
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
  dismissToast: () => void;

  // ---- data management ----
  exportRoom: () => string;
  importRoom: (text: string) => Result;
  resetEverything: () => void;
  reseedDemo: () => void;
  deleteAccount: () => void;
}

const Ctx = createContext<StoreValue | null>(null);

function obfuscate(pw: string): string {
  // Lightly obfuscated, not secure — this is a local fiction tool, and the
  // server is the real source of truth for credentials. (No btoa on native.)
  return `wr:${pw}`;
}

// How long a toast stays up before auto-dismissing. Long enough to finish
// reading an error (e.g. a failed password change); tap to dismiss early.
const TOAST_DURATION_MS = 4000;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<WroomDB>(emptyDB);
  const [hydrated, setHydrated] = useState(false);
  const [activeCharacterId, setActiveCharacterId] = useState<string | null>(null);
  const [flashPostId, setFlashPostId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const saveTimer = useRef<Timer | null>(null);
  const flashTimer = useRef<Timer | null>(null);
  const toastTimer = useRef<Timer | null>(null);
  const hydratedRef = useRef(false);
  // "server" = cloud account (syncs); "local" = demo room (offline only).
  const sessionModeRef = useRef<"server" | "local" | null>(null);
  // Set when we've just hydrated from the server, so we don't immediately echo
  // the pulled room back with a push.
  const skipNextPushRef = useRef(false);

  // Boot: load the cached room from storage, then confirm the session with the
  // server and hydrate the live room. Offline/no-session keeps the local cache.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await loadDB();
      if (cancelled) return;
      hydratedRef.current = true;
      setDb(loaded);
      setHydrated(true);
      try {
        await initApi();
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

  // Debounced persistence to storage (offline cache) on every change. Skipped
  // until the initial load completes so we never overwrite saved data with the
  // empty boot state.
  useEffect(() => {
    if (!hydratedRef.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void saveDB(db);
    }, 180);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [db, hydrated]);

  // Debounced push of the current author's room to the server (cloud accounts
  // only). The storage cache above still holds everything for offline use.
  useEffect(() => {
    if (sessionModeRef.current !== "server") return;
    const authorId = db.session.authorId;
    if (!authorId) return;
    if (skipNextPushRef.current) {
      skipNextPushRef.current = false;
      return;
    }
    setSyncStatus("syncing");
    const timer = setTimeout(() => {
      api
        .push(scopedRoom(db, authorId))
        .then(() => setSyncStatus("saved"))
        .catch((err) =>
          setSyncStatus(err instanceof ApiError && err.status === 0 ? "offline" : "error")
        );
    }, 700);
    return () => clearTimeout(timer);
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

  // Derived notification events for the bell + notification center. Honors the
  // author's per-source toggles; unread is anything newer than notificationsReadAt.
  const notifications = useMemo<Notification[]>(
    () =>
      currentAuthor
        ? notificationsFor(db, currentAuthor.id, currentAuthor.settings.notifications)
        : [],
    [db, currentAuthor]
  );
  const unreadCount = useMemo(
    () =>
      currentAuthor?.settings.notifications?.inApp === false
        ? 0
        : unreadNotificationCount(notifications, currentAuthor?.settings.notificationsReadAt ?? 0),
    [notifications, currentAuthor]
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

  const markNotificationsRead = useCallback(() => {
    updateSettings({ notificationsReadAt: Date.now() });
  }, [updateSettings]);

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
      // The poster is usually a character, but may be the author's own main
      // account (posting "as themselves"), in which case characterId is the
      // author id and the post is attributed to that same author.
      const owner = db.characters.find((c) => c.id === input.characterId);
      const postedAsAuthor = !owner && db.authors.some((a) => a.id === input.characterId);
      const restricted = input.replyScope === "restricted";
      const post: Post = {
        id: uid("post"),
        characterId: input.characterId,
        authorId: owner?.authorId ?? (postedAsAuthor ? input.characterId : db.session.authorId ?? ""),
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
    [db.characters, db.authors, db.session.authorId]
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
        posts: d.posts.filter((p) => !charIds.has(p.characterId) && p.characterId !== authorId),
        session: { authorId: null },
      };
    });
  }, []);

  // ---- ephemeral UI ----
  const flashPost = useCallback((id: string) => {
    setFlashPostId(id);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlashPostId(null), 1400);
  }, []);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), TOAST_DURATION_MS);
  }, []);

  const dismissToast = useCallback(() => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(null);
  }, []);

  const value: StoreValue = {
    db,
    storageOK: STORAGE_OK,
    hydrated,
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
    notifications,
    unreadNotificationCount: unreadCount,
    markNotificationsRead,
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
    dismissToast,
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
