import { useState } from "react";
import { Sheet } from "./Sheet";
import { IconClose, IconSpark } from "./icons";
import { api, ApiError } from "../lib/api";

type Kind = "feature_idea" | "bug";
type Status = "idle" | "sending" | "done" | "error";

const KINDS: { value: Kind; label: string }[] = [
  { value: "feature_idea", label: "Feature Idea" },
  { value: "bug", label: "Bug" },
];

/**
 * Floating pre-alpha feedback badge (bottom-right). Opens a clean sheet with a
 * short form; on submit, files a GitHub issue on the wroom repo via the API.
 */
export function FeatureRequestBadge() {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("feature_idea");
  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [issueUrl, setIssueUrl] = useState<string | null>(null);

  function reset() {
    setKind("feature_idea");
    setText("");
    setStatus("idle");
    setError(null);
    setIssueUrl(null);
  }

  function close() {
    setOpen(false);
    // Let the sheet animate out before clearing, so it doesn't flash.
    setTimeout(reset, 250);
  }

  async function submit() {
    if (text.trim().length < 3 || status === "sending") return;
    setStatus("sending");
    setError(null);
    try {
      const res = await api.submitFeedback({ text: text.trim(), kind });
      setIssueUrl(res.url);
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError(
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Please try again."
      );
    }
  }

  const canSend = text.trim().length >= 3 && status !== "sending";

  return (
    <>
      <button
        className="feature-badge"
        onClick={() => setOpen(true)}
        aria-label="Submit a feature request"
      >
        <IconSpark size={15} />
        <span className="feature-badge-text">
          <span className="feature-badge-tag">wroom pre-alpha</span>
          Submit a Feature Request
        </span>
      </button>

      <Sheet open={open} onClose={close} label="Submit a feature request">
        {status === "done" ? (
          <div className="fr-done">
            <div className="fr-done-glyph">✦</div>
            <h3 className="serif">Thank you</h3>
            <p className="serif dim">
              Your {kind === "bug" ? "report" : "request"} is in. We read every one.
            </p>
            <div className="sheet-foot">
              {issueUrl && (
                <a
                  className="btn"
                  style={{ flex: 1 }}
                  href={issueUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  View on GitHub
                </a>
              )}
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={close}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="sheet-head">
              <div className="row spread center">
                <h3 className="serif">Submit a feature request</h3>
                <button className="icon-btn" aria-label="Close" onClick={close}>
                  <IconClose size={20} />
                </button>
              </div>
              <p className="dim" style={{ fontSize: "var(--step--1)" }}>
                wroom is in pre-alpha, help shape this platform to be yours. Every detail matters!
              </p>
            </div>

            <div className="fr-form">
              <div className="fr-kinds" role="tablist" aria-label="Type of feedback">
                {KINDS.map((k) => (
                  <button
                    key={k.value}
                    role="tab"
                    aria-selected={kind === k.value}
                    className={`fr-kind ${kind === k.value ? "active" : ""}`}
                    onClick={() => setKind(k.value)}
                  >
                    {k.label}
                  </button>
                ))}
              </div>

              <div className="field">
                <textarea
                  id="fr-text"
                  className="textarea"
                  placeholder={
                    kind === "bug"
                      ? "What went wrong?"
                      : "What would make wroom better?"
                  }
                  value={text}
                  maxLength={4000}
                  rows={5}
                  autoFocus
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
                  }}
                />
              </div>

              {error && <p className="fr-error">{error}</p>}

              <button
                className="btn btn-primary btn-lg btn-block"
                disabled={!canSend}
                onClick={submit}
              >
                {status === "sending" ? "Sending…" : "Submit request"}
              </button>
            </div>
          </>
        )}
      </Sheet>
    </>
  );
}
