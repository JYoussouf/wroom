import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { User, Settings, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { ScrollCards } from "./ScrollCards";
import { CHARACTERS } from "./data";

const PAGE_BG = "#F2F2F0";
const INK = "#111111";
const RED = "#C0392B";
const TEAL = "#4ECDC4";

/** Split a string into word spans that rise + fade in, in reading order. */
function Words({
  text,
  startIndex = 0,
  color,
  per = 0.06,
  baseDelay = 0,
  blur = false,
}: {
  text: string;
  startIndex?: number;
  color?: string;
  per?: number;
  baseDelay?: number;
  blur?: boolean;
}) {
  return (
    <>
      {text.split(" ").map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          style={{ display: "inline-block", marginRight: "0.25em", color }}
          initial={blur ? { opacity: 0, filter: "blur(10px)", y: 20 } : { opacity: 0, y: 28 }}
          whileInView={blur ? { opacity: 1, filter: "blur(0px)", y: 0 } : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: "easeOut", delay: baseDelay + (startIndex + i) * per }}
        >
          {word}
        </motion.span>
      ))}
    </>
  );
}

const jelly = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    scaleX: [1, 1.25, 0.75, 1.15, 0.95, 1.05, 1],
    scaleY: [1, 0.75, 1.25, 0.85, 1.05, 0.95, 1],
  },
};

function PrimaryButton({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: INK,
        color: "#fff",
        fontFamily: '"Inter Tight", sans-serif',
        fontSize: 15,
        fontWeight: 600,
        padding: "14px 28px",
        borderRadius: 9999,
        border: "none",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#333")}
      onMouseLeave={(e) => (e.currentTarget.style.background = INK)}
    >
      {children}
    </button>
  );
}

function SecondaryButton({
  children,
  onClick,
  outline = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  outline?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "transparent",
        color: INK,
        fontFamily: '"Inter Tight", sans-serif',
        fontSize: 15,
        fontWeight: 500,
        padding: outline ? "14px 24px" : "14px 20px",
        borderRadius: 9999,
        border: outline ? "1.5px solid rgba(0,0,0,0.15)" : "none",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.05)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {children}
    </button>
  );
}

function Logo() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden>
      <defs>
        <linearGradient id="lgcap" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e0875a" />
          <stop offset="1" stopColor="#a84a26" />
        </linearGradient>
      </defs>
      <rect width="28" height="28" rx="8" fill="#0c0a09" />
      <rect x="6" y="6" width="16" height="16" rx="5" fill="url(#lgcap)" />
      <g transform="rotate(-38 14 14)">
        <rect x="9" y="12.5" width="8" height="3" rx="0.6" fill="#f7f3ec" />
        <path d="M9 12.5 L7 14 L9 15.5 Z" fill="#241f1c" />
        <rect x="17" y="12.5" width="2.4" height="3" rx="1" fill="#e7a98c" />
      </g>
    </svg>
  );
}

