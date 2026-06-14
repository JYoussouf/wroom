import { useEffect, useState } from "react";
import { useStore } from "./store/store";
import { useThemeController } from "./lib/theme";
import { NavProvider, useNav } from "./nav";
import { AuthScreen } from "./screens/AuthScreen";
import { RoomScreen } from "./screens/RoomScreen";
import { CharacterEditor } from "./screens/CharacterEditor";
import { CharacterHome } from "./screens/CharacterHome";
import { CharacterProfile } from "./screens/CharacterProfile";
import { PostDetail } from "./screens/PostDetail";
import { ComposeScreen } from "./screens/ComposeScreen";
import { TabBar } from "./components/TabBar";
import { Toast } from "./components/Toast";
import { CharacterSwitcher } from "./components/CharacterSwitcher";
import { CommandPalette } from "./components/CommandPalette";

function NotReady({ label }: { label: string }) {
  const { back } = useNav();
  return (
    <div className="app-scroll">
      <div className="screen-pad fade-in">
        <div className="empty">
          <div className="glyph">✦</div>
          <h3 className="serif">{label}</h3>
          <p className="serif">This part of the room is being built.</p>
          <button className="btn" onClick={back}>
            Go back
          </button>
        </div>
      </div>
    </div>
  );
}

function Shell() {
  const { activeCharacterId, activeCharacter, stepInto, stepOut, myCharacters } =
    useStore();
  const { route, reset, push } = useNav();
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

  function goHome() {
    if (activeCharacterId) {
      reset({ name: "home" });
    } else if (myCharacters[0]) {
      stepInto(myCharacters[0].id);
      reset({ name: "home" });
    }
  }
  function goRoom() {
    stepOut();
    reset({ name: "room" });
  }

  let screen: React.ReactNode;
  switch (route.name) {
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
      screen = <CharacterHome onOpenSwitcher={() => setSwitcherOpen(true)} />;
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
    default:
      screen = <NotReady label={route.name} />;
  }

  // The tab bar belongs to the onstage (stepped-in) experience.
  const onstageRoutes = ["home", "profile", "post", "connections", "graph"];
  const showTabBar =
    !!activeCharacter && onstageRoutes.includes(route.name);

  return (
    <>
      {screen}
      {showTabBar && (
        <TabBar
          active={route.name === "home" ? "home" : null}
          onHome={goHome}
          onRoom={goRoom}
          onCompose={() => push({ name: "compose" })}
          onSwitch={() => setSwitcherOpen(true)}
        />
      )}
      <CharacterSwitcher open={switcherOpen} onClose={() => setSwitcherOpen(false)} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <Toast />
    </>
  );
}

export default function App() {
  const { currentAuthor, activeCharacter } = useStore();
  const themePref = currentAuthor?.settings.theme ?? "system";
  useThemeController(themePref, activeCharacter?.accentColor ?? null);

  if (!currentAuthor) return <AuthScreen />;

  return (
    <NavProvider>
      <Shell />
    </NavProvider>
  );
}
