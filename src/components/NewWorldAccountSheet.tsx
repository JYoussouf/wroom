import { useState } from "react";
import { useStore } from "../store/store";
import { Sheet } from "./Sheet";
import { fileToDataURL } from "../lib/image";
import { Avatar } from "./Avatar";
import { accentFromSeed } from "../lib/color";

/**
 * Sketch a lightweight "world" account — just a name, handle, and avatar — to
 * populate a believable world without building a full persona.
 */
export function NewWorldAccountSheet({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (id: string) => void;
}) {
  const { createWorldAccount, normalizeHandle, isHandleAvailable } = useStore();
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [avatar, setAvatar] = useState<string | undefined>();

  const normalized = normalizeHandle(handle);
  const taken = normalized.length > 0 && !isHandleAvailable(normalized);
  const canCreate = name.trim().length > 0 && normalized.length > 0 && !taken;
  const accent = accentFromSeed(normalized || name || "world");

  function reset() {
    setName("");
    setHandle("");
    setAvatar(undefined);
  }

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setAvatar(await fileToDataURL(file, 512));
    } catch {
      /* ignore */
    }
    e.target.value = "";
  }

  function create() {
    if (!canCreate) return;
    const w = createWorldAccount(name, normalized, avatar);
    onCreated?.(w.id);
    reset();
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} label="New world account">
      <div className="sheet-head">
        <h3 className="serif">New world account</h3>
        <p className="dim" style={{ fontSize: "var(--step--1)" }}>
          A face in the crowd — no full persona required.
        </p>
      </div>

      <div className="row gap-3 center" style={{ margin: "var(--s-3) 0" }}>
        <label className="uploader" style={{ borderRadius: "50%" }}>
          <Avatar name={name || "?"} src={avatar} accent={accent} size={56} />
          <div className="hint-overlay" style={{ borderRadius: "50%" }}>
            Avatar
          </div>
          <input type="file" accept="image/*" onChange={pick} />
        </label>
        <div className="col grow gap-3">
          <div className="field">
            <label htmlFor="w-name">Name</label>
            <input
              id="w-name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="The Lamplight Ledger"
            />
          </div>
        </div>
      </div>

      <div className="field">
        <label htmlFor="w-handle">Handle</label>
        <input
          id="w-handle"
          className="input"
          value={normalized}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="handle"
          autoCapitalize="none"
          style={{ borderColor: taken ? "var(--danger)" : undefined }}
        />
        {taken && (
          <span className="hint" style={{ color: "var(--danger)" }}>
            That handle is already used in your room.
          </span>
        )}
      </div>

      <button
        className="btn btn-primary btn-lg btn-block"
        style={{ marginTop: "var(--s-4)" }}
        disabled={!canCreate}
        onClick={create}
      >
        Create world account
      </button>
    </Sheet>
  );
}