function NavBar({ onGetStarted }: { onGetStarted: () => void }) {
  const items: { label: string; dot?: boolean; action?: () => void }[] = [
    { label: "Get Started", action: onGetStarted },
    { label: "Start a wroom", dot: true, action: onGetStarted },
    { label: "Pricing" },
    { label: "About" },
    { label: "Craft" },
    { label: "Stories" },
  ];
  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        zIndex: 50,
        padding: "18px 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "transparent",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Logo />
        <span style={{ fontFamily: '"Inter Tight", sans-serif', fontSize: 18, fontWeight: 600, color: INK }}>
          Wroom
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center" }}>
        {items.map((it) => (
          <button
            key={it.label}
            onClick={it.action}
            style={{
              display: "flex",
              alignItems: "center",
              fontFamily: '"Inter Tight", sans-serif',
              fontSize: 14,
              color: INK,
              padding: "8px 14px",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            {it.dot && (
              <span
                style={{ width: 14, height: 14, borderRadius: 9999, background: TEAL, marginRight: 6, display: "inline-block" }}
              />
            )}
            {it.label}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <button style={iconBtn} aria-label="Account" onClick={onGetStarted}>
          <User size={20} color={INK} />
        </button>
        <button style={iconBtn} aria-label="Settings" onClick={onGetStarted}>
          <Settings size={20} color={INK} />
        </button>
      </div>
    </nav>
  );
}

const iconBtn: React.CSSProperties = {
  padding: 8,
  background: "transparent",
  border: "none",
  cursor: "pointer",
  lineHeight: 0,
};

function ScrollIndicator() {
  const by = (mult: number) => window.scrollBy({ top: mult * window.innerHeight, behavior: "smooth" });
  const btn: React.CSSProperties = {
    width: 36,
    height: 36,
    border: "1.5px solid rgba(0,0,0,0.15)",
    borderRadius: 8,
    background: "transparent",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
  const hover = (e: React.MouseEvent<HTMLButtonElement>, on: boolean) =>
    (e.currentTarget.style.background = on ? "rgba(0,0,0,0.05)" : "transparent");
  return (
    <div
      style={{
        position: "fixed",
        right: 24,
        top: "50%",
        transform: "translateY(-50%)",
        zIndex: 40,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <button style={btn} onClick={() => by(-1)} onMouseEnter={(e) => hover(e, true)} onMouseLeave={(e) => hover(e, false)} aria-label="Scroll up">
        <ChevronUp size={16} color={INK} />
      </button>
      <button style={btn} onClick={() => by(1)} onMouseEnter={(e) => hover(e, true)} onMouseLeave={(e) => hover(e, false)} aria-label="Scroll down">
        <ChevronDown size={16} color={INK} />
      </button>
    </div>
  );
}

function Bubble({
  handle,
  bg,
  style,
  tail,
  delay,
}: {
  handle: string;
  bg: string;
  style: React.CSSProperties;
  tail: React.CSSProperties;
  delay: number;
}) {
  return (
    <motion.div
      style={{
        position: "absolute",
        zIndex: 20,
        background: bg,
        padding: "8px 18px",
        borderRadius: 9999,
        fontFamily: '"Inter Tight", sans-serif',
        fontSize: 15,
        fontWeight: 600,
        color: "#fff",
        ...style,
      }}
      initial={jelly.initial}
      animate={jelly.animate}
      transition={{ duration: 0.8, delay }}
    >
      {handle}
      <span style={{ position: "absolute", width: 0, height: 0, ...tail }} />
    </motion.div>
  );
}

function HeroSection({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <section style={{ minHeight: "100vh", overflow: "hidden" }}>
      <main style={{ paddingTop: 140, maxWidth: 1100, margin: "0 auto", padding: "140px 32px 0" }}>
        <span
          style={{
            fontFamily: '"Inter Tight", sans-serif',
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: 2.5,
            color: "rgba(0,0,0,0.45)",
            textTransform: "uppercase",
          }}
        >
          ✦ A tool for fiction
        </span>
        <h1
          style={{
            fontFamily: '"Inter Tight", sans-serif',
            fontSize: 96,
            fontWeight: 800,
            lineHeight: 1.0,
            letterSpacing: -3,
            color: INK,
            maxWidth: 1100,
            margin: "16px 0 0",
          }}
        >
          <Words text="One author," startIndex={0} per={0.08} />
          <br />
          <Words text="a cast of many." startIndex={2} per={0.08} />
        </h1>

        {/* spacer where the hero cards live (owned by the ScrollCards overlay) */}
        <div style={{ height: 260, width: "100%", marginTop: 40, position: "relative" }}>
          <Bubble
            handle="@verasloane"
            bg={RED}
            delay={3.05}
            style={{ left: "calc(50% - 320px)", top: -12 }}
            tail={{ bottom: -8, left: 16, borderLeft: "8px solid transparent", borderRight: "4px solid transparent", borderTop: `10px solid ${RED}` }}
          />
          <Bubble
            handle="@augustepell"
            bg="#4D7EFF"
            delay={3.2}
            style={{ right: "calc(50% - 420px)", top: -20 }}
            tail={{ bottom: -8, right: 16, borderLeft: "4px solid transparent", borderRight: "8px solid transparent", borderTop: "10px solid #4D7EFF" }}
          />
        </div>

        <motion.p
          style={{
            fontFamily: '"Inter Tight", sans-serif',
            fontSize: 16,
            fontWeight: 400,
            color: "rgba(0,0,0,0.55)",
            lineHeight: 1.6,
            maxWidth: 480,
            marginTop: 48,
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 2.2 }}
        >
          Run a cast of invented characters, step into one at a time, and write each
          persona's social world as if you were becoming someone.
        </motion.p>

        <motion.div
          style={{ display: "flex", gap: 16, marginTop: 28, paddingBottom: 80 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 2.4 }}
        >
          <PrimaryButton onClick={onGetStarted}>Start your wroom</PrimaryButton>
          <SecondaryButton onClick={onGetStarted}>Explore the demo</SecondaryButton>
        </motion.div>
      </main>
    </section>
  );
}

function CastSection({ onGetStarted }: { onGetStarted: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.95 });
  const tag = (style: React.CSSProperties, bg: string, label: string, tail: React.CSSProperties, delay: number) => (
    <motion.div
      style={{
        position: "absolute",
        zIndex: 20,
        background: bg,
        borderRadius: 9999,
        padding: "9px 20px",
        fontFamily: '"Inter Tight", sans-serif',
        fontSize: 15,
        fontWeight: 600,
        color: "#fff",
        ...style,
      }}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.6 }}
      transition={{ duration: 0.5, ease: "easeOut", delay }}
    >
      {label}
      <span style={{ position: "absolute", width: 0, height: 0, ...tail }} />
    </motion.div>
  );

  return (
    <section
      data-section="two"
      ref={ref}
      style={{
        background: PAGE_BG,
        minHeight: "calc(100vh - 30px)",
        padding: "80px 64px 0",
        display: "flex",
        alignItems: "flex-start",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ width: 520, paddingTop: 32 }}>
        <motion.div
          style={{ fontFamily: '"Inter Tight", sans-serif', fontSize: 11, fontWeight: 500, letterSpacing: 2.5, color: "rgba(0,0,0,0.45)", marginBottom: 20 }}
          initial={{ opacity: 0, filter: "blur(8px)", y: 16 }}
          whileInView={{ opacity: 1, filter: "blur(0px)", y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          YOUR CAST
        </motion.div>
        <h2 style={{ fontFamily: '"Inter Tight", sans-serif', fontSize: 60, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1.5, margin: 0 }}>
          <Words text="Invent, embody" startIndex={0} color={INK} blur />
          <br />
          <Words text="& voice a cast from" startIndex={2} color={RED} blur />
          <br />
          <Words text="a single account." startIndex={6} color={INK} blur />
        </h2>
        <motion.p
          style={{ fontFamily: '"Inter Tight", sans-serif', marginTop: 28, fontSize: 15, fontWeight: 400, color: "rgba(0,0,0,0.55)", lineHeight: 1.65, maxWidth: 340 }}
          initial={{ opacity: 0, filter: "blur(8px)", y: 16 }}
          whileInView={{ opacity: 1, filter: "blur(0px)", y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.5 }}
        >
          One author, many identities. Build believable people, give each a timeline and a
          world, and slip between them whenever you write.
        </motion.p>
        <motion.div
          style={{ display: "flex", marginTop: 48, gap: 12 }}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.7 }}
        >
          <PrimaryButton onClick={onGetStarted}>Start your wroom</PrimaryButton>
          <SecondaryButton outline onClick={onGetStarted}>Read more</SecondaryButton>
        </motion.div>
      </div>

      {tag(
        { top: 260, left: "calc(40% + 340px)" },
        RED,
        "@ondinemarsh",
        { bottom: -9, left: "50%", transform: "translateX(-50%)", borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderTop: `10px solid ${RED}` },
        0,
      )}
      {tag(
        { top: 430, left: "calc(40% + 680px)" },
        INK,
        "@cassiusvane",
        { bottom: -9, left: 20, borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderTop: `10px solid ${INK}` },
        0.15,
      )}
    </section>
  );
}

const SLIDES = [
  { char: CHARACTERS[0], line: "The city only confesses at 3 a.m." },
  { char: CHARACTERS[1], line: "Every gear remembers the hand that wound it." },
  { char: CHARACTERS[2], line: "We planted the roof, and the roof planted us." },
];

function ShowcaseSection() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActive((a) => (a + 1) % SLIDES.length), 3000);
    return () => clearInterval(t);
  }, [active]);

  return (
    <section data-section="three" style={{ background: PAGE_BG, minHeight: "100vh", padding: "80px 64px 80px", position: "relative", overflow: "hidden" }}>
      <div style={{ maxWidth: 520, marginBottom: 40, position: "relative", zIndex: 10 }}>
        <motion.div
          style={{ fontFamily: '"Inter Tight", sans-serif', fontSize: 11, fontWeight: 500, letterSpacing: 2.5, color: "rgba(0,0,0,0.45)", marginBottom: 20 }}
          initial={{ opacity: 0, filter: "blur(8px)", y: 12 }}
          whileInView={{ opacity: 1, filter: "blur(0px)", y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        >
          STRAIGHT FROM THE STUDIO
        </motion.div>
        <h2 style={{ fontFamily: '"Inter Tight", sans-serif', fontSize: 80, fontWeight: 800, lineHeight: 1.0, letterSpacing: -2.5, color: INK, margin: 0 }}>
          {["A", "room", "for", "every", "voice."].map((w, i) => (
            <motion.span
              key={w + i}
              style={{ display: "inline-block", marginRight: "0.2em" }}
              initial={{ opacity: 0, filter: "blur(10px)", y: 20 }}
              whileInView={{ opacity: 1, filter: "blur(0px)", y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease: "easeOut", delay: i * 0.07 }}
            >
              {w}
            </motion.span>
          ))}
        </h2>
      </div>

      <motion.div
        style={{ position: "absolute", top: 120, right: 180, zIndex: 10, background: INK, borderRadius: 9999, padding: "10px 22px", fontFamily: '"Inter Tight", sans-serif', fontSize: 16, fontWeight: 600, color: "#fff" }}
        initial={jelly.initial}
        whileInView={jelly.animate}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.65 }}
      >
        @miraokonkwo
        <span style={{ position: "absolute", width: 0, height: 0, bottom: -9, right: 24, borderLeft: "8px solid transparent", borderRight: "4px solid transparent", borderTop: `10px solid ${INK}` }} />
      </motion.div>

      {/* autoplay showcase banner — typographic slides, no external media */}
      <motion.div
        style={{ width: "100%", borderRadius: 24, overflow: "hidden", height: 600, background: INK, position: "relative" }}
        initial={{ opacity: 0, y: 40, filter: "blur(12px)" }}
        whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 }}
      >
        {SLIDES.map((slide, i) => (
          <motion.div
            key={slide.char.handle}
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              padding: "0 80px",
              background: `radial-gradient(circle at 70% 30%, ${slide.char.accent} 0%, ${slide.char.accentDeep} 55%, #0c0a09 100%)`,
            }}
            animate={{ opacity: i === active ? 1 : 0, scale: i === active ? 1 : 1.04 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            <div style={{ fontFamily: '"Inter Tight", sans-serif', fontSize: 13, fontWeight: 600, letterSpacing: 2, color: "rgba(255,255,255,0.7)", textTransform: "uppercase" }}>
              @{slide.char.handle} · {slide.char.role}
            </div>
            <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 52, fontWeight: 600, color: "#fff", lineHeight: 1.15, maxWidth: 760, marginTop: 16 }}>
              “{slide.line}”
            </div>
          </motion.div>
        ))}

        {/* dots */}
        <div style={{ position: "absolute", top: 24, right: 24, zIndex: 10, display: "flex", gap: 5 }}>
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              style={{
                height: 6,
                width: i === active ? 18 : 6,
                background: i === active ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.45)",
                borderRadius: 9999,
                border: "none",
                padding: 0,
                transition: "all 0.3s ease",
                cursor: "pointer",
              }}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>

        {/* watch CTA with pulsing rings */}
        <div style={{ position: "absolute", bottom: 28, left: 28, display: "inline-block" }}>
          {[{ inset: -8, op: 0.4, delay: 0 }, { inset: -4, op: 0.25, delay: 0.5 }].map((r, i) => (
            <motion.span
              key={i}
              style={{ position: "absolute", inset: r.inset, borderRadius: 9999, border: `2px solid rgba(255,255,255,${r.op})`, pointerEvents: "none" }}
              animate={{ scale: [1, 1.5], opacity: [0.8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: r.delay }}
            />
          ))}
          <motion.button
            style={{ position: "relative", zIndex: 2, background: "#fff", color: INK, fontFamily: '"Inter Tight", sans-serif', fontSize: 15, fontWeight: 600, padding: "12px 28px", borderRadius: 9999, border: "none", display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
            whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
          >
            Read a sample
          </motion.button>
        </div>

        {/* prev / next */}
        <div style={{ position: "absolute", bottom: 28, right: 28, display: "flex", gap: 10 }}>
          {[
            { icon: <ChevronLeft size={20} color={INK} />, label: "Previous slide", go: () => setActive((a) => (a - 1 + SLIDES.length) % SLIDES.length) },
            { icon: <ChevronRight size={20} color={INK} />, label: "Next slide", go: () => setActive((a) => (a + 1) % SLIDES.length) },
          ].map((b) => (
            <motion.button
              key={b.label}
              onClick={b.go}
              aria-label={b.label}
              style={{ width: 44, height: 44, background: "rgba(255,255,255,0.9)", borderRadius: "50%", boxShadow: "0 4px 16px rgba(0,0,0,0.15)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
              whileHover={{ scale: 1.08, backgroundColor: "#FFFFFF", transition: { duration: 0.2 } }}
            >
              {b.icon}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

export function Landing({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <div style={{ background: PAGE_BG, position: "relative", fontFamily: '"Inter Tight", sans-serif' }}>
      {/* decorative blur blobs */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "5%", left: "8%", width: 300, height: 300, background: "radial-gradient(circle, rgba(180,180,180,0.12) 0%, transparent 70%)", filter: "blur(40px)" }} />
        <div style={{ position: "absolute", top: "8%", right: "10%", width: 250, height: 250, background: "radial-gradient(circle, rgba(180,180,180,0.12) 0%, transparent 70%)", filter: "blur(40px)" }} />
        <div style={{ position: "absolute", top: "30%", left: "50%", transform: "translateX(-50%)", width: 600, height: 400, background: "radial-gradient(circle, rgba(160,160,160,0.08) 0%, transparent 70%)", filter: "blur(60px)" }} />
      </div>

      <NavBar onGetStarted={onGetStarted} />
      <ScrollIndicator />
      <ScrollCards />

      <div style={{ position: "relative", zIndex: 1 }}>
        <HeroSection onGetStarted={onGetStarted} />
        <CastSection onGetStarted={onGetStarted} />
        <ShowcaseSection />
      </div>
    </div>
  );
}
