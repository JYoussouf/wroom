import { useMemo, useState } from "react";
import { useStore } from "../store/store";
import { useNav } from "../nav";
import { wroomFeed, homeTimeline } from "../store/selectors";
import { Avatar } from "../components/Avatar";
import { PostCard } from "../components/PostCard";
import { IconSpark } from "../components/icons";

type Tab = "foryou" | "following";

export function FeedScreen({ onOpenSwitcher }: { onOpenSwitcher: () => void }) {
  const { db, currentAuthor, activeCharacter, myCharacters } = useStore();
  const { push } = useNav();
  const [tab, setTab] = useState<Tab>("foryou");
  const hasCast = myCharacters.length > 0;

  const forYou = useMemo(
    () => (currentAuthor ? wroomFeed(db, currentAuthor.id) : []),
    [db, currentAuthor]
  );
  const following = useMemo(
    () => (activeCharacter ? homeTimeline(db, activeCharacter.id) : []),
    [db, activeCharacter]
  );

  const posts = tab === "foryou" ? forYou : following;

  function compose() {
    if (activeCharacter) push({ name: "compose" });
    else if (!hasCast) push({ name: "character-new" });
    else onOpenSwitcher();
  }

  const composerName = activeCharacter?.displayName.split(" ")[0];

  return (
    <>
      <header className="topbar feed-topbar">
        <div className="feed-tabs" role="tablist" aria-label="Timeline">
          <button
            role="tab"
            aria-selected={tab === "foryou"}
            className={`feed-tab ${tab === "foryou" ? "on" : ""}`}
            onClick={() => setTab("foryou")}
          >
            <span>For you</span>
          </button>
          <button
            role="tab"
            aria-selected={tab === "following"}
            className={`feed-tab ${tab === "following" ? "on" : ""}`}
            onClick={() => setTab("following")}
          >
            <span>Following</span>
          </button>
        </div>
      </header>

      <div className="app-scroll">
        <div className="feed-body fade-in">
          {/* Composer entry — always in the active character's voice. */}
          <button className="feed-composer" onClick={compose}>
            <Avatar
              name={activeCharacter?.displayName ?? currentAuthor?.name ?? "You"}
              src={activeCharacter?.avatar ?? currentAuthor?.avatar}
              accent={activeCharacter?.accentColor ?? "var(--accent)"}
              size={44}
            />
            <span className="feed-composer-text serif">
              {activeCharacter
                ? `What's on ${composerName}'s mind?`
                : hasCast
                  ? "Step into a character to write…"
                  : "Invent your first character to begin…"}
            </span>
            <span className="feed-composer-btn btn btn-primary">
              {activeCharacter || hasCast ? "Post" : "Create"}
            </span>
          </button>

          {posts.length === 0 ? (
            <div className="empty" style={{ margin: "var(--s-4)" }}>
              <div className="glyph">✶</div>
              <h3 className="serif">
                {tab === "following" && !activeCharacter
                  ? "No one stepped in"
                  : "A quiet timeline"}
              </h3>
              <p className="serif">
                {tab === "following" && !activeCharacter
                  ? "Step into one of your characters to see the world through their eyes — the people they follow appear here."
                  : myCharacters.length === 0
                    ? "Invent your first character and write their opening line."
                    : "Nothing has been written yet. Step into a character and post the first line."}
              </p>
              <button className="btn btn-primary" onClick={compose}>
                {activeCharacter
                  ? "Write a post"
                  : hasCast
                    ? "Choose a character"
                    : "Create your first character"}
              </button>
            </div>
          ) : (
            <div className="timeline">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
              <p className="dim timeline-end serif">
                <IconSpark size={12} /> Everything here is invented fiction.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
