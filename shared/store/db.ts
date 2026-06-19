import type { WroomDB } from "../types";
import { buildSeedDB } from "./seed";
import { storage } from "../platform";

const STORAGE_KEY = "wroom.db.v1";
export const DB_VERSION = 1;

/**
 * Async storage can't be synchronously probed the way web localStorage could,
 * so we optimistically assume persistence is available; saveDB() degrades
 * gracefully to in-memory if a write ever throws.
 */
export const STORAGE_OK = true;

/** Empty (non-seeded) database — used after a "clear everything" reset. */
export function emptyDB(): WroomDB {
  return {
    version: DB_VERSION,
    authors: [],
    characters: [],
    worldAccounts: [],
    follows: [],
    posts: [],
    blocks: [],
    relationships: [],
    drafts: {},
    session: { authorId: null },
  };
}

/**
 * Load the DB from storage; seed a fresh example room on first run.
 * Async because native storage (AsyncStorage) has no synchronous read.
 */
export async function loadDB(): Promise<WroomDB> {
  let raw: string | null = null;
  try {
    raw = await storage.getItem(STORAGE_KEY);
  } catch {
    // Storage unavailable — start with a seeded room held in memory only.
    return buildSeedDB();
  }
  if (!raw) {
    const seeded = buildSeedDB();
    await saveDB(seeded);
    return seeded;
  }
  try {
    return migrate(JSON.parse(raw) as WroomDB);
  } catch {
    const seeded = buildSeedDB();
    await saveDB(seeded);
    return seeded;
  }
}

export async function saveDB(db: WroomDB): Promise<void> {
  try {
    await storage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (err) {
    // Quota or serialization failure — keep running on in-memory state.
    console.warn("Writer's Room: could not persist to storage", err);
  }
}

/** Bring older shapes forward. Currently a defensive normalizer. */
function migrate(db: WroomDB): WroomDB {
  const base = emptyDB();
  return {
    ...base,
    ...db,
    version: DB_VERSION,
    drafts: db.drafts ?? {},
    session: db.session ?? { authorId: null },
    authors: db.authors ?? [],
    characters: db.characters ?? [],
    worldAccounts: db.worldAccounts ?? [],
    follows: db.follows ?? [],
    blocks: db.blocks ?? [],
    relationships: db.relationships ?? [],
    posts: (db.posts ?? []).map((p) => ({
      ...p,
      likedBy: p.likedBy ?? [],
      repostedBy: p.repostedBy ?? [],
    })),
  };
}

/** Serialize the whole room for export. */
export function exportJSON(db: WroomDB): string {
  return JSON.stringify({ ...db, exportedAt: Date.now(), app: "wroom" }, null, 2);
}

/** Parse and validate an imported room file. Throws on malformed input. */
export function importJSON(text: string): WroomDB {
  const parsed = JSON.parse(text);
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !Array.isArray(parsed.authors) ||
    !Array.isArray(parsed.characters)
  ) {
    throw new Error("This file doesn't look like a Writer's Room export.");
  }
  return migrate(parsed as WroomDB);
}

export { STORAGE_KEY };
