import type { WroomDB } from "../types";
import { buildSeedDB } from "./seed";

const STORAGE_KEY = "wroom.db.v1";
export const DB_VERSION = 1;

/** Empty (non-seeded) database — used after a "clear everything" reset. */
export function emptyDB(): WroomDB {
  return {
    version: DB_VERSION,
    authors: [],
    characters: [],
    worldAccounts: [],
    follows: [],
    posts: [],
    drafts: {},
    session: { authorId: null },
  };
}

function isBrowserStorageAvailable(): boolean {
  try {
    const k = "__wroom_probe__";
    localStorage.setItem(k, "1");
    localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

export const STORAGE_OK = isBrowserStorageAvailable();

/** Load the DB from storage; seed a fresh example room on first run. */
export function loadDB(): WroomDB {
  if (!STORAGE_OK) {
    // No persistence: start with the seeded room in-session. Export/import in
    // Settings keeps work from being lost.
    return buildSeedDB();
  }
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = buildSeedDB();
    saveDB(seeded);
    return seeded;
  }
  try {
    const parsed = JSON.parse(raw) as WroomDB;
    return migrate(parsed);
  } catch {
    const seeded = buildSeedDB();
    saveDB(seeded);
    return seeded;
  }
}

export function saveDB(db: WroomDB): void {
  if (!STORAGE_OK) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
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
