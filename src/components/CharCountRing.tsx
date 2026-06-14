/**
 * A char-count ring that fills as you type and eases neutral → warm → red as
 * the limit nears. Over the limit it shows the overflow as a red number.
 */
export function CharCountRing({
  count,
  limit,
  size = 30,
}: {
  count: number;
  limit: number;
  size?: number;
}) {
  const stroke = 3;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const ratio = Math.min(1, count / limit);
  const remaining = limit - count;
  const over = remaining < 0;
  const near = remaining <= 20 && !over;

  const color = over
    ? "var(--danger)"
    : near
    ? "#d98324" // warm
    : "var(--accent)";

  return (
    <span
      className="ring"
      role="img"
      aria-label={`${remaining} characters ${over ? "over the limit" : "remaining"}`}
    >
      {(near || over) && (
        <span
          className="ring-num mono-num"
          style={{ color: over ? "var(--danger)" : "var(--ink-2)" }}
        >
          {remaining}
        </span>
      )}
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--hairline-strong)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={over ? stroke + 1 : stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - (over ? 1 : ratio))}
          style={{ transition: "stroke-dashoffset 0.2s var(--ease), stroke 0.2s var(--ease)" }}
        />
      </svg>
    </span>
  );
}
