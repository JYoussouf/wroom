/* Curated, standardized vocabulary of character tags.
   Free-form tags were replaced with this fixed set so every room speaks the
   same language and the editor can offer a tidy multi-select instead of a
   comma-separated free-text field. Both the editor and profile read from here. */

export interface CharacterTagGroup {
  /** Short heading shown above the group in the editor. */
  label: string;
  /** Canonical, display-ready tag labels. Also serve as their stored ids. */
  tags: string[];
}

/** The full preset vocabulary, organized into a few tasteful groups. */
export const CHARACTER_TAG_GROUPS: CharacterTagGroup[] = [
  {
    label: "Genre & world",
    tags: [
      "Sci-fi",
      "Fantasy",
      "Noir",
      "Horror",
      "Romance",
      "Historical",
      "Cyberpunk",
      "Western",
      "Mystery",
      "Slice of life",
    ],
  },
  {
    label: "Tone",
    tags: ["Dark", "Comedic", "Melancholy", "Whimsical", "Gritty", "Hopeful", "Absurdist"],
  },
  {
    label: "Role",
    tags: [
      "Protagonist",
      "Antagonist",
      "Villain",
      "Antihero",
      "Mentor",
      "Sidekick",
      "Comic relief",
      "Love interest",
      "Trickster",
      "Everyperson",
    ],
  },
];

/** Flat list of every preset tag, in group order. */
export const CHARACTER_TAGS: string[] = CHARACTER_TAG_GROUPS.flatMap((g) => g.tags);

const CANONICAL_BY_LOWER = new Map(CHARACTER_TAGS.map((t) => [t.toLowerCase(), t]));

/**
 * Coerce arbitrary stored tags into the canonical preset vocabulary:
 * case-insensitively matches known tags, maps them to their canonical label,
 * drops anything unrecognized, and de-duplicates while preserving order.
 * Missing/empty input yields an empty array (safe for optional `tags`).
 */
export function normalizeCharacterTags(tags: string[] | undefined | null): string[] {
  if (!tags?.length) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const hit = CANONICAL_BY_LOWER.get(String(raw).trim().toLowerCase());
    if (hit && !seen.has(hit)) {
      seen.add(hit);
      out.push(hit);
    }
  }
  return out;
}
