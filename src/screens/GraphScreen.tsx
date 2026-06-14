import { useMemo } from "react";
import { useStore } from "../store/store";
import { useNav } from "../nav";
import { Avatar } from "../components/Avatar";
import { IconBack } from "../components/icons";

/**
 * A light relationship sketch: the author's cast arranged on a ring with lines
 * for the follows between them. Optional and never blocking — a delight, not a
 * dependency.
 */
export function GraphScreen() {
  const { db, myCharacters, currentAuthor } = useStore();
  const { back, push } = useNav();

  const size = 320;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 46;

  const nodes = useMemo(() => {
    const n = myCharacters.length;
    return myCharacters.map((c, i) => {
      const angle = (i / Math.max(1, n)) * Math.PI * 2 - Math.PI / 2;
      return {
        c,
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
      };
    });
  }, [myCharacters, cx, cy, radius]);

  const pos = useMemo(() => {
    const m = new Map<string, { x: number; y: number }>();
    nodes.forEach((n) => m.set(n.c.id, { x: n.x, y: n.y }));
    return m;
  }, [nodes]);

  // Edges only between characters (world accounts aren't on the ring).
  const edges = useMemo(() => {
    const charIds = new Set(myCharacters.map((c) => c.id));
    return db.follows.filter(
      (f) => charIds.has(f.followerId) && charIds.has(f.followeeId)
    );
  }, [db.follows, myCharacters]);

  return (
    <>
      <header className="topbar">
        <div className="row spread center">
          <button className="icon-btn" aria-label="Back" onClick={back}>
            <IconBack />
          </button>
          <div className="bar-title" style={{ fontSize: "var(--step-1)" }}>
            Relationships
          </div>
          <span style={{ width: 40 }} />
        </div>
      </header>

      <div className="app-scroll">
        <div className="screen-pad">
          <p className="muted serif" style={{ textAlign: "center" }}>
            Who follows whom across {currentAuthor?.name}'s cast.
          </p>

          {myCharacters.length < 2 ? (
            <div className="empty" style={{ marginTop: "var(--s-4)" }}>
              <div className="glyph">✶</div>
              <h3 className="serif">Not much of a web yet</h3>
              <p className="serif">
                Create a few characters and have them follow each other to see the
                shape of your world.
              </p>
            </div>
          ) : (
            <div className="graph-wrap">
              <svg viewBox={`0 0 ${size} ${size}`} className="graph-svg">
                {edges.map((e) => {
                  const a = pos.get(e.followerId);
                  const b = pos.get(e.followeeId);
                  if (!a || !b) return null;
                  return (
                    <line
                      key={e.id}
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke="var(--hairline-strong)"
                      strokeWidth={1.4}
                    />
                  );
                })}
              </svg>
              {nodes.map((n) => (
                <button
                  key={n.c.id}
                  className="graph-node"
                  style={{
                    left: `${(n.x / size) * 100}%`,
                    top: `${(n.y / size) * 100}%`,
                  }}
                  onClick={() => push({ name: "profile", id: n.c.id })}
                  title={`${n.c.displayName} (@${n.c.handle})`}
                >
                  <Avatar
                    name={n.c.displayName}
                    src={n.c.avatar}
                    accent={n.c.accentColor}
                    size={46}
                    ring
                  />
                  <span className="graph-label">{n.c.displayName.split(" ")[0]}</span>
                </button>
              ))}
            </div>
          )}

          {/* Plain-language fallback: a connected list. */}
          <div className="section-label">Follow list</div>
          <div className="card" style={{ padding: "var(--s-3) var(--s-4)" }}>
            {myCharacters.map((c) => {
              const targets = db.follows
                .filter((f) => f.followerId === c.id)
                .map((f) => db.characters.find((x) => x.id === f.followeeId) ?? db.worldAccounts.find((x) => x.id === f.followeeId))
                .filter(Boolean);
              return (
                <div key={c.id} className="graph-list-row">
                  <button className="who serif" onClick={() => push({ name: "profile", id: c.id })}>
                    {c.displayName}
                  </button>
                  <span className="dim">
                    {targets.length === 0
                      ? "follows no one"
                      : "follows " +
                        targets
                          .map((t) => (t && "displayName" in t ? t.displayName : t?.name))
                          .join(", ")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
