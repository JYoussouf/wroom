import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../store/store";
import { useNav } from "../nav";
import { getPost, resolveAccount } from "../store/selectors";
import { Avatar } from "../components/Avatar";
import { CharCountRing } from "../components/CharCountRing";
import { IconClose, IconSpark, IconThread, IconTrash } from "../components/icons";

export function ComposeScreen({ replyTo }: { replyTo?: string }) {
  const {
    db,
    currentAuthor,
    activeCharacter,
    createPost,
    getDraft,
    setDraft,
    clearDraft,
    flashPost,
    showToast,
  } = useStore();
  const { back, reset } = useNav();
  const taRef = useRef<HTMLTextAreaElement>(null);

  const c = activeCharacter;
  const limit =
    c?.postLimit ?? currentAuthor?.settings.defaultPostLimit ?? 280;
  const useSerif = currentAuthor?.settings.composerFont !== "sans";
  const autosave = currentAuthor?.settings.autosave ?? true;

  const draftKey = useMemo(
    () => (c ? (replyTo ? `reply:${c.id}:${replyTo}` : `compose:${c.id}`) : ""),
    [c, replyTo]
  );

  const [text, setText] = useState(() => (draftKey ? getDraft(draftKey) : ""));
  const [segments, setSegments] = useState<string[]>([]);
  const [savedFlash, setSavedFlash] = useState(false);

  // Focus + autosize on mount.
  useEffect(() => {
    const el = taRef.current;
    if (el) {
      el.focus();
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    }
  }, []);

  // Continuous, per-character draft autosave.
  useEffect(() => {
    if (!autosave || !draftKey) return;
    const id = window.setTimeout(() => {
      if (text.trim()) {
        setDraft(draftKey, text);
        setSavedFlash(true);
        window.setTimeout(() => setSavedFlash(false), 900);
      } else {
        clearDraft(draftKey);
      }
    }, 400);
    return () => window.clearTimeout(id);
  }, [text, autosave, draftKey, setDraft, clearDraft]);

  if (!c) {
    return (
      <div className="app-scroll">
        <div className="screen-pad">
          <p className="muted serif">Step into a character to write in their voice.</p>
          <button className="btn" onClick={back}>
            Back
          </button>
        </div>
      </div>
    );
  }

  const parent = replyTo ? getPost(db, replyTo) : null;
  const parentAuthor = parent ? resolveAccount(db, parent.characterId) : null;

  const count = text.length;
  const over = count > limit;
  const hasContent = text.trim().length > 0;
  const canPost = (segments.length > 0 || hasContent) && !over;
  const isThread = segments.length > 0;

  function onChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }

  /** Wrap the current textarea selection (or caret) in markup delimiters. */
  function applyFormat(before: string, after: string) {
    const el = taRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = text.slice(start, end);
    const next = text.slice(0, start) + before + selected + after + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + before.length;
      el.setSelectionRange(pos, pos + selected.length);
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    });
  }

  function addToThread() {
    if (!hasContent || over) return;
    setSegments((s) => [...s, text.trim()]);
    setText("");
    requestAnimationFrame(() => {
      const el = taRef.current;
      if (el) {
        el.style.height = "auto";
        el.focus();
      }
    });
  }

  function removeSegment(i: number) {
    setSegments((s) => s.filter((_, idx) => idx !== i));
  }

  function publish() {
    if (!canPost || !c) return;
    const all = [...segments];
    if (hasContent) all.push(text.trim());
    if (all.length === 0) return;

    if (replyTo) {
      const post = createPost({ characterId: c.id, body: all[0], parentPostId: replyTo });
      flashPost(post.id);
      clearDraft(draftKey);
      showToast("Reply posted ✦");
      back();
      return;
    }

    if (all.length === 1) {
      const post = createPost({ characterId: c.id, body: all[0] });
      flashPost(post.id);
    } else {
      const root = createPost({ characterId: c.id, body: all[0] });
      let prev = root.id;
      for (let i = 1; i < all.length; i++) {
        const child = createPost({
          characterId: c.id,
          body: all[i],
          parentPostId: prev,
          threadId: root.id,
        });
        prev = child.id;
      }
      flashPost(root.id);
    }
    clearDraft(draftKey);
    showToast(all.length > 1 ? "Thread posted ✦" : "Posted ✦");
    reset({ name: "home" });
  }

  return (
    <>
      <header className="topbar">
        <div className="row spread center">
          <button className="icon-btn" aria-label="Close" onClick={back}>
            <IconClose />
          </button>
          <div className="row gap-2 center">
            {autosave && savedFlash && (
              <span className="dim" style={{ fontSize: "0.7rem" }}>
                Draft saved
              </span>
            )}
            <button className="btn btn-primary" disabled={!canPost} onClick={publish}>
              {replyTo ? "Reply" : isThread ? "Post thread" : "Post"}
            </button>
          </div>
        </div>
      </header>

      <div className="app-scroll">
        <div className="compose-screen">
          {parent && parentAuthor && (
            <div className="reply-context">
              <Avatar
                name={parentAuthor.kind === "character" ? parentAuthor.displayName : parentAuthor.name}
                src={parentAuthor.avatar}
                accent={parentAuthor.accentColor}
                size={34}
              />
              <div className="reply-context-body">
                <div className="row gap-1 center">
                  <span className="serif" style={{ fontWeight: 600 }}>
                    {parentAuthor.kind === "character" ? parentAuthor.displayName : parentAuthor.name}
                  </span>
                  <span className="handle">@{parentAuthor.handle}</span>
                </div>
                <p className="serif dim reply-context-text">{parent.body}</p>
              </div>
            </div>
          )}

          {/* Already-added thread segments */}
          {segments.map((seg, i) => (
            <div className="thread-segment" key={i}>
              <div className="post-rail" style={{ ["--accent" as string]: c.accentColor }}>
                <Avatar name={c.displayName} src={c.avatar} accent={c.accentColor} size={42} />
                <span className="thread-line bottom" style={{ top: 42, bottom: -10 }} />
              </div>
              <div className="thread-segment-body">
                <div className="row spread center">
                  <span className="handle-strong">@{c.handle}</span>
                  <button
                    className="icon-btn"
                    style={{ width: 30, height: 30 }}
                    onClick={() => removeSegment(i)}
                    aria-label="Remove from thread"
                  >
                    <IconTrash size={15} />
                  </button>
                </div>
                <p className="serif" style={{ whiteSpace: "pre-wrap", margin: "2px 0 0" }}>
                  {seg}
                </p>
              </div>
            </div>
          ))}

          {/* Active composer */}
          <div className="compose-row" style={{ ["--accent" as string]: c.accentColor }}>
            <Avatar name={c.displayName} src={c.avatar} accent={c.accentColor} size={42} />
            <div className="compose-field-wrap">
              <textarea
                ref={taRef}
                className={`compose-field ${useSerif ? "serif" : ""}`}
                value={text}
                onChange={onChange}
                placeholder={
                  replyTo
                    ? "Write your reply…"
                    : isThread
                    ? "Continue the thread…"
                    : `Say something as ${c.displayName.split(" ")[0]}…`
                }
                aria-label="Compose post"
              />
            </div>
          </div>

          <div className="fmt-bar">
            <button
              type="button"
              className="fmt-btn"
              aria-label="Bold"
              title="Bold"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyFormat("**", "**")}
            >
              <span className="b">B</span>
            </button>
            <button
              type="button"
              className="fmt-btn"
              aria-label="Italic"
              title="Italic"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyFormat("*", "*")}
            >
              <span className="i">I</span>
            </button>
            <button
              type="button"
              className="fmt-btn"
              aria-label="Strikethrough"
              title="Strikethrough"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyFormat("~~", "~~")}
            >
              <span className="s">S</span>
            </button>
            <span className="fmt-hint">
              <code>**bold**</code> <code>*italic*</code> <code>~~strike~~</code>
            </span>
          </div>

          <div className="compose-voice">
            <IconSpark size={13} />
            {c.voiceNote ? (
              <span>
                Writing as <strong>@{c.handle}</strong> — “{c.voiceNote}”
              </span>
            ) : (
              <span>
                Writing as <strong>@{c.handle}</strong>
              </span>
            )}
          </div>

          <div className="compose-toolbar">
            {!replyTo && (
              <button
                className="btn btn-ghost"
                onClick={addToThread}
                disabled={!hasContent || over}
              >
                <IconThread size={18} /> Add to thread
              </button>
            )}
            <div className="grow" />
            <CharCountRing count={count} limit={limit} />
          </div>
        </div>
      </div>
    </>
  );
}
