import type { Privacy } from "../types";
import { IconGlobe, IconLock } from "./icons";

/** A small, always-legible indicator of a character's privacy state. */
export function PrivacyBadge({
  privacy,
  size = 13,
  withLabel = false,
}: {
  privacy: Privacy;
  size?: number;
  withLabel?: boolean;
}) {
  const isPrivate = privacy === "private";
  return (
    <span
      className="pill"
      title={isPrivate ? "Private — only you can see this" : "Shareable view enabled"}
      style={{
        padding: withLabel ? "4px 10px" : 4,
        gap: 5,
        color: isPrivate ? "var(--ink-2)" : "var(--accent)",
        background: isPrivate ? "var(--surface-2)" : "var(--accent-weak)",
        borderColor: isPrivate ? "var(--hairline)" : "var(--accent-soft)",
      }}
    >
      {isPrivate ? <IconLock size={size} /> : <IconGlobe size={size} />}
      {withLabel && (isPrivate ? "Private" : "Shareable")}
    </span>
  );
}
