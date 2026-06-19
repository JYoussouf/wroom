import { useMemo } from "react";
import { useStore } from "../store/store";
import { useNav } from "../nav";
import {
  accountName,
  incomingRelationshipRequests,
  otherSide,
  outgoingRelationshipRequests,
  resolveAccount,
} from "../store/selectors";
import { Avatar } from "../components/Avatar";
import { IconBack, IconSpark } from "../components/icons";

/**
 * Relationships: the consented, *typed* bonds across the author's cast — plus a
 * light follow-graph sketch underneath. A relationship is not a follow; it's a
 * named connection both characters acknowledge.
 */
export function GraphScreen() {
  const {
    db,
    myCharacters,
    currentAuthor,
    confirmRelationship,
    declineRelationship,
  } = useStore();
  const { back, push } = useNav();

  const size = 320;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 46;

  const requests = useMemo(
    () => (currentAuthor ? incomingRelationshipRequests(db, currentAuthor.id) : []),
    [db, currentAuthor]
  );
  const outgoing = useMemo(
    () => (currentAuthor ? outgoingRelationshipRequests(db, currentAuthor.id) : []),
    [db, currentAuthor]
  );

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

  // Accepted relationship edges between two of the author's own characters.
  const bondEdges = useMemo(() => {
    const charIds = new Set(myCharacters.map((c) => c.id));
    return db.relationships.filter(
      (r) => r.status === "accepted" && charIds.has(r.aId) && charIds.has(r.bId)
    );
  }, [db.relationships, myCharacters]);

  // All accepted bonds that touch the cast (incl. cross-author), for the list.
  const bonds = useMemo(() => {
    const charIds = new Set(myCharacters.map((c) => c.id));
    return db.relationships
      .filter((r) => r.status === "accepted" && (charIds.has(r.aId) || charIds.has(r.bId)))
      .sort((a, b) => (b.acceptedAt ?? b.createdAt) - (a.acceptedAt ?? a.createdAt));
  }, [db.relationships, myCharacters]);

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
          {/* Incoming requests awaiting confirmation */}
          {requests.length > 0 && (
            <>
              <div className="section-label" style={{ marginTop: 0 }}>
                Requests for you · {requests.length}
              </div>
              <div className="card" style={{ padding: "var(--s-2) var(--s-4)" }}>
                {requests.map((r) => {
                  const fromId = r.requestedBy;
                  const toId = otherSide(r, fromId);
                  const from = resolveAccount(db, fromId);
                  const to = resolveAccount(db, toId);
                  if (!from || !to) return null;
                  return (
                    <div key={r.id} className="request-row">
                      <Avatar
                        name={accountName(from)}
                        src={from.avatar}
                        accent={from.accentColor}
                        size={40}
                      />
                      <div className="request-body">
                        <div className="serif">
                          <strong>{accountName(from)}</strong> wants to connect with{" "}
                          <strong>{accountName(to)}</strong>
                        </div>
                        <div className="dim" style={{ fontSize: "var(--step--1)" }}>
                          as “{r.type}”
                        </div>
                      </div>
                      <div className="request-actions">
                        <button
                          className="btn btn-ghost"
                          onClick={() => declineRelationship(r.id)}
                        >
                          Decline
                        </button>
                        <button
                          className="btn btn-primary"
                          onClick={() => confirmRelationship(r.id)}
                        >
                          Confirm
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <p className="muted serif" style={{ textAlign: "center", marginTop: "var(--s-3)" }}>
            The named bonds across {currentAuthor?.name}'s cast.
          </p>

          {myCharacters.length < 2 ? (
            <div className="empty" style={{ marginTop: "var(--s-4)" }}>
              <div className="glyph">✶</div>
              <h3 className="serif">Not much of a web yet</h3>
              <p className="serif">
                Create a few characters, then open a profile and define how they
                know each other — a sister, a rival, an old flame.
              </p>
            </div>
          ) : (
            <div className="graph-wrap">
              <svg viewBox={`0 0 ${size} ${size}`} className="graph-svg">
                {bondEdges.map((e) => {
                  const a = pos.get(e.aId);
                  const b = pos.get(e.bId);
                  if (!a || !b) return null;
                  return (
                    <line
                      key={e.id}
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke="var(--accent)"
                      strokeWidth={1.6}
                      strokeOpacity={0.5}
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
                    ["--accent" as string]: n.c.accentColor,
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

          {/* The bonds, in words */}
          <div className="section-label">The bonds</div>
          {bonds.length === 0 ? (
            <p className="dim serif" style={{ padding: "var(--s-2) 0" }}>
              No relationships yet. Open a character's profile and define how they
              know someone — it's a named bond, not just a follow.
            </p>
          ) : (
            <div className="card" style={{ padding: "var(--s-2) var(--s-4)" }}>
              {bonds.map((r) => {
                const a = resolveAccount(db, r.aId);
                const b = resolveAccount(db, r.bId);
                if (!a || !b) return null;
                return (
                  <div key={r.id} className="bond-row">
                    <button className="who serif" onClick={() => push({ name: "profile", id: a.id })}>
                      {accountName(a)}
                    </button>
                    <span className="bond-type">
                      <IconSpark size={11} /> {r.type}
                    </span>
                    <button className="who serif" onClick={() => push({ name: "profile", id: b.id })}>
                      {accountName(b)}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {outgoing.length > 0 && (
            <p className="dim serif" style={{ marginTop: "var(--s-3)", fontSize: "var(--step--1)" }}>
              {outgoing.length} request{outgoing.length === 1 ? "" : "s"} you sent are
              waiting to be confirmed.
            </p>
          )}

          {/* Secondary: who follows whom (timelines run on follows) */}
          <div className="section-label">Who follows whom</div>
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
