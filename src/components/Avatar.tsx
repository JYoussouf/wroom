import { gradientAvatar, monogram, avatarInk } from "../lib/avatars";

interface AvatarProps {
  name: string;
  src?: string;
  accent: string;
  size?: number;
  /** Square (rounded-rect) instead of circle — used in a few editorial spots. */
  square?: boolean;
  ring?: boolean;
}

/** Image avatar, or a generated monogram on an accent gradient as fallback. */
export function Avatar({
  name,
  src,
  accent,
  size = 44,
  square = false,
  ring = false,
}: AvatarProps) {
  const radius = square ? size * 0.28 : "50%";
  const common: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: radius,
    flex: `0 0 ${size}px`,
    boxShadow: ring ? "0 0 0 2px var(--bg), 0 0 0 3.5px var(--accent)" : undefined,
  };

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        style={{ ...common, objectFit: "cover", display: "block" }}
        draggable={false}
      />
    );
  }

  return (
    <div
      aria-label={name}
      role="img"
      style={{
        ...common,
        background: gradientAvatar(accent),
        color: avatarInk(accent),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-display)",
        fontWeight: 600,
        fontSize: size * 0.4,
        letterSpacing: "0.01em",
        userSelect: "none",
      }}
    >
      {monogram(name)}
    </div>
  );
}
