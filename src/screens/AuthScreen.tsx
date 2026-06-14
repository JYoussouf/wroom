import { useState } from "react";
import { useStore } from "../store/store";
import { DEMO_EMAIL, DEMO_PASSWORD } from "../store/seed";
import { IconSpark } from "../components/icons";

type Mode = "in" | "up";

export function AuthScreen() {
  const { logIn, signUp } = useStore();
  const [mode, setMode] = useState<Mode>("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res =
      mode === "up" ? signUp(name, email, password) : logIn(email, password);
    if (!res.ok) setError(res.error);
  }

  function demo() {
    setError(null);
    const res = logIn(DEMO_EMAIL, DEMO_PASSWORD);
    if (!res.ok) setError(res.error);
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
            Run a room of invented characters. Step into one at a time. Write each
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
                  placeholder="The author behind the room"
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
                placeholder="••••••••"
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

            <button type="submit" className="btn btn-primary btn-lg btn-block">
              {mode === "up" ? "Create your room" : "Enter your room"}
            </button>

            <button
              type="button"
              className="btn btn-ghost btn-block"
              onClick={demo}
              style={{ marginTop: "calc(-1 * var(--s-2))" }}
            >
              Explore the demo room →
            </button>
          </form>

          <p
            className="dim"
            style={{ fontSize: "var(--step--1)", marginTop: "var(--s-5)", textAlign: "center", lineHeight: 1.6 }}
          >
            Everything you write stays private to you on this device. Writer's Room
            is for authoring fiction — every character is invented and every post
            is make-believe.
          </p>
        </div>
      </div>
    </div>
  );
}
