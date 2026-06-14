import { useMemo, useState } from "react";
import { useStore } from "../store/store";
import { useNav } from "../nav";
import {
  followerCount,
  followingCount,
  postCount,
  profilePosts,
  profileTimeline,
  resolveAccount,
} from "../store/selectors";
import { gradientBanner } from "../lib/avatars";
import { Avatar } from "../components/Avatar";
import { PostCard } from "../components/PostCard";
import { PrivacyBadge } from "../components/PrivacyBadge";
import { IconBack, IconExport, IconSpark } from "../components/icons";

export function CharacterProfile({ id }: { id: string }) {
  const { db, activeCharacterId, isFollowing, toggleFollow } = useStore();
  const { back, push } = useNav();
  const [tab, setTab] = useState<"posts" | "replies">("posts");

  const acc = resolveAccount(db, id);
  if (!acc) {
    return (
      <div className="app-scroll">
        <div className="screen-pad">
          <button className="btn" onClick={back}>
            ← Back
          </button>
          <p className="muted serif" style={{ marginTop: "var(--s-4)" }}>
            This account no longer exists.
          </p>
        </div>
      </div>
    );
  }

  const name = acc.kind === "character" ? acc.displayName : acc.name;
  const accent = acc.accentColor;
  const banner =
    acc.kind === "character" && acc.banner
      ? `url(${acc.banner}) center/cover`
      : gradientBanner(accent);

  const posts = useMemo(() => profilePosts(db, id), [db, id]);
  const all = useMemo(() => profileTimeline(db, id), [db, id]);
  const replies = useMemo(() => all.filter((p) => p.parentPostId), [all]);
  const shown = tab === "posts" ? posts : replies;

  const isSelf = id === activeCharacterId;
  const isMineToEdit = acc.kind === "character" && acc.authorId === db.session.authorId;
  const following = activeCharacterId ? isFollowing(activeCharacterId, id) : false;

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

      <div className="app-scroll" style={{ ["--accent" as string]: accent }}>
        <div className="profile-banner" style={{ background: banner }} />
        <div className="screen-pad" style={{ paddingTop: 0 }}>
          <div className="profile-head">
            <div className="profile-avatar">
              <Avatar name={name} src={acc.avatar} accent={accent} size={84} ring />
            </div>
            <div className="profile-actions">
              {isMineToEdit && (
                <button className="btn" onClick={() => push({ name: "character-edit", id })}>
                  Edit
                </button>
              )}
              {acc.kind === "character" && acc.privacy === "shareable" && (
                <button className="btn" onClick={() => push({ name: "share", id })}>
                  <IconExport size={16} /> Share
                </button>
              )}
              {activeCharacterId && !isSelf && (
                <button
                  className={`btn ${following ? "" : "btn-primary"}`}
                  onClick={() => toggleFollow(activeCharacterId, id)}
                >
                  {following ? "Following" : "Follow"}
                </button>
              )}
            </div>
          </div>

          <div className="row gap-2 center" style={{ marginTop: "var(--s-2)" }}>
            <h1 className="serif" style={{ fontSize: "var(--step-3)" }}>
              {name}
            </h1>
            {acc.kind === "character" ? (
              <PrivacyBadge privacy={acc.privacy} />
            ) : (
              <span className="pill">world account</span>
            )}
          </div>
          <div className="handle" style={{ fontSize: "var(--step-0)" }}>
            @{acc.handle}
          </div>

          {acc.kind === "character" && (
            <>
              {acc.bio && (
                <p className="serif" style={{ marginTop: "var(--s-3)", fontSize: "var(--step-1)" }}>
                  {acc.bio}
                </p>
              )}
              {[acc.pronouns, acc.occupation, acc.location, acc.eraTag].filter(Boolean)
                .length > 0 && (
                <div className="flavor-row">
                  {[acc.pronouns, acc.occupation, acc.location, acc.eraTag]
                    .filter(Boolean)
                    .map((f) => (
                      <span key={f} className="pill">
                        {f}
                      </span>
                    ))}
                </div>
              )}
              {acc.voiceNote && (
                <p
                  className="serif"
                  style={{
                    marginTop: "var(--s-3)",
                    color: "var(--accent)",
                    fontStyle: "italic",
                  }}
                >
                  <IconSpark size={13} /> “{acc.voiceNote}”
                </p>
              )}
            </>
          )}

          <div className="profile-counts">
            <button onClick={() => push({ name: "connections", id, tab: "following" })}>
              <strong className="mono-num">{followingCount(db, id)}</strong> Following
            </button>
            <button onClick={() => push({ name: "connections", id, tab: "followers" })}>
              <strong className="mono-num">{followerCount(db, id)}</strong> Followers
            </button>
            <span className="dim">
              <strong className="mono-num" style={{ color: "var(--ink)" }}>
                {postCount(db, id)}
              </strong>{" "}
              Posts
            </span>
          </div>

          {acc.kind === "character" && (
            <div className="seg" style={{ marginTop: "var(--s-4)" }}>
              <button
                className={tab === "posts" ? "on" : ""}
                onClick={() => setTab("posts")}
              >
                Posts
              </button>
              <button
                className={tab === "replies" ? "on" : ""}
                onClick={() => setTab("replies")}
              >
                Replies
              </button>
            </div>
          )}

          <div className="timeline" style={{ marginTop: "var(--s-3)" }}>
            {shown.length === 0 ? (
              <p className="muted serif" style={{ textAlign: "center", padding: "var(--s-6)" }}>
                {acc.kind === "world"
                  ? "A world account — set dressing for someone else's timeline."
                  : tab === "posts"
                  ? `${name} hasn't posted yet.`
                  : `${name} hasn't replied to anyone yet.`}
              </p>
            ) : (
              shown.map((post) => <PostCard key={post.id} post={post} />)
            )}
          </div>
        </div>
      </div>
    </>
  );
}
