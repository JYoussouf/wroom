import { useMemo, useState } from "react";
import { useStore } from "../store/store";
import { useNav } from "../nav";
import type { Account } from "../types";
import {
  followerIds,
  followingIds,
  resolveAccount,
} from "../store/selectors";
import { AccountRow } from "../components/AccountRow";
import { NewWorldAccountSheet } from "../components/NewWorldAccountSheet";
import { IconBack, IconPlus } from "../components/icons";

export function ConnectionsScreen({
  id,
  tab,
}: {
  id: string;
  tab: "followers" | "following";
}) {
  const { db, activeCharacterId, myCharacters, myWorldAccounts, toggleFollow } =
    useStore();
  const { back } = useNav();
  const [active, setActive] = useState(tab);
  const [worldSheet, setWorldSheet] = useState(false);

  const subject = resolveAccount(db, id);
  const name = subject
    ? subject.kind === "character"
      ? subject.displayName
      : subject.name
    : "Account";

  const list = useMemo<Account[]>(() => {
    const ids = active === "followers" ? followerIds(db, id) : followingIds(db, id);
    return ids
      .map((x) => resolveAccount(db, x))
      .filter((a): a is Account => a !== null);
  }, [db, id, active]);

  // Discovery: accounts the active character could follow but doesn't yet.
  const isOwn = id === activeCharacterId;
  const discover = useMemo<Account[]>(() => {
    if (!activeCharacterId || !isOwn || active !== "following") return [];
    const followed = new Set(followingIds(db, activeCharacterId));
    const all: Account[] = [
      ...myCharacters.map((c) => ({ ...c, kind: "character" as const })),
      ...myWorldAccounts.map((w) => ({ ...w, kind: "world" as const })),
    ];
    return all.filter((a) => a.id !== activeCharacterId && !followed.has(a.id));
  }, [db, activeCharacterId, isOwn, active, myCharacters, myWorldAccounts]);

  return (
    <>
      <header className="topbar">
        <div className="row spread center">
          <button className="icon-btn" aria-label="Back" onClick={back}>
            <IconBack />
          </button>
          <div className="bar-title" style={{ fontSize: "var(--step-1)" }}>
            {name}
          </div>
          <span style={{ width: 40 }} />
        </div>
      </header>

      <div className="app-scroll">
        <div className="screen-pad">
          <div className="seg" style={{ marginBottom: "var(--s-4)" }}>
            <button
              className={active === "following" ? "on" : ""}
              onClick={() => setActive("following")}
            >
              Following
            </button>
            <button
              className={active === "followers" ? "on" : ""}
              onClick={() => setActive("followers")}
            >
              Readers
            </button>
          </div>

          {list.length === 0 ? (
            <p className="muted serif" style={{ textAlign: "center", padding: "var(--s-5)" }}>
              {active === "followers"
                ? `No one reads ${name} yet.`
                : `${name} isn't following anyone yet.`}
            </p>
          ) : (
            <div className="account-list">
              {list.map((a) => (
                <AccountRow key={a.id} account={a} />
              ))}
            </div>
          )}

          {isOwn && active === "following" && (
            <>
              <div className="row spread center" style={{ marginTop: "var(--s-5)" }}>
                <div className="section-label" style={{ margin: 0 }}>
                  Add to {name}'s world
                </div>
                <button className="btn btn-ghost" onClick={() => setWorldSheet(true)}>
                  <IconPlus size={16} /> World account
                </button>
              </div>
              {discover.length === 0 ? (
                <p className="dim serif" style={{ padding: "var(--s-3) 0" }}>
                  {name} already follows everyone in your wroom. Sketch a world
                  account to widen their world.
                </p>
              ) : (
                <div className="account-list">
                  {discover.map((a) => (
                    <AccountRow key={a.id} account={a} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <NewWorldAccountSheet
        open={worldSheet}
        onClose={() => setWorldSheet(false)}
        onCreated={(wid) => {
          if (activeCharacterId && isOwn) toggleFollow(activeCharacterId, wid);
        }}
      />
    </>
  );
}
