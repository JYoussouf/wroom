import { useEffect, useState } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { CharacterCard } from "./CharacterCard";
import {
  CHARACTERS,
  CARD_SIZE,
  HERO_ROW_Y,
  FAN,
  smoothEase,
  introDelay,
  introDuration,
  travelToRightDuration,
  sweepLeftDuration,
  totalDuration,
  getTimeForProgress,
} from "./data";

interface Viewport {
  w: number;
  h: number;
}

const half = CARD_SIZE / 2;

/** Common positioning: place a card's CENTER at the motion (x, y). */
const baseCardStyle = {
  position: "absolute" as const,
  top: 0,
  left: 0,
  marginLeft: -half,
  marginTop: -half,
  width: CARD_SIZE,
  height: CARD_SIZE,
  pointerEvents: "none" as const,
};

// As the user scrolls, the fan spreads further left/right and fades away —
// keyed to absolute scroll distance (px) so it's fully gone within ~0.6 of a
// screen, well before Section 2, regardless of total page height.
const EXPAND = 1.9;

export function ScrollCards() {
  // Absolute window scroll position in px (not progress — page-height agnostic).
  const { scrollY } = useScroll();

  const [vp, setVp] = useState<Viewport>(() => ({
    w: typeof window !== "undefined" ? window.innerWidth : 1280,
    h: typeof window !== "undefined" ? window.innerHeight : 800,
  }));
  const [introDone, setIntroDone] = useState(false);

  useEffect(() => {
    const onResize = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  if (!introDone) {
    return <IntroOverlay vp={vp} onLeadDone={() => setIntroDone(true)} />;
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 5, pointerEvents: "none" }}>
      {CHARACTERS.map((char, i) => (
        <ScrollLinkedCard key={char.handle} index={i} vp={vp} scrollY={scrollY} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Intro: the fan assembles — lead card rises, flies right, sweeps left; the
// other six reveal one by one exactly as the lead passes their slot.
// ---------------------------------------------------------------------------

function IntroOverlay({ vp, onLeadDone }: { vp: Viewport; onLeadDone: () => void }) {
  const sweepStart = introDelay + introDuration + travelToRightDuration;
  const slot0 = FAN[0];
  const slot6 = FAN[6];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 5, pointerEvents: "none" }}>
      {CHARACTERS.slice(1).map((char, idx) => {
        const i = idx + 1; // slot index 1..6
        const slot = FAN[i];
        const progress = (slot.x - slot6.x) / (slot0.x - slot6.x);
        const revealTime = getTimeForProgress(progress, smoothEase);
        const revealDelay = sweepStart + revealTime * sweepLeftDuration;
        const revealDuration = i <= 3 ? 0.06 : 0.18;
        return (
          <motion.div
            key={char.handle}
            style={{
              ...baseCardStyle,
              x: vp.w / 2 + slot.x,
              y: HERO_ROW_Y + slot.y,
              rotate: slot.rotate,
              scale: slot.scale,
              zIndex: slot.z,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: revealDelay, duration: revealDuration, ease: "easeOut" }}
          >
            <CharacterCard char={char} />
          </motion.div>
        );
      })}

      <motion.div
        style={{ ...baseCardStyle, zIndex: 8 }}
        initial={{ opacity: 0 }}
        animate={{
          x: [vp.w / 2, vp.w / 2, vp.w / 2 + slot6.x, vp.w / 2 + slot0.x],
          y: [vp.h / 2 + 180, HERO_ROW_Y, HERO_ROW_Y + slot6.y, HERO_ROW_Y + slot0.y],
          rotate: [0, 0, slot6.rotate, slot0.rotate],
          scale: [0.3, 1, slot6.scale, slot0.scale],
          opacity: [0, 1, 1, 1],
        }}
        transition={{
          delay: introDelay,
          duration: totalDuration,
          times: [
            0,
            introDuration / totalDuration,
            (introDuration + travelToRightDuration) / totalDuration,
            1,
          ],
          ease: [smoothEase, smoothEase, smoothEase],
        }}
        onAnimationComplete={onLeadDone}
      >
        <CharacterCard char={CHARACTERS[0]} />
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scroll-linked: the fan simply expands outward (left/right) and fades as the
// user scrolls down. No gather/cascade, so the cards never cover later content.
// ---------------------------------------------------------------------------

function ScrollLinkedCard({
  index,
  vp,
  scrollY,
}: {
  index: number;
  vp: Viewport;
  scrollY: MotionValue<number>;
}) {
  const slot = FAN[index];
  const centerX = vp.w / 2 + slot.x;
  const centerY = HERO_ROW_Y + slot.y;

  // Spread + fade over the first ~0.6 screen of scrolling.
  const fade = vp.h * 0.6;
  const x = useTransform(scrollY, [0, fade], [centerX, vp.w / 2 + slot.x * EXPAND]);
  const rotate = useTransform(scrollY, [0, fade], [slot.rotate, slot.rotate * 1.5]);
  const opacity = useTransform(scrollY, [0, fade * 0.9], [1, 0]);

  return (
    <motion.div
      style={{
        ...baseCardStyle,
        x,
        y: centerY,
        rotate,
        scale: slot.scale,
        opacity,
        zIndex: slot.z,
      }}
    >
      <CharacterCard char={CHARACTERS[index]} />
    </motion.div>
  );
}
