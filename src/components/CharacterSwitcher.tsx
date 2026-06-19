import { useStore } from "../store/store";
import { useNav } from "../nav";
import { Sheet } from "./Sheet";
import { Avatar } from "./Avatar";
import { IconPlus, IconRoom } from "./icons";

/** Fast character switcher — step between personas without losing your place. */
export function CharacterSwitcher({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { myCharacters, activeCharacterId, stepInto, stepOut } = useStore();
  const { reset, push } = useNav();

  const sorted = [...myCharacters].sort((a, b) => b.lastActiveAt - a.lastActiveAt);

  function choose(id: string) {
    stepInto(id);
    reset({ name: "home" });
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} label="Switch character">
      <div className="sheet-head">
        <h3 className="serif">Step into…</h3>
        <p className="dim" style={{ fontSize: "var(--step--1)" }}>
          Switch the voice you're writing in.
        </p>
      </div>

      {sorted.length === 0 && (
        <div className="empty" style={{ padding: "var(--s-5) var(--s-4)" }}>
          <div className="glyph">✦</div>
          <h3 className="serif">No one to step into yet</h3>
          <p className="serif">
            Invent your first character, then step into their world.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => {
              push({ name: "character-new" });
              onClose();
            }}
          >
            <IconPlus size={18} /> Create your first character
          </button>
        </div>
      )}

      <div className="switcher-list">
        {sorted.map((c) => (
          <button
            key={c.id}
            className={`switcher-row ${c.id === activeCharacterId ? "active" : ""}`}
            style={{ ["--accent" as string]: c.accentColor }}
            onClick={() => choose(c.id)}
          >
            <Avatar name={c.displayName} src={c.avatar} accent={c.accentColor} size={42} />
            <div className="switcher-id">
              <div className="serif name">{c.displayName}</div>
              <div className="handle">@{c.handle}</div>
            </div>
            {c.id === activeCharacterId && <span className="pill accent">Active</span>}
          </button>
        ))}
      </div>

      <div className="sheet-foot">
        <button
          className="btn"
          style={{ flex: 1 }}
          onClick={() => {
            push({ name: "character-new" });
            onClose();
          }}
        >
          <IconPlus size={18} /> New character
        </button>
        <button
          className="btn"
          style={{ flex: 1 }}
          onClick={() => {
            stepOut();
            reset({ name: "room" });
            onClose();
          }}
        >
          <IconRoom size={18} /> Back to Wroom
        </button>
      </div>
    </Sheet>
  );
}
