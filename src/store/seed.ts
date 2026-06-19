import type {
  Author,
  Character,
  Follow,
  Post,
  Relationship,
  WorldAccount,
  WroomDB,
} from "../types";
import { uid } from "../lib/id";

/** Demo credentials surfaced on the auth screen's "explore" affordance. */
export const DEMO_EMAIL = "demo@wroom.studio";
export const DEMO_PASSWORD = "writer";

const now = Date.now();
const mins = (m: number) => now - m * 60_000;
const hrs = (h: number) => now - h * 3_600_000;
const days = (d: number) => now - d * 86_400_000;

/**
 * A fully fleshed example room: "Lamplight" — a small noir city of the author's
 * invention. Four interlinked characters who follow each other plus a couple of
 * world accounts to make the world feel inhabited.
 */
export function buildSeedDB(): WroomDB {
  const authorId = uid("author");

  const author: Author = {
    id: authorId,
    name: "Demo Writer",
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    settings: {
      theme: "system",
      cardDensity: "comfortable",
      defaultPostLimit: 280,
      defaultPrivacy: "private",
      composerFont: "serif",
      autosave: true,
      keepEverythingPrivate: true,
      appIcon: "cream",
    },
    createdAt: days(30),
  };

  // ---- Characters -------------------------------------------------------
  const vera: Character = {
    id: uid("char"),
    authorId,
    displayName: "Vera Sloane",
    handle: "veradusk",
    bio: "Private investigator. I find what the city would rather keep lost. Office above the laundromat on Halsey. Knock twice.",
    accentColor: "#a8324a",
    pronouns: "she/her",
    occupation: "Private investigator",
    location: "Lamplight City",
    eraTag: "1947 · noir",
    voiceNote: "Clipped, wry, hard-boiled. Speaks in short truths.",
    privacy: "private",
    tags: ["noir", "detective"],
    createdAt: days(28),
    lastActiveAt: mins(12),
  };

  const elias: Character = {
    id: uid("char"),
    authorId,
    displayName: "Elias Quill",
    handle: "quillbynight",
    bio: "Crime reporter at the Lamplight Ledger. I write the city's confessions before it knows it's guilty.",
    accentColor: "#3a5a9c",
    pronouns: "he/him",
    occupation: "Newspaper reporter",
    location: "Lamplight City",
    eraTag: "1947 · noir",
    voiceNote: "Eloquent, restless, a little too in love with a good line.",
    privacy: "private",
    tags: ["noir", "press"],
    createdAt: days(26),
    lastActiveAt: hrs(2),
  };

  const lila: Character = {
    id: uid("char"),
    authorId,
    displayName: "Lila Marsh",
    handle: "blue.lila",
    bio: "I sing at the Blue Heron Thursdays through Sunday. Everything else I keep behind the curtain.",
    accentColor: "#37718e",
    pronouns: "she/her",
    occupation: "Lounge singer",
    location: "Lamplight City",
    eraTag: "1947 · noir",
    voiceNote: "Warm, oblique, romantic. Answers questions with images.",
    privacy: "private",
    tags: ["noir", "music"],
    createdAt: days(24),
    lastActiveAt: hrs(6),
  };

  const dorsey: Character = {
    id: uid("char"),
    authorId,
    displayName: "Det. Frank Dorsey",
    handle: "dorsey_pd",
    bio: "Homicide, Lamplight PD. Twenty-two years on the job. I don't believe in coincidences or in Vera Sloane.",
    accentColor: "#6b6256",
    pronouns: "he/him",
    occupation: "Police detective",
    location: "Lamplight City",
    eraTag: "1947 · noir",
    voiceNote: "Gruff, procedural, secretly weary. Cop cadence.",
    privacy: "private",
    tags: ["noir", "police"],
    createdAt: days(22),
    lastActiveAt: days(1),
  };

  const characters = [vera, elias, lila, dorsey];

  // ---- World accounts (lightweight set dressing) ------------------------
  const ledger: WorldAccount = {
    id: uid("world"),
    authorId,
    name: "The Lamplight Ledger",
    handle: "lamplight_ledger",
    accentColor: "#2f6f5e",
  };
  const heron: WorldAccount = {
    id: uid("world"),
    authorId,
    name: "The Blue Heron Club",
    handle: "blueheronclub",
    accentColor: "#8a4f9e",
  };
  const worldAccounts = [ledger, heron];

  // ---- Follows (the interlinked graph) ----------------------------------
  const f = (followerId: string, followeeId: string, ago: number): Follow => ({
    id: uid("follow"),
    followerId,
    followeeId,
    createdAt: days(ago),
  });

  const follows: Follow[] = [
    // Vera reads the press, watches the cops, listens to Lila.
    f(vera.id, elias.id, 25),
    f(vera.id, dorsey.id, 21),
    f(vera.id, lila.id, 20),
    f(vera.id, ledger.id, 25),
    // Elias chases everyone.
    f(elias.id, vera.id, 25),
    f(elias.id, dorsey.id, 24),
    f(elias.id, ledger.id, 26),
    f(elias.id, heron.id, 18),
    // Lila keeps a smaller world.
    f(lila.id, vera.id, 19),
    f(lila.id, elias.id, 19),
    f(lila.id, heron.id, 24),
    // Dorsey, reluctantly, keeps tabs on the reporter and the PI.
    f(dorsey.id, elias.id, 23),
    f(dorsey.id, vera.id, 20),
  ];

  // ---- Relationships (named bonds — not follows) ------------------------
  // All same-author, so they're already accepted. They give the cast a shape a
  // follow graph can't: who these people *are* to each other.
  const rel = (
    aId: string,
    bId: string,
    type: string,
    ago: number
  ): Relationship => ({
    id: uid("rel"),
    aId,
    bId,
    type,
    status: "accepted",
    requestedBy: aId,
    createdAt: days(ago),
    acceptedAt: days(ago),
  });

  const relationships: Relationship[] = [
    rel(vera.id, elias.id, "uneasy allies", 24),
    rel(vera.id, dorsey.id, "old adversaries", 20),
    rel(lila.id, vera.id, "confidantes", 18),
    rel(elias.id, lila.id, "estranged siblings", 17),
  ];

  // ---- Posts ------------------------------------------------------------
  const p = (
    characterId: string,
    body: string,
    createdAt: number,
    extra: Partial<Post> = {}
  ): Post => ({
    id: uid("post"),
    characterId,
    authorId,
    body,
    createdAt,
    replyScope: "open",
    replyAllowlist: [],
    likedBy: [],
    repostedBy: [],
    ...extra,
  });

  const posts: Post[] = [];

  const veraOpen = p(
    vera.id,
    "Client says her husband walked into the fog on Cuyler Street and never came out. Fog doesn't keep people. Someone does.",
    hrs(20),
    { likedBy: [elias.id, lila.id] }
  );
  posts.push(veraOpen);

  posts.push(
    p(
      elias.id,
      "Third disappearance off Cuyler in a month and the Ledger runs it on page nine, under a tide chart. The city is learning how to not look.",
      hrs(18),
      { likedBy: [vera.id], repostedBy: [vera.id] }
    )
  );

  posts.push(
    p(
      dorsey.id,
      "For the record: no pattern, no case, no comment. People leave this city all the time. Usually for good reason.",
      hrs(16),
      { likedBy: [] }
    )
  );

  // A reply thread on Vera's opening post.
  const eliasReply = p(
    elias.id,
    "@veradusk give me a name before the morning edition and I'll give you a front page that makes the precinct nervous.",
    hrs(15),
    { parentPostId: veraOpen.id }
  );
  posts.push(eliasReply);

  posts.push(
    p(
      vera.id,
      "@quillbynight you'll get a name when it's a name and not a guess. Buy me a coffee at Mott's. Bring the photographer.",
      hrs(14),
      { parentPostId: veraOpen.id, likedBy: [elias.id] }
    )
  );

  posts.push(
    p(
      lila.id,
      "Sang for a half-empty room tonight. The empty chairs listen best — they don't pretend the sad songs aren't about them.",
      hrs(6),
      { likedBy: [vera.id, elias.id] }
    )
  );

  // A small self-thread from Vera (threadId points at the root).
  const threadRoot = p(
    vera.id,
    "Things the missing man left behind, in order of what they tell me:",
    mins(50)
  );
  threadRoot.threadId = threadRoot.id;
  posts.push(threadRoot);
  posts.push(
    p(
      vera.id,
      "1. A coat, still on its hook. Nobody walks into November without their coat unless they were never planning to feel the cold.",
      mins(48),
      { parentPostId: threadRoot.id, threadId: threadRoot.id }
    )
  );
  posts.push(
    p(
      vera.id,
      "2. A train ticket to Harrow, unpunched. 3. His wife's photograph, face-down in a drawer. The order matters.",
      mins(46),
      { parentPostId: threadRoot.id, threadId: threadRoot.id, likedBy: [lila.id] }
    )
  );

  posts.push(
    p(
      elias.id,
      "Filed eight hundred words I'll never see printed. Some nights the truth is just a draft you keep for yourself.",
      mins(20)
    )
  );

  posts.push(
    p(
      dorsey.id,
      "Sloane was at the morgue again. Tell your readers nothing, Quill. There's nothing to tell.",
      hrs(3),
      { parentPostId: undefined }
    )
  );

  posts.push(
    p(
      lila.id,
      "Someone requested a song I haven't sung since the war. I said I'd forgotten it. I hadn't.",
      mins(12),
      { likedBy: [vera.id] }
    )
  );

  return {
    version: 1,
    authors: [author],
    characters,
    worldAccounts,
    follows,
    posts,
    blocks: [],
    relationships,
    drafts: {},
    session: { authorId: null },
  };
}
