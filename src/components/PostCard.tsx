import type { Post } from "../types";
import { useStore } from "../store/store";
import { useNav } from "../nav";
import { resolveAccount } from "../store/selectors";
import { relativeTime } from "../lib/time";
import { Avatar } from "./Avatar";
import {
  IconHeart,
  IconHeartFill,
  IconReply,
  IconRepost,
} from "./icons";

interface Props {
  post: Post;
  /** Hide the connecting thread line / make it a leaf in a conversation. */
  threadLineTop?: boolean;
  threadLineBottom?: boolean;
  emphasis?: boolean;
}

/** A single post, rendered with the same editorial type used for writing. */
export function PostCard({ post, threadLineTop, threadLineBottom, emphasis }: Props) {
  const { db, activeCharacterId, toggleLike, toggleRepost, flashPostId } =
    useStore();
  const { push } = useNav();
  const author = resolveAccount(db, post.characterId);
  if (!author) return null;

  const name = author.kind === "character" ? author.displayName : author.name;
  const accent = author.accentColor;
  const liked = activeCharacterId ? post.likedBy.includes(activeCharacterId) : false;
  const reposted = activeCharacterId
    ? post.repostedBy.includes(activeCharacterId)
    : false;
  const replyCount = db.posts.filter((p) => p.parentPostId === post.id).length;

  function openDetail() {
    push({ name: "post", id: post.id });
  }
  function openAuthor(e: React.MouseEvent) {
    e.stopPropagation();
    push({ name: "profile", id: post.characterId });
  }

  return (
    <article
      className={`post ${emphasis ? "post-emphasis" : ""} ${
        flashPostId === post.id ? "post-flash" : ""
      }`}
      onClick={openDetail}
      style={{ ["--accent" as string]: accent }}
    >
      <div className="post-rail">
        {threadLineTop && <span className="thread-line top" />}
        <button className="post-avatar" onClick={openAuthor} aria-label={name} tabIndex={-1}>
          <Avatar name={name} src={author.avatar} accent={accent} size={42} />
        </button>
        {threadLineBottom && <span className="thread-line bottom" />}
      </div>

      <div className="post-main">
        <div className="post-head">
          <button className="post-name serif" onClick={openAuthor}>
            {name}
          </button>
          <span className="handle">@{author.handle}</span>
          {author.kind === "world" && <span className="pill tiny">world</span>}
          <span className="dim post-dot">·</span>
          <span className="dim" title={new Date(post.createdAt).toLocaleString()}>
            {relativeTime(post.createdAt)}
          </span>
        </div>

        <p className="post-body serif">{post.body}</p>

        <div className="post-actions" onClick={(e) => e.stopPropagation()}>
          <button
            className="post-action"
            onClick={openDetail}
            aria-label={`Reply — ${replyCount} replies`}
          >
            <IconReply size={18} />
            {replyCount > 0 && <span className="mono-num">{replyCount}</span>}
          </button>
          <button
            className={`post-action ${reposted ? "on-repost" : ""}`}
            disabled={!activeCharacterId}
            onClick={() => activeCharacterId && toggleRepost(post.id, activeCharacterId)}
            aria-pressed={reposted}
            aria-label="Repost within wroom"
          >
            <IconRepost size={18} />
            {post.repostedBy.length > 0 && (
              <span className="mono-num">{post.repostedBy.length}</span>
            )}
          </button>
          <button
            className={`post-action ${liked ? "on-like" : ""}`}
            disabled={!activeCharacterId}
            onClick={() => activeCharacterId && toggleLike(post.id, activeCharacterId)}
            aria-pressed={liked}
            aria-label="Like"
          >
            {liked ? <IconHeartFill size={18} /> : <IconHeart size={18} />}
            {post.likedBy.length > 0 && (
              <span className="mono-num">{post.likedBy.length}</span>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
