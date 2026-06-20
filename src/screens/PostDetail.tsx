import { useMemo } from "react";
import { useStore } from "../store/store";
import { useNav } from "../nav";
import {
  ancestorsOf,
  getPost,
  repliesTo,
  resolveAccount,
} from "../store/selectors";
import { Avatar } from "../components/Avatar";
import { PostCard } from "../components/PostCard";
import { RichText } from "../components/RichText";
import {
  IconBack,
  IconHeart,
  IconHeartFill,
  IconReply,
  IconRepost,
} from "../components/icons";
import { fullTime } from "../lib/time";

export function PostDetail({ id }: { id: string }) {
  const { db, activeCharacterId, toggleLike, toggleRepost } = useStore();
  const { back, push } = useNav();

  const post = getPost(db, id);
  const ancestors = useMemo(() => ancestorsOf(db, id), [db, id]);
  const replies = useMemo(() => repliesTo(db, id), [db, id]);

  if (!post) {
    return (
      <div className="app-scroll">
        <div className="screen-pad">
          <button className="btn" onClick={back}>
            ← Back
          </button>
          <p className="muted serif" style={{ marginTop: "var(--s-4)" }}>
            This post is gone.
          </p>
        </div>
      </div>
    );
  }

  const author = resolveAccount(db, post.characterId);
  const name = author
    ? author.kind === "character"
      ? author.displayName
      : author.name
    : "Unknown";
  const accent = author?.accentColor ?? "var(--accent)";
  const liked = activeCharacterId ? post.likedBy.includes(activeCharacterId) : false;
  const reposted = activeCharacterId
    ? post.repostedBy.includes(activeCharacterId)
    : false;

  return (
    <>
      <header className="topbar">
        <div className="row spread center">
          <button className="icon-btn" aria-label="Back" onClick={back}>
            <IconBack />
          </button>
          <div className="bar-title" style={{ fontSize: "var(--step-1)" }}>
            Thread
          </div>
          <span style={{ width: 40 }} />
        </div>
      </header>

      <div className="app-scroll" style={{ ["--accent" as string]: accent }}>
        <div className="screen-pad">
          {/* Ancestor context */}
          {ancestors.map((a) => (
            <PostCard key={a.id} post={a} threadLineBottom />
          ))}

          {/* The focused post, given room to breathe */}
          <article className="post-focus" style={{ ["--accent" as string]: accent }}>
            <button
              className="row gap-3 center"
              onClick={() => push({ name: "profile", id: post.characterId })}
              style={{ background: "none", border: "none", padding: 0, color: "inherit", textAlign: "left" }}
            >
              <Avatar name={name} src={author?.avatar} accent={accent} size={48} />
              <div>
                <div className="serif" style={{ fontSize: "var(--step-1)", fontWeight: 600 }}>
                  {name}
                </div>
                <div className="handle">@{author?.handle}</div>
              </div>
            </button>

            <p className="post-focus-body serif"><RichText text={post.body} /></p>

            <div className="dim" style={{ fontSize: "var(--step--1)", marginTop: "var(--s-2)" }}>
              {fullTime(post.createdAt)}
            </div>

            {(post.likedBy.length > 0 || post.repostedBy.length > 0) && (
              <div className="post-focus-stats mono-num">
                {post.repostedBy.length > 0 && (
                  <span>
                    <strong>{post.repostedBy.length}</strong>{" "}
                    {post.repostedBy.length === 1 ? "repost" : "reposts"}
                  </span>
                )}
                {post.likedBy.length > 0 && (
                  <span>
                    <strong>{post.likedBy.length}</strong>{" "}
                    {post.likedBy.length === 1 ? "like" : "likes"}
                  </span>
                )}
              </div>
            )}

            <div className="post-focus-actions">
              <button
                className="post-action"
                onClick={() => push({ name: "compose", replyTo: post.id })}
                disabled={!activeCharacterId}
              >
                <IconReply size={20} /> Reply
              </button>
              <button
                className={`post-action ${reposted ? "on-repost" : ""}`}
                disabled={!activeCharacterId}
                onClick={() => activeCharacterId && toggleRepost(post.id, activeCharacterId)}
                aria-pressed={reposted}
              >
                <IconRepost size={20} />
              </button>
              <button
                className={`post-action ${liked ? "on-like" : ""}`}
                disabled={!activeCharacterId}
                onClick={() => activeCharacterId && toggleLike(post.id, activeCharacterId)}
                aria-pressed={liked}
              >
                {liked ? <IconHeartFill size={20} /> : <IconHeart size={20} />}
              </button>
            </div>
          </article>

          {/* Reply composer entry */}
          {activeCharacterId && (
            <button
              className="reply-entry"
              onClick={() => push({ name: "compose", replyTo: post.id })}
            >
              <IconReply size={18} /> Reply as the active character…
            </button>
          )}

          {/* Replies */}
          <div className="section-label">
            {replies.length} {replies.length === 1 ? "reply" : "replies"}
          </div>
          <div className="timeline">
            {replies.map((r) => (
              <PostCard key={r.id} post={r} />
            ))}
            {replies.length === 0 && (
              <p className="muted serif" style={{ textAlign: "center", padding: "var(--s-5)" }}>
                No replies yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
