import { useMemo, useState } from "react";
import { useStore } from "../store/store";
import { useNav } from "../nav";
import {
  recentActivity,
  resolveAccount,
  roomStats,
} from "../store/selectors";
import { Avatar } from "../components/Avatar";
import { CharacterCard } from "../components/CharacterCard";
import { IconPlus, IconSearch, IconSettings, IconSpark } from "../components/icons";
import { RichText } from "../components/RichText";
import { relativeTime } from "../lib/time";

export function RoomScreen() {
  const { db, currentAuthor, myCharacters, stepInto } = useStore();
  const { push } = useNav();
  const [query, setQuery] = useState("");

  const stats = useMemo(
    () => (currentAuthor ? roomStats(db, currentAuthor.id) : null),
    [db, currentAuthor]
  );
  const activity = useMemo(
    () => (currentAuthor ? recentActivity(db, currentAuthor.id, 8) : []),
    [db, currentAuthor]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...myCharacters].sort((a, b) => b.lastActiveAt - a.lastActiveAt);
    if (!q) return sorted;
    return sorted.filter(
      (c) =>
        c.displayName.toLowerCase().includes(q) ||
        c.handle.toLowerCase().includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q)) ||
        c.occupation.toLowerCase().includes(q)
    );
  }, [myCharacters, query]);

  const compact = currentAuthor?.settings.cardDensity === "compact";

  function open(id: string) {
    stepInto(id);
    push({ name: "home" });
  }

  return (
    <>
      <header className="topbar">
        <div className="row spread center">
          <div className="row gap-2 center">
            <Avatar
              name={currentAuthor?.name ?? "Author"}
              src={currentAuthor?.avatar}
              accent="var(--accent)"
              size={34}
            />
            <div>
              <div className="bar-title" style={{ fontSize: "var(--step-1)" }}>
                Your Wroom
              </div>
              <div className="dim" style={{ fontSize: "0.72rem" }}>
                {currentAuthor?.name}
              </div>
            </div>
          </div>
          <button
            className="icon-btn"
            aria-label="Settings"
            onClick={() => push({ name: "settings" })}
          >
            <IconSettings />
          </button>
        </div>
      </header>

      <div className="app-scroll">
        <div className="screen-pad fade-in">
          <div className="search-field">
            <IconSearch />
            <input
              className="input"
              placeholder="Search your cast by name, handle, or tag"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search cast"
            />
          </div>

          {stats && (
            <div className="aggregate">
              <div className="stat">
                <div className="n mono-num">{stats.characters}</div>
                <div className="l">Characters</div>
              </div>
              <div className="stat">
                <div className="n mono-num">{stats.posts}</div>
                <div className="l">Posts</div>
              </div>
              <div className="stat">
                <div className="n mono-num">{stats.worldAccounts}</div>
                <div className="l">World</div>
              </div>
            </div>
          )}

          <button
            className="btn btn-primary btn-lg btn-block"
            onClick={() => push({ name: "character-new" })}
          >
            <IconPlus size={20} /> New character
          </button>

          {myCharacters.length === 0 ? (
            <div className="empty" style={{ marginTop: "var(--s-5)" }}>
              <div className="glyph">✦</div>
              <h3 className="serif">Your wroom is dark and waiting</h3>
              <p className="serif">
                Every story starts with a single voice. Invent your first
                character and step into their world.
              </p>
              <button
                className="btn btn-primary"
                onClick={() => push({ name: "character-new" })}
              >
                <IconPlus size={18} /> Create your first character
              </button>
            </div>
          ) : (
            <>
              <div className="row spread center">
                <div className="section-label" style={{ marginBottom: 0 }}>
                  The cast {filtered.length !== myCharacters.length && `· ${filtered.length} shown`}
                </div>
                {myCharacters.length >= 2 && (
                  <button
                    className="btn btn-ghost"
                    style={{ alignSelf: "center" }}
                    onClick={() => push({ name: "graph" })}
                  >
                    Relationships →
                  </button>
                )}
              </div>
              <div className={`room-grid ${compact ? "compact" : ""}`}>
                {filtered.map((c) => (
                  <CharacterCard
                    key={c.id}
                    character={c}
                    compact={compact}
                    onOpen={() => open(c.id)}
                  />
                ))}
              </div>
              {filtered.length === 0 && (
                <p className="muted serif" style={{ textAlign: "center", padding: "var(--s-5)" }}>
                  No one in your cast matches “{query}”.
                </p>
              )}
            </>
          )}

          {activity.length > 0 && (
            <>
              <div className="section-label">Recent activity</div>
              <div className="card" style={{ padding: "0 var(--s-4)" }}>
                {activity.map((post) => {
                  const who = resolveAccount(db, post.characterId);
                  return (
                    <button
                      key={post.id}
                      className="activity-item"
                      onClick={() => push({ name: "post", id: post.id })}
                    >
                      <Avatar
                        name={who && who.kind === "character" ? who.displayName : "?"}
                        src={who?.avatar}
                        accent={who?.accentColor ?? "var(--accent)"}
                        size={36}
                      />
                      <div className="activity-body">
                        <div className="row gap-2 center">
                          <span className="who">
                            {who && who.kind === "character" ? who.displayName : "Someone"}
                          </span>
                          <span className="dim" style={{ fontSize: "0.72rem" }}>
                            {relativeTime(post.createdAt)}
                          </span>
                          {post.parentPostId && (
                            <span className="dim" style={{ fontSize: "0.72rem" }}>
                              · reply
                            </span>
                          )}
                        </div>
                        <div className="txt"><RichText text={post.body} /></div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <p
            className="dim"
            style={{
              textAlign: "center",
              fontSize: "var(--step--1)",
              marginTop: "var(--s-6)",
            }}
          >
            <IconSpark size={12} /> Everything here is invented fiction.
          </p>
        </div>
      </div>
    </>
  );
}
