import { IconHome, IconPlus, IconRoom, IconSwitch } from "./icons";

interface Props {
  active: "home" | "room" | null;
  onHome: () => void;
  onRoom: () => void;
  onCompose: () => void;
  onSwitch: () => void;
}

/** Persistent onstage navigation: Home, a prominent Compose, Switch, Room. */
export function TabBar({ active, onHome, onRoom, onCompose, onSwitch }: Props) {
  return (
    <nav className="tabbar" aria-label="Primary">
      <button
        className={`tab ${active === "home" ? "on" : ""}`}
        onClick={onHome}
        aria-label="Home timeline"
        aria-current={active === "home" ? "page" : undefined}
      >
        <IconHome size={23} />
        <span>Home</span>
      </button>
      <button className="tab" onClick={onSwitch} aria-label="Switch character">
        <IconSwitch size={21} />
        <span>Switch</span>
      </button>
      <button className="tab tab-compose" onClick={onCompose} aria-label="Compose a post">
        <span className="compose-fab">
          <IconPlus size={24} />
        </span>
      </button>
      <button
        className={`tab ${active === "room" ? "on" : ""}`}
        onClick={onRoom}
        aria-label="Back to Wroom"
        aria-current={active === "room" ? "page" : undefined}
      >
        <IconRoom size={22} />
        <span>Wroom</span>
      </button>
    </nav>
  );
}
