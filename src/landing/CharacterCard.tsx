import type { LandingCharacter } from "./data";
import { CARD_SIZE } from "./data";

/**
 * The visual that fills each scroll card — a stylized character "card" in
 * Wroom's voice (accent gradient, serif initial, name + handle + role).
 * Replaces the marketplace artwork photos from the original layout.
 */
export function CharacterCard({ char }: { char: LandingCharacter }) {
  return (
    <div
      style={{
        width: CARD_SIZE,
        height: CARD_SIZE,
        borderRadius: 18,
        overflow: "hidden",
        boxShadow: "0 20px 60px rgba(0,0,0,0.20)",
        background: `linear-gradient(150deg, ${char.accent} 0%, ${char.accentDeep} 100%)`,
        position: "relative",
        userSelect: "none",
      }}
    >
      {/* big serif initial, watermark-style */}
      <div
        style={{
          position: "absolute",
          top: -28,
          right: -6,
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: 200,
          fontWeight: 600,
          lineHeight: 1,
          color: "rgba(255,255,255,0.16)",
        }}
      >
        {char.name.charAt(0)}
      </div>

      {/* "Fiction" chip */}
      <div
        style={{
          position: "absolute",
          top: 14,
          left: 14,
          fontFamily: '"Inter Tight", sans-serif',
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.85)",
          border: "1px solid rgba(255,255,255,0.35)",
          borderRadius: 9999,
          padding: "3px 9px",
        }}
      >
        Fiction
      </div>

      {/* identity */}
      <div style={{ position: "absolute", left: 16, right: 16, bottom: 16 }}>
        <div
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: 22,
            fontWeight: 600,
            color: "#fff",
            lineHeight: 1.1,
          }}
        >
          {char.name}
        </div>
        <div
          style={{
            fontFamily: '"Inter Tight", sans-serif',
            fontSize: 13,
            fontWeight: 500,
            color: "rgba(255,255,255,0.8)",
            marginTop: 2,
          }}
        >
          @{char.handle}
        </div>
        <div
          style={{
            fontFamily: '"Inter Tight", sans-serif',
            fontSize: 12,
            fontWeight: 400,
            color: "rgba(255,255,255,0.65)",
            marginTop: 6,
          }}
        >
          {char.role}
        </div>
      </div>
    </div>
  );
}
