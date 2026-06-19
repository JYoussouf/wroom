import { useStore } from "../store/store";
import { useNav, type Route } from "../nav";
import { BRAND_MARK } from "../lib/appIcon";
import { Avatar } from "./Avatar";
import {
  IconHome,
  IconRoom,
  IconGraph,
  IconUser,
  IconSettings,
  IconPlus,
  IconSwitch,
} from "./icons";

interface NavItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  routes: Route["name"][];
  go: () => void;
}

export function LeftRail({ onOpenSwitcher }: { onOpenSwitcher: () => void }) {
  const { currentAuthor, activeCharacter, myCharacters } = useStore();
  const { route, reset, push } = useNav();

  // The "current writer" you're on: the active character, or your most recent
  // one if you haven't stepped in yet. Switching writers is the bottom-left chip.
  const currentWriter =
    activeCharacter ??
    [...myCharacters].sort((a, b) => b.lastActiveAt - a.lastActiveAt)[0] ??
    null;

  function compose() {
    if (activeCharacter) push({ name: "compose" });
    else onOpenSwitcher();
  }
  function openProfile() {
    if (currentWriter) push({ name: "profile", id: currentWriter.id });
    else onOpenSwitcher();
  }

  const items: NavItem[] = [
    {
      key: "home",
      label: "Home",
      icon: <IconHome size={26} />,
      routes: ["feed"],
      go: () => reset({ name: "feed" }),
    },
    {
      key: "room",
      label: "Your Wroom",
      icon: <IconRoom size={26} />,
      routes: ["room"],
      go: () => reset({ name: "room" }),
    },
    {
      key: "graph",
      label: "Relationships",
      icon: <IconGraph size={26} />,
      routes: ["graph"],
      go: () => reset({ name: "graph" }),
    },
    {
      key: "profile",
      label: "Profile",
      icon: <IconUser size={26} />,
      routes: ["profile"],
      go: openProfile,
    },
    {
      key: "settings",
      label: "Settings",
      icon: <IconSettings size={26} />,
      routes: ["settings"],
      go: () => reset({ name: "settings" }),
    },
  ];

  return (
    <nav className="left-rail" aria-label="Primary">
      <div className="left-rail-inner">
        <button
          className="rail-logo"
          onClick={() => reset({ name: "feed" })}
          aria-label="Writer's Room home"
        >
          <img src={BRAND_MARK} alt="" width={40} height={40} />
        </button>

        <div className="rail-nav">
          {items.map((it) => (
            <button
              key={it.key}
              className={`rail-item ${it.routes.includes(route.name) ? "on" : ""}`}
              onClick={it.go}
            >
              <span className="rail-icon">{it.icon}</span>
              <span className="rail-label">{it.label}</span>
            </button>
          ))}
        </div>

        <button className="rail-post btn btn-primary" onClick={compose}>
          <IconPlus size={20} />
          <span className="rail-post-label">Post</span>
        </button>

        <button className="rail-account" onClick={onOpenSwitcher}>
          <Avatar
            name={activeCharacter?.displayName ?? currentAuthor?.name ?? "You"}
            src={activeCharacter?.avatar ?? currentAuthor?.avatar}
            accent={activeCharacter?.accentColor ?? "var(--accent)"}
            size={40}
          />
          <span className="rail-account-id">
            <span className="rail-account-name">
              {activeCharacter?.displayName ?? currentAuthor?.name ?? "You"}
            </span>
            <span className="rail-account-handle">
              {activeCharacter ? `@${activeCharacter.handle}` : "Tap to step in"}
            </span>
          </span>
          <IconSwitch size={18} />
        </button>
      </div>
    </nav>
  );
}
