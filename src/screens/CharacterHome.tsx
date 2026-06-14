import { useMemo } from "react";
import { useStore } from "../store/store";
import { useNav } from "../nav";
import { homeTimeline } from "../store/selectors";
import { Avatar } from "../components/Avatar";
import { IdentityChip } from "../components/IdentityChip";
import { PostCard } from "../components/PostCard";
import { IconSpark } from "../components/icons";

export function CharacterHome({ onOpenSwitcher }: { onOpenSwitcher: () => void }) {
  const { db, activeCharacter } = useStore();
  const { push } = useNav();

  const timeline = useMemo(
    () => (activeCharacter ? homeTimeline(db, activeCharacter.id) : []),
    [db, activeCharacter]
  );

  if (!activeCharacter) return null;
  const c = activeCharacter;

  return (
    <>
      {/* One-shot accent wash plays when stepping in — keyed per character. */}
      <div key={`flash-${c.id}`} className="step-flash" aria-hidden />

      <header className="topbar">
        <div className="row spread center">
          <IdentityChip character={c} onClick={onOpenSwitcher} />
          <span className="fiction-tag">
            <IconSpark size={12} /> Fiction
          </span>
        </div>
      </header>

      <div className="app-scroll" key={c.id}>
        <div className="screen-pad step-enter">
          {/* Compose entry — always shows whose voice you're in. */}
          <button className="compose-entry" onClick={() => push({ name: "compose" })}>
            <Avatar name={c.displayName} src={c.avatar} accent={c.accentColor} size={42} />
            <div className="compose-entry-text">
              <span className="serif placeholder">
                What's on {c.displayName.split(" ")[0]}'s mind?
              </span>
              {c.voiceNote && <span className="voice-hint">“{c.voiceNote}”</span>}
            </div>
          </button>

          {timeline.length === 0 ? (
            <div className="empty" style={{ marginTop: "var(--s-4)" }}>
              <div className="glyph">✶</div>
              <h3 className="serif">A quiet timeline</h3>
              <p className="serif">
                {c.displayName} hasn't spoken yet, and follows no one with anything
                to say. Write their first line — or step out and have someone they
                follow post.
              </p>
              <button className="btn btn-primary" onClick={() => push({ name: "compose" })}>
                Write the first post
              </button>
            </div>
          ) : (
            <div className="timeline">
              {timeline.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
              <p className="dim timeline-end serif">
                You're all caught up in {c.displayName}'s world.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
