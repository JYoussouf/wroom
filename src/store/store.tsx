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
  WorldAccount,
  WroomDB,
} from "../types";
import { uid } from "../lib/id";
import { randomAccent, accentFromSeed } from "../lib/color";
import {
  DB_VERSION,
  emptyDB,
  exportJSON,
  importJSON,
  loadDB,
  saveDB,
  STORAGE_OK,
} from "./db";
import { buildSeedDB } from "./seed";

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
  signUp: (name: string, email: string, password: string) => Result;
  logIn: (email: string, password: string) => Result;
  logOut: () => void;
  updateAuthor: (patch: Partial<Omit<Author, "id" | "settings">>) => void;
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
  const saveTimer = useRef<number | null>(null);
  const flashTimer = useRef<number | null>(null);
  const toastTimer = useRef<number | null>(null);

  // Debounced persistence on every change.
  useEffect(() => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => saveDB(db), 180);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
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
    (name: string, email: string, password: string): Result => {
      const e = email.trim().toLowerCase();
      if (!name.trim()) return { ok: false, error: "Tell us your name." };
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e))
        return { ok: false, error: "That email doesn't look right." };
      if (password.length < 4)
        return { ok: false, error: "Use at least 4 characters for your password." };
      if (db.authors.some((a) => a.email.toLowerCase() === e))
        return { ok: false, error: "An account with that email already exists." };
      const author: Author = {
        id: uid("author"),
        name: name.trim(),
        email: e,
        password: obfuscate(password),
        settings: {
          theme: "system",
          cardDensity: "comfortable",
          defaultPostLimit: 280,
          defaultPrivacy: "private",
          composerFont: "serif",
          autosave: true,
          keepEverythingPrivate: true,
        },
        createdAt: Date.now(),
      };
      setDb((d) => ({
        ...d,
        authors: [...d.authors, author],
        session: { authorId: author.id },
      }));
      setActiveCharacterId(null);
      return { ok: true };
    },
    [db.authors]
  );

  const logIn = useCallback(
    (email: string, password: string): Result => {
      const e = email.trim().toLowerCase();
      const author = db.authors.find((a) => a.email.toLowerCase() === e);
      if (!author) return { ok: false, error: "No account with that email." };
      // Accept both obfuscated and plain (seed author stores plain).
      const matches =
        author.password === obfuscate(password) || author.password === password;
      if (!matches) return { ok: false, error: "Wrong password." };
      setDb((d) => ({ ...d, session: { authorId: author.id } }));
      setActiveCharacterId(null);
      return { ok: true };
    },
    [db.authors]
  );

  const logOut = useCallback(() => {
    setActiveCharacterId(null);
    setDb((d) => ({ ...d, session: { authorId: null } }));
  }, []);

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
    }): Post => {
      const post: Post = {
        id: uid("post"),
        characterId: input.characterId,
        body: input.body,
        parentPostId: input.parentPostId,
        threadId: input.threadId,
        createdAt: Date.now(),
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
    []
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
    logOut,
    updateAuthor,
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
