import type { Account } from "../types";
import { useStore } from "../store/store";
import { useNav } from "../nav";
import { Avatar } from "./Avatar";
import { RichText } from "./RichText";

/** A row in a followers/following/discovery list, with an optional follow toggle. */
export function AccountRow({
  account,
  showFollow = true,
}: {
  account: Account;
  showFollow?: boolean;
}) {
  const { activeCharacterId, isFollowing, toggleFollow } = useStore();
  const { push } = useNav();

  const name = account.kind === "character" ? account.displayName : account.name;
  const isSelf = account.id === activeCharacterId;
  const following = activeCharacterId
    ? isFollowing(activeCharacterId, account.id)
    : false;

  return (
    <div className="account-row" style={{ ["--accent" as string]: account.accentColor }}>
      <button
        className="account-row-hit"
        onClick={() => push({ name: "profile", id: account.id })}
      >
        <Avatar name={name} src={account.avatar} accent={account.accentColor} size={44} />
        <div className="account-row-id">
          <div className="row gap-1 center">
            <span className="serif name">{name}</span>
            {account.kind === "world" && <span className="pill tiny">world</span>}
          </div>
          <span className="handle">@{account.handle}</span>
          {account.kind === "character" && account.bio && (
            <p className="account-row-bio serif"><RichText text={account.bio} /></p>
          )}
        </div>
      </button>
      {showFollow && activeCharacterId && !isSelf && (
        <button
          className={`btn ${following ? "" : "btn-primary"} account-row-btn`}
          onClick={() => toggleFollow(activeCharacterId, account.id)}
        >
          {following ? "Following" : "Follow"}
        </button>
      )}
    </div>
  );
}
