import { useEffect } from "react";

/** A small centered confirmation for destructive or irreversible actions. */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Confirm",
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div className="palette-scrim" style={{ alignItems: "center", paddingTop: "var(--s-4)" }} onClick={onCancel}>
      <div
        className="confirm"
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="serif">{title}</h3>
        <p className="muted">{body}</p>
        <div className="row gap-2" style={{ marginTop: "var(--s-4)" }}>
          <button className="btn grow" onClick={onCancel}>
            Cancel
          </button>
          <button
            className={`btn grow ${danger ? "btn-danger" : "btn-primary"}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
