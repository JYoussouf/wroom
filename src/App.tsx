import { useStore } from "./store/store";
import { roomStats } from "./store/selectors";

export default function App() {
  const { db, currentAuthor } = useStore();
  const authorId = currentAuthor?.id ?? db.authors[0]?.id;
  const stats = authorId ? roomStats(db, authorId) : null;

  return (
    <div className="app-scroll">
      <div className="screen-pad fade-in">
        <h1 style={{ fontSize: "var(--step-4)" }}>Writer's Room</h1>
        <p className="muted serif" style={{ fontSize: "var(--step-1)" }}>
          Data layer online. Seeded room ready.
        </p>
        {stats && (
          <p className="dim" style={{ marginTop: "var(--s-4)" }}>
            {stats.characters} characters · {stats.posts} posts ·{" "}
            {stats.worldAccounts} world accounts · {stats.follows} follows
          </p>
        )}
        <span className="fiction-tag" style={{ marginTop: "var(--s-4)" }}>
          ✦ Fiction
        </span>
      </div>
    </div>
  );
}
