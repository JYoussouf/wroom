import { useEffect, useState } from "react";
import { useStore } from "../store/store";
import { Sheet } from "./Sheet";
import { Avatar } from "./Avatar";
import { IconSpark } from "./icons";
import { relationshipBetween, resolveAccount, accountName, ownerAuthorId } from "../store/selectors";

const SUGGESTED = [
  "friend",
  "family",
  "sibling",
  "partner",
  "rival",
  "mentor",
  "colleague",
  "old flame",
];

/**
 * Define, confirm, or edit the typed bond between the active character (`selfId`)
 * and another account (`otherId`). A bond is not a follow — it's a named,
 * two-party-consented connection (instant when both belong to the same author).
 */
export function RelationshipSheet({
  selfId,
  otherId,
  open,
  onClose,
}: {
  selfId: string;
  otherId: string;
  open: boolean;
  onClose: () => void;
}) {
  const {
    db,
    requestRelationship,
    confirmRelationship,
    declineRelationship,
    removeRelationship,
    updateRelationshipType,
    showToast,
  } = useStore();

  const rel = relationshipBetween(db, selfId, otherId);
  const other = resolveAccount(db, otherId);
  const self = resolveAccount(db, selfId);
  const otherName = accountName(other);
  const sameAuthor =
    ownerAuthorId(db, selfId) !== null &&
    ownerAuthorId(db, selfId) === ownerAuthorId(db, otherId);

  const [type, setType] = useState(rel?.type ?? "");

  // Keep the field in sync when the underlying bond changes (e.g. confirmed).
  useEffect(() => {
    if (open) setType(rel?.type ?? "");
  }, [open, rel?.type]);

  if (!other || !self) return null;

  const iRequested = rel?.requestedBy === selfId;
  const pendingOnMe = rel?.status === "pending" && !iRequested;

  function send() {
    requestRelationship(selfId, otherId, type);
    showToast(
      sameAuthor ? `Connected as “${type.trim() || "connection"}” ✦` : "Request sent ✦"
    );
    onClose();
  }

  function saveType() {
    if (!rel) return;
    updateRelationshipType(rel.id, type);
    showToast("Relationship updated ✦");
    onClose();
  }

  function confirm() {
    if (!rel) return;
    // Let the recipient adjust the proposed label before confirming.
    if (type.trim() && type.trim() !== rel.type) updateRelationshipType(rel.id, type);
    confirmRelationship(rel.id);
    showToast(`You and ${accountName(other).split(" ")[0]} are connected ✦`);
    onClose();
  }

  function decline() {
    if (!rel) return;
    declineRelationship(rel.id);
    showToast("Request declined");
    onClose();
  }

  function remove() {
    if (!rel) return;
    removeRelationship(rel.id);
    showToast(iRequested && rel.status === "pending" ? "Request cancelled" : "Relationship removed");
    onClose();
  }

  const heading =
    rel?.status === "accepted"
      ? "Your relationship"
      : pendingOnMe
        ? `${otherName.split(" ")[0]} wants to connect`
        : rel?.status === "pending"
          ? "Request pending"
          : `Connect with ${otherName.split(" ")[0]}`;

  return (
    <Sheet open={open} onClose={onClose} label="Relationship">
      <div className="sheet-head">
        <h3 className="serif">{heading}</h3>
        <p className="dim" style={{ fontSize: "var(--step--1)" }}>
          A relationship is a named bond between characters — not just a follow.
          {!sameAuthor && rel?.status !== "accepted" && " The other author confirms it."}
        </p>
      </div>

      <div className="rel-pair">
        <div className="rel-face">
          <Avatar
            name={accountName(self)}
            src={self.avatar}
            accent={self.accentColor}
            size={48}
          />
          <span className="handle">@{self.handle}</span>
        </div>
        <span className="rel-link" aria-hidden>
          <IconSpark size={16} />
        </span>
        <div className="rel-face">
          <Avatar name={otherName} src={other.avatar} accent={other.accentColor} size={48} />
          <span className="handle">@{other.handle}</span>
        </div>
      </div>

      {/* Pending request the other party sent to me */}
      {pendingOnMe ? (
        <div className="rel-body">
          <p className="serif" style={{ textAlign: "center" }}>
            They proposed this as <strong>“{rel?.type}”</strong>. Confirm it, adjust
            the label, or decline.
          </p>
          <label className="field" style={{ marginTop: "var(--s-3)" }}>
            <span className="hint">Relationship type</span>
            <input
              className="input"
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="e.g. sister"
            />
          </label>
          <div className="sheet-foot">
            <button className="btn" style={{ flex: 1 }} onClick={decline}>
              Decline
            </button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={confirm}>
              Confirm bond
            </button>
          </div>
        </div>
      ) : rel?.status === "pending" ? (
        /* I requested it; waiting on them */
        <div className="rel-body">
          <p className="serif" style={{ textAlign: "center" }}>
            Waiting for {otherName.split(" ")[0]} to confirm your{" "}
            <strong>“{rel.type}”</strong> request.
          </p>
          <div className="sheet-foot">
            <button className="btn btn-block" onClick={remove}>
              Cancel request
            </button>
          </div>
        </div>
      ) : rel?.status === "accepted" ? (
        /* Established bond — edit the label or sever it */
        <div className="rel-body">
          <label className="field">
            <span className="hint">Relationship type</span>
            <input
              className="input"
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="e.g. sister"
            />
            <div className="chip-row">
              {SUGGESTED.map((s) => (
                <button key={s} type="button" className="chip" onClick={() => setType(s)}>
                  {s}
                </button>
              ))}
            </div>
          </label>
          <div className="sheet-foot">
            <button className="btn" style={{ flex: 1 }} onClick={remove}>
              Remove
            </button>
            <button
              className="btn btn-primary"
              style={{ flex: 1 }}
              disabled={type.trim() === rel.type}
              onClick={saveType}
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        /* No bond yet — propose one */
        <div className="rel-body">
          <label className="field">
            <span className="hint">What is this relationship?</span>
            <input
              className="input"
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="e.g. sister, rival, mentor"
              autoFocus
            />
            <div className="chip-row">
              {SUGGESTED.map((s) => (
                <button key={s} type="button" className="chip" onClick={() => setType(s)}>
                  {s}
                </button>
              ))}
            </div>
          </label>
          <div className="sheet-foot">
            <button
              className="btn btn-primary btn-block"
              disabled={!type.trim()}
              onClick={send}
            >
              {sameAuthor ? "Establish relationship" : "Send request"}
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
