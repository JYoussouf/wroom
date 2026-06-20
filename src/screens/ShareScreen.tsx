import { useMemo } from "react";
import { useStore } from "../store/store";
import { useNav } from "../nav";
import { getCharacter, profilePosts } from "../store/selectors";
import { buildShareHtml } from "../lib/shareHtml";
import { gradientBanner } from "../lib/avatars";
import { Avatar } from "../components/Avatar";
import { IconBack, IconExport, IconGlobe, IconSpark } from "../components/icons";
import { RichText } from "../components/RichText";

export function ShareScreen({ id }: { id: string }) {
  const { db, updateCharacter, showToast } = useStore();
  const { back } = useNav();

  const c = getCharacter(db, id);
  const posts = useMemo(() => (c ? profilePosts(db, id) : []), [db, id, c]);

  if (!c) {
    return (
      <div className="app-scroll">
        <div className="screen-pad">
          <button className="btn" onClick={back}>
            ← Back
          </button>
          <p className="muted serif">This character no longer exists.</p>
        </div>
      </div>
    );
  }

  function downloadHtml() {
    if (!c) return;
    const html = buildShareHtml(c, posts);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${c.handle}-wroom-fiction.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast("Shareable page exported ✦");
  }

  async function copyText() {
    if (!c) return;
    const text =
      `${c.displayName} (@${c.handle}) — a fictional character\n\n` +
      posts.map((p) => p.body).join("\n\n") +
      `\n\n— Fictional content created in Writer's Room.`;
    try {
      await navigator.clipboard.writeText(text);
      showToast("Copied to clipboard ✦");
    } catch {
      showToast("Couldn't access the clipboard");
    }
  }

  const banner = c.banner ? `url(${c.banner}) center/cover` : gradientBanner(c.accentColor);

  return (
    <>
      <header className="topbar">
        <div className="row spread center">
          <button className="icon-btn" aria-label="Back" onClick={back}>
            <IconBack />
          </button>
          <div className="bar-title" style={{ fontSize: "var(--step-1)" }}>
            Share
          </div>
          <span style={{ width: 40 }} />
        </div>
      </header>

      <div className="app-scroll" style={{ ["--accent" as string]: c.accentColor }}>
        <div className="screen-pad">
          {c.privacy !== "shareable" ? (
            <div className="empty">
              <div className="glyph">🔒</div>
              <h3 className="serif">{c.displayName} is private</h3>
              <p className="serif">
                Sharing requires a conscious choice. Mark this character as
                shareable to create a read-only, clearly-watermarked view.
              </p>
              <button
                className="btn btn-primary"
                onClick={() => {
                  updateCharacter(c.id, { privacy: "shareable" });
                  showToast("Now shareable ✦");
                }}
              >
                <IconGlobe size={16} /> Make shareable
              </button>
            </div>
          ) : (
            <>
              <p className="muted serif">
                A read-only preview of how {c.displayName} appears when shared.
                Clearly marked as fiction.
              </p>

              {/* Preview of the shareable view */}
              <div className="preview-card" style={{ marginTop: "var(--s-4)" }}>
                <div className="preview-banner" style={{ background: banner }} />
                <div className="preview-inner">
                  <div className="preview-avatar">
                    <Avatar name={c.displayName} src={c.avatar} accent={c.accentColor} size={64} ring />
                  </div>
                  <div className="row spread center" style={{ marginTop: 6 }}>
                    <div>
                      <div className="serif" style={{ fontSize: "var(--step-2)", fontWeight: 600 }}>
                        {c.displayName}
                      </div>
                      <div className="handle">@{c.handle}</div>
                    </div>
                    <span className="fiction-tag">
                      <IconSpark size={12} /> Fictional
                    </span>
                  </div>
                  {c.bio && (
                    <p className="serif" style={{ marginTop: "var(--s-3)" }}>
                      <RichText text={c.bio} />
                    </p>
                  )}
                  <div className="section-label">{posts.length} posts</div>
                  {posts.slice(0, 3).map((p) => (
                    <p key={p.id} className="serif" style={{ borderTop: "1px solid var(--hairline)", paddingTop: "var(--s-3)", marginTop: 0 }}>
                      <RichText text={p.body} />
                    </p>
                  ))}
                  {posts.length > 3 && (
                    <p className="dim">+{posts.length - 3} more in the export</p>
                  )}
                </div>
                <div
                  style={{
                    background: "var(--ink)",
                    color: "var(--bg)",
                    textAlign: "center",
                    padding: "10px",
                    fontSize: "0.74rem",
                    fontWeight: 600,
                  }}
                >
                  ✦ Fictional content — created in Writer's Room
                </div>
              </div>

              <div className="col gap-2" style={{ marginTop: "var(--s-5)" }}>
                <button className="btn btn-primary btn-lg btn-block" onClick={downloadHtml}>
                  <IconExport size={18} /> Export as web page (.html)
                </button>
                <button className="btn btn-block" onClick={copyText}>
                  Copy posts as text
                </button>
                <button
                  className="btn btn-ghost btn-block"
                  onClick={() => {
                    updateCharacter(c.id, { privacy: "private" });
                    showToast("Back to private 🔒");
                    back();
                  }}
                >
                  Make private again
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
