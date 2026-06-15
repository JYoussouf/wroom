import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../store/store";
import { useNav } from "../nav";
import { Avatar } from "./Avatar";
import { IconPlus, IconRoom, IconSearch, IconSettings } from "./icons";

interface Cmd {
  id: string;
  label: string;
  sub?: string;
  icon: React.ReactNode;
  run: () => void;
  keywords: string;
}

/** ⌘/Ctrl-K command palette: jump to any character or action from anywhere. */
export function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { myCharacters, myWorldAccounts, stepInto, stepOut } = useStore();
  const { reset, push } = useNav();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = useMemo<Cmd[]>(() => {
    const list: Cmd[] = [
      {
        id: "room",
        label: "Go to the Wroom",
        sub: "Backstage — your whole cast",
        icon: <IconRoom size={20} />,
        keywords: "wroom room backstage home cast",
        run: () => {
          stepOut();
          reset({ name: "room" });
        },
      },
      {
        id: "new",
        label: "New character",
        sub: "Invent a new persona",
        icon: <IconPlus size={20} />,
        keywords: "new character create persona add",
        run: () => push({ name: "character-new" }),
      },
      {
        id: "settings",
        label: "Settings",
        icon: <IconSettings size={20} />,
        keywords: "settings preferences theme privacy data export",
        run: () => push({ name: "settings" }),
      },
    ];
    for (const c of myCharacters) {
      list.push({
        id: c.id,
        label: `Step into ${c.displayName}`,
        sub: `@${c.handle}`,
        icon: (
          <Avatar name={c.displayName} src={c.avatar} accent={c.accentColor} size={26} />
        ),
        keywords: `${c.displayName} ${c.handle} ${c.occupation} step into ${c.tags.join(" ")}`,
        run: () => {
          stepInto(c.id);
          reset({ name: "home" });
        },
      });
    }
    for (const w of myWorldAccounts) {
      list.push({
        id: w.id,
        label: `View ${w.name}`,
        sub: `@${w.handle} · world account`,
        icon: <Avatar name={w.name} src={w.avatar} accent={w.accentColor} size={26} />,
        keywords: `${w.name} ${w.handle} world account view profile`,
        run: () => push({ name: "profile", id: w.id }),
      });
    }
    return list;
  }, [myCharacters, myWorldAccounts, push, reset, stepInto, stepOut]);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return commands;
    return commands.filter((c) =>
      (c.label + " " + c.keywords).toLowerCase().includes(s)
    );
  }, [q, commands]);

  useEffect(() => {
    if (open) {
      setQ("");
      setSel(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => setSel(0), [q]);

  if (!open) return null;

  function choose(cmd?: Cmd) {
    if (!cmd) return;
    cmd.run();
    onClose();
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel((s) => Math.min(results.length - 1, s + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((s) => Math.max(0, s - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(results[sel]);
    } else if (e.key === "Escape") {
      onClose();
    }
  }

  return (
    <div className="palette-scrim" onClick={onClose}>
      <div
        className="palette"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="palette-input">
          <IconSearch size={18} />
          <input
            ref={inputRef}
            value={q}
            placeholder="Jump to a character or action…"
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
            aria-label="Command search"
          />
          <kbd className="kbd">esc</kbd>
        </div>
        <div className="palette-list">
          {results.map((c, i) => (
            <button
              key={c.id}
              className={`palette-row ${i === sel ? "sel" : ""}`}
              onMouseEnter={() => setSel(i)}
              onClick={() => choose(c)}
            >
              <span className="palette-icon">{c.icon}</span>
              <span className="palette-label">
                <span>{c.label}</span>
                {c.sub && <span className="handle">{c.sub}</span>}
              </span>
            </button>
          ))}
          {results.length === 0 && (
            <div className="dim" style={{ padding: "var(--s-4)", textAlign: "center" }}>
              Nothing matches “{q}”.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
