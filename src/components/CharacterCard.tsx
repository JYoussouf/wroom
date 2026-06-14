import type { Character } from "../types";
import { useStore } from "../store/store";
import { followerCount, postCount } from "../store/selectors";
import { gradientBanner } from "../lib/avatars";
import { relativeTime } from "../lib/time";
import { Avatar } from "./Avatar";
import { PrivacyBadge } from "./PrivacyBadge";

interface Props {
  character: Character;
  compact?: boolean;
  onOpen: () => void;
  /** Optional secondary action shown as a small button (e.g. "Step in"). */
  action?: { label: string; onClick: () => void };
}

/** A roster card for the Room: banner, avatar, identity, counts, last-active. */
export function CharacterCard({ character, compact, onOpen, action }: Props) {
  const { db } = useStore();
  const followers = followerCount(db, character.id);
  const posts = postCount(db, character.id);
  const banner = character.banner
    ? `url(${character.banner}) center/cover`
    : gradientBanner(character.accentColor);

  return (
    <article
      className="card char-card"
      style={{ ["--accent" as string]: character.accentColor }}
    >
      <button
        className="char-card-hit"
        onClick={onOpen}
        aria-label={`Open ${character.displayName}`}
      >
        <div
          className="char-card-banner"
          style={{ background: banner, height: compact ? 44 : 64 }}
        />
        <div className="char-card-body">
          <div className="char-card-avatar">
            <Avatar
              name={character.displayName}
              src={character.avatar}
              accent={character.accentColor}
              size={compact ? 44 : 56}
              ring
            />
          </div>
          <div className="row spread center" style={{ marginTop: 6 }}>
            <div style={{ minWidth: 0 }}>
              <div className="char-card-name serif">{character.displayName}</div>
              <div className="handle">@{character.handle}</div>
            </div>
            <PrivacyBadge privacy={character.privacy} />
          </div>

          {!compact && character.voiceNote && (
            <p className="char-card-voice serif">“{character.voiceNote}”</p>
          )}

          <div className="char-card-meta mono-num">
            <span>
              <strong>{posts}</strong> <span className="dim">posts</span>
            </span>
            <span>
              <strong>{followers}</strong> <span className="dim">followers</span>
            </span>
            <span className="dim">{relativeTime(character.lastActiveAt)}</span>
          </div>
        </div>
      </button>

      {action && (
        <div className="char-card-action">
          <button className="btn btn-primary" onClick={action.onClick}>
            {action.label}
          </button>
        </div>
      )}
    </article>
  );
}
