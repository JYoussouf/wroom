import { useState } from "react";
import { useStore } from "../store/store";
import { IconSpark } from "../components/icons";
import { BRAND_MARK } from "../lib/appIcon";

type Mode = "in" | "up";

export function AuthScreen() {
  const { logIn, signUp, enterDemo } = useStore();
  const [mode, setMode] = useState<Mode>("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const res =
        mode === "up" ? await signUp(name, email, password) : await logIn(email, password);
      if (!res.ok) setError(res.error);
    } finally {
      setBusy(false);
    }
  }

  function demo() {
    setError(null);
    enterDemo();
  }

  return (
    <div className="app-scroll">
      <div
        className="screen-pad fade-in"
        style={{
          minHeight: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          paddingTop: "calc(var(--safe-top) + var(--s-7))",
        }}
      >
        <div style={{ maxWidth: 420, width: "100%", margin: "0 auto" }}>
          <img
            src={BRAND_MARK}
            alt="Writer's Room"
            width={72}
            height={72}
            style={{
              width: 72,
              height: 72,
              marginBottom: "var(--s-4)",
              display: "block",
            }}
          />
          <span className="fiction-tag">
            <IconSpark size={13} /> A tool for fiction
          </span>

          <h1
            className="serif"
            style={{ fontSize: "var(--step-5)", marginTop: "var(--s-4)", lineHeight: 1.04 }}
          >
            Writer's Room
          </h1>
          <p
            className="muted serif"
            style={{ fontSize: "var(--step-1)", marginTop: "var(--s-2)", maxWidth: "34ch" }}
          >
            Run a wroom of invented characters. Step into one at a time. Write each
            persona as if you were becoming someone.
          </p>

          <form
            onSubmit={submit}
            className="card"
            style={{
              marginTop: "var(--s-6)",
              padding: "var(--s-5)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--s-4)",
            }}
          >
            <div className="row gap-1" role="tablist" aria-label="Authentication mode">
              <button
                type="button"
                role="tab"
                aria-selected={mode === "in"}
                className={`btn ${mode === "in" ? "btn-primary" : "btn-ghost"}`}
                style={{ flex: 1 }}
                onClick={() => { setMode("in"); setError(null); }}
              >
                Log in
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "up"}
                className={`btn ${mode === "up" ? "btn-primary" : "btn-ghost"}`}
                style={{ flex: 1 }}
                onClick={() => { setMode("up"); setError(null); }}
              >
                Sign up
              </button>
            </div>

            {mode === "up" && (
              <div className="field">
                <label htmlFor="auth-name">Your name</label>
                <input
                  id="auth-name"
                  className="input"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="The author behind the wroom"
                />
              </div>
            )}

            <div className="field">
              <label htmlFor="auth-email">Email</label>
              <input
                id="auth-email"
                className="input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <div className="field">
              <label htmlFor="auth-password">Password</label>
              <input
                id="auth-password"
                className="input"
                type="password"
                autoComplete={mode === "up" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "up" ? "Choose a password" : "Your password"}
              />
            </div>

            {error && (
              <p
                role="alert"
                style={{ color: "var(--danger)", fontSize: "var(--step--1)", margin: 0 }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-lg btn-block"
              disabled={busy}
            >
              {busy
                ? mode === "up"
                  ? "Creating…"
                  : "Signing in…"
                : mode === "up"
                  ? "Create your wroom"
                  : "Enter your wroom"}
            </button>

            <button
              type="button"
              className="btn btn-ghost btn-block"
              onClick={demo}
              disabled={busy}
              style={{ marginTop: "calc(-1 * var(--s-2))" }}
            >
              Explore the demo wroom →
            </button>
          </form>

          <p
            className="dim"
            style={{ fontSize: "var(--step--1)", marginTop: "var(--s-5)", textAlign: "center", lineHeight: 1.6 }}
          >
            Your wroom is private to your account and synced securely so you can
            pick it up on any device. Writer's Room is for authoring fiction —
            every character is invented and every post is make-believe.
          </p>
        </div>
      </div>
    </div>
  );
}
