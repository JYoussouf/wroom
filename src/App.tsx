import { useStore } from "./store/store";
import { useThemeController } from "./lib/theme";
import { NavProvider, useNav } from "./nav";
import { AuthScreen } from "./screens/AuthScreen";
import { RoomScreen } from "./screens/RoomScreen";
import { CharacterEditor } from "./screens/CharacterEditor";

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
  const { route } = useNav();

  switch (route.name) {
    case "room":
      return <RoomScreen />;
    case "character-new":
      return <CharacterEditor />;
    case "character-edit":
      return <CharacterEditor editId={route.id} />;
    default:
      return <NotReady label={route.name} />;
  }
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
