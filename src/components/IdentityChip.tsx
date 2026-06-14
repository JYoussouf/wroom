import type { Character } from "../types";
import { Avatar } from "./Avatar";
import { IconChevronDown } from "./icons";

/** "Posting as @handle ▾" — the always-visible active identity + switcher trigger. */
export function IdentityChip({
  character,
  onClick,
}: {
  character: Character;
  onClick: () => void;
}) {
  return (
    <button className="identity-chip" onClick={onClick} aria-label="Switch character">
      <Avatar
        name={character.displayName}
        src={character.avatar}
        accent={character.accentColor}
        size={28}
      />
      <span className="identity-chip-text">
        <span className="dim posting-as">Posting as</span>
        <span className="handle-strong">@{character.handle}</span>
      </span>
      <IconChevronDown size={16} />
    </button>
  );
}
