import { useStore } from "./store/store";
import { useThemeController } from "./lib/theme";
import { NavProvider, useNav } from "./nav";
import { AuthScreen } from "./screens/AuthScreen";

function Shell() {
  const { currentAuthor, logOut, myCharacters } = useStore();
  const { route } = useNav();

  return (
    <div className="app-scroll">
      <div className="screen-pad fade-in">
        <h1 style={{ fontSize: "var(--step-3)" }}>
          Welcome back, {currentAuthor?.name}
        </h1>
        <p className="muted serif">
          {myCharacters.length} characters in your room. Screens land in the next
          commits — current route: <code>{route.name}</code>.
        </p>
        <button
          className="btn"
          style={{ marginTop: "var(--s-4)" }}
          onClick={logOut}
        >
          Log out
        </button>
      </div>
    </div>
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
