import { useEffect, useState } from "react";
import { useStore } from "./store/store";
import { Landing } from "./landing/Landing";
import { useThemeController } from "./lib/theme";
import { useAppIconController } from "./lib/appIcon";
import { NavProvider, useNav } from "./nav";
import { AuthScreen } from "./screens/AuthScreen";
import { FeedScreen } from "./screens/FeedScreen";
import { RoomScreen } from "./screens/RoomScreen";
import { CharacterEditor } from "./screens/CharacterEditor";
import { CharacterHome } from "./screens/CharacterHome";
import { CharacterProfile } from "./screens/CharacterProfile";
import { PostDetail } from "./screens/PostDetail";
import { ComposeScreen } from "./screens/ComposeScreen";
import { ConnectionsScreen } from "./screens/ConnectionsScreen";
import { GraphScreen } from "./screens/GraphScreen";
import { ShareScreen } from "./screens/ShareScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { LeftRail } from "./components/LeftRail";
import { RightSidebar } from "./components/RightSidebar";
import { TabBar } from "./components/TabBar";
import { Toast } from "./components/Toast";
import { CharacterSwitcher } from "./components/CharacterSwitcher";
import { CommandPalette } from "./components/CommandPalette";
import { FeatureRequestBadge } from "./components/FeatureRequestBadge";

function NotReady({ label }: { label: string }) {
  const { back } = useNav();
  return (
    <div className="app-scroll">
      <div className="screen-pad fade-in">
        <div className="empty">
          <div className="glyph">✦</div>
          <h3 className="serif">{label}</h3>
          <p className="serif">This part of the wroom is being built.</p>
          <button className="btn" onClick={back}>
            Go back
          </button>
        </div>
      </div>
    </div>
  );
}

function Shell() {
  const { route, reset, push } = useNav();
  const { activeCharacter } = useStore();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // ⌘/Ctrl-K command palette from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const openSwitcher = () => setSwitcherOpen(true);

  // Mobile bottom-nav actions. Compose always writes in a voice, so step into a
  // character first if none is active.
  const tabCompose = () =>
    activeCharacter ? push({ name: "compose" }) : setSwitcherOpen(true);
  const tabActive: "home" | "room" | null =
    route.name === "feed" ? "home" : route.name === "room" ? "room" : null;

  let screen: React.ReactNode;
  switch (route.name) {
    case "feed":
      screen = <FeedScreen onOpenSwitcher={openSwitcher} />;
      break;
    case "room":
      screen = <RoomScreen />;
      break;
    case "character-new":
      screen = <CharacterEditor />;
      break;
    case "character-edit":
      screen = <CharacterEditor editId={route.id} />;
      break;
    case "home":
      screen = <CharacterHome onOpenSwitcher={openSwitcher} />;
      break;
    case "profile":
      screen = <CharacterProfile id={route.id} />;
      break;
    case "post":
      screen = <PostDetail id={route.id} />;
      break;
    case "compose":
      screen = <ComposeScreen replyTo={route.replyTo} />;
      break;
    case "connections":
      screen = <ConnectionsScreen id={route.id} tab={route.tab} />;
      break;
    case "graph":
      screen = <GraphScreen />;
      break;
    case "share":
      screen = <ShareScreen id={route.id} />;
      break;
    case "settings":
      screen = <SettingsScreen />;
      break;
    default:
      screen = <NotReady label="Not found" />;
  }

  return (
    <div className="workspace">
      <LeftRail onOpenSwitcher={openSwitcher} />
      <main className="ws-center">{screen}</main>
      <RightSidebar onOpenSwitcher={openSwitcher} />
      <TabBar
        active={tabActive}
        onHome={() => reset({ name: "feed" })}
        onRoom={() => reset({ name: "room" })}
        onCompose={tabCompose}
        onSwitch={openSwitcher}
      />
      <CharacterSwitcher open={switcherOpen} onClose={() => setSwitcherOpen(false)} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <FeatureRequestBadge />
      <Toast />
    </div>
  );
}

export default function App() {
  const { currentAuthor, activeCharacter } = useStore();
  const themePref = currentAuthor?.settings.theme ?? "dark";
  useThemeController(themePref, activeCharacter?.accentColor ?? null);
  useAppIconController(currentAuthor?.settings.appIcon ?? "cream");
  const [showAuth, setShowAuth] = useState(false);

  // Logged out: show the marketing landing first; "Get Started" opens sign-up.
  if (!currentAuthor) {
    return showAuth ? <AuthScreen /> : <Landing onGetStarted={() => setShowAuth(true)} />;
  }

  return (
    <NavProvider>
      <Shell />
    </NavProvider>
  );
}
