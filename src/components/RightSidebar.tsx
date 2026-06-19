import { useMemo, useState } from "react";
import { useStore } from "../store/store";
import { useNav } from "../nav";
import { roomStats } from "../store/selectors";
import { Avatar } from "./Avatar";
import { IconSearch } from "./icons";

export function RightSidebar({ onOpenSwitcher }: { onOpenSwitcher: () => void }) {
  const { db, currentAuthor, myCharacters, myWorldAccounts, stepInto } = useStore();
  const { reset, push } = useNav();
  const [query, setQuery] = useState("");

  const stats = useMemo(
    () => (currentAuthor ? roomStats(db, currentAuthor.id) : null),
    [db, currentAuthor]
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const chars = myCharacters
      .filter(
        (c) =>
          c.displayName.toLowerCase().includes(q) ||
          c.handle.toLowerCase().includes(q) ||
          c.occupation.toLowerCase().includes(q) ||
          c.tags.some((t) => t.toLowerCase().includes(q))
      )
      .map((c) => ({ kind: "character" as const, item: c }));
    const worlds = myWorldAccounts
      .filter(
        (w) =>
          w.name.toLowerCase().includes(q) || w.handle.toLowerCase().includes(q)
      )
      .map((w) => ({ kind: "world" as const, item: w }));
    return [...chars, ...worlds].slice(0, 8);
  }, [query, myCharacters, myWorldAccounts]);

  const searching = query.trim().length > 0;

  return (
    <aside className="right-bar" aria-label="Discover">
      <div className="right-bar-inner">
        <div className="rb-search">
          <IconSearch size={18} />
          <input
            className="input"
            placeholder="Search your cast"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search your cast"
          />
        </div>

        {searching ? (
          <section className="rb-card">
            {results.length === 0 ? (
              <p className="dim serif" style={{ margin: 0 }}>
                No one in your cast matches “{query.trim()}”.
              </p>
            ) : (
              <div className="rb-results">
                {results.map((r) =>
                  r.kind === "character" ? (
                    <button
                      key={r.item.id}
                      className="rb-result"
                      onClick={() => {
                        stepInto(r.item.id);
                        reset({ name: "home" });
                        setQuery("");
                      }}
                      title={`Step into ${r.item.displayName}`}
                    >
                      <Avatar
                        name={r.item.displayName}
                        src={r.item.avatar}
                        accent={r.item.accentColor}
                        size={34}
                      />
                      <span className="rb-result-id">
                        <span className="serif name">{r.item.displayName}</span>
                        <span className="handle">@{r.item.handle}</span>
                      </span>
                    </button>
                  ) : (
                    <button
                      key={r.item.id}
                      className="rb-result"
                      onClick={() => {
                        push({ name: "profile", id: r.item.id });
                        setQuery("");
                      }}
                      title={`View ${r.item.name}`}
                    >
                      <Avatar
                        name={r.item.name}
                        src={r.item.avatar}
                        accent={r.item.accentColor}
                        size={34}
                      />
                      <span className="rb-result-id">
                        <span className="serif name">{r.item.name}</span>
                        <span className="handle">@{r.item.handle} · world</span>
                      </span>
                    </button>
                  )
                )}
              </div>
            )}
          </section>
        ) : (
          stats && (
            <section className="rb-card">
              <h3 className="rb-title serif">Wroom at a glance</h3>
              <div className="rb-stats">
                <div className="rb-stat">
                  <div className="rb-stat-n mono-num">{stats.characters}</div>
                  <div className="rb-stat-l">Characters</div>
                </div>
                <div className="rb-stat">
                  <div className="rb-stat-n mono-num">{stats.posts}</div>
                  <div className="rb-stat-l">Posts</div>
                </div>
                <div className="rb-stat">
                  <div className="rb-stat-n mono-num">{stats.worldAccounts}</div>
                  <div className="rb-stat-l">World</div>
                </div>
              </div>
              <button className="rb-more" onClick={onOpenSwitcher}>
                Switch character
              </button>
            </section>
          )
        )}
      </div>
    </aside>
  );
}
