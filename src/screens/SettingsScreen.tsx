import { useRef, useState } from "react";
import { useStore } from "../store/store";
import { useNav } from "../nav";
import type { CardDensity, ComposerFont, Privacy, ThemePref } from "../types";
import { APP_ICONS } from "../lib/appIcon";
import { fileToDataURL } from "../lib/image";
import { Avatar } from "../components/Avatar";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { IconBack, IconExport, IconImport, IconSpark, IconTrash } from "../components/icons";

type Confirm =
  | null
  | { kind: "deleteChar"; id: string; name: string }
  | { kind: "reset" }
  | { kind: "deleteAccount" }
  | { kind: "reseed" };

function SyncBadge({ status }: { status: import("../store/store").SyncStatus }) {
  if (status === "idle") return <span style={{ width: 40 }} />;
  const map: Record<string, { label: string; color: string }> = {
    syncing: { label: "Syncing…", color: "var(--muted, #888)" },
    saved: { label: "✓ Saved", color: "var(--muted, #888)" },
    error: { label: "Sync error", color: "var(--danger, #c00)" },
    offline: { label: "Offline", color: "var(--danger, #c00)" },
  };
  const { label, color } = map[status] ?? map.saved;
  return (
    <span
      aria-live="polite"
      title="Your wroom syncs to your cloud account"
      style={{ fontSize: "var(--step--1)", color, whiteSpace: "nowrap", paddingLeft: "var(--s-2)" }}
    >
      {label}
    </span>
  );
}

function Choice<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={o.value} className={value === o.value ? "on" : ""} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SettingsScreen() {
  const {
    currentAuthor,
    myCharacters,
    updateAuthor,
    changePassword,
    changeEmail,
    syncStatus,
    updateSettings,
    storageOK,
    exportRoom,
    importRoom,
    resetEverything,
    reseedDemo,
    deleteAccount,
    deleteCharacter,
    logOut,
    showToast,
  } = useStore();
  const { back, reset } = useNav();
  const importRef = useRef<HTMLInputElement>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  // Account & security forms (cloud accounts only).
  const [emailDraft, setEmailDraft] = useState(currentAuthor?.email ?? "");
  const [emailPw, setEmailPw] = useState("");
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [busyEmail, setBusyEmail] = useState(false);
  const [busyPw, setBusyPw] = useState(false);

  if (!currentAuthor) return null;
  const s = currentAuthor.settings;
  const emailChanged = emailDraft.trim().toLowerCase() !== currentAuthor.email;

  async function doChangeEmail() {
    if (busyEmail) return;
    setBusyEmail(true);
    try {
      const res = await changeEmail(emailPw, emailDraft);
      if (res.ok) {
        setEmailPw("");
        showToast("Email updated");
      } else {
        showToast(res.error);
      }
    } finally {
      setBusyEmail(false);
    }
  }

  async function doChangePassword() {
    if (busyPw) return;
    setBusyPw(true);
    try {
      const res = await changePassword(curPw, newPw);
      if (res.ok) {
        setCurPw("");
        setNewPw("");
        showToast("Password updated");
      } else {
        showToast(res.error);
      }
    } finally {
      setBusyPw(false);
    }
  }

  async function pickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      updateAuthor({ avatar: await fileToDataURL(file, 512) });
      showToast("Avatar updated");
    } catch {
      showToast("Couldn't load that image");
    }
    e.target.value = "";
  }

  function doExport() {
    const blob = new Blob([exportRoom()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `writers-room-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast("Wroom exported ✦");
  }

  async function doImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const res = importRoom(text);
    showToast(res.ok ? "Wroom imported ✦" : res.error);
    if (res.ok) reset({ name: "room" });
    e.target.value = "";
  }

  return (
    <>
      <header className="topbar">
        <div className="row spread center">
          <button className="icon-btn" aria-label="Back" onClick={back}>
            <IconBack />
          </button>
          <div className="bar-title" style={{ fontSize: "var(--step-1)" }}>
            Settings
          </div>
          <SyncBadge status={syncStatus} />
        </div>
      </header>

      <div className="app-scroll">
        <div className="screen-pad settings">
          {/* ---- Profile ---- */}
          <section className="settings-group">
            <h2 className="serif group-title">Profile</h2>
            <div className="row gap-3 center">
              <label className="uploader" style={{ borderRadius: "50%" }}>
                <Avatar name={currentAuthor.name} src={currentAuthor.avatar} accent="var(--accent)" size={60} />
                <div className="hint-overlay" style={{ borderRadius: "50%" }}>
                  Edit
                </div>
                <input type="file" accept="image/*" onChange={pickAvatar} />
              </label>
              <div className="col grow gap-2">
                <div className="field">
                  <label htmlFor="a-name">Display name</label>
                  <input
                    id="a-name"
                    className="input"
                    value={currentAuthor.name}
                    onChange={(e) => updateAuthor({ name: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="field">
              <label htmlFor="a-email">Email</label>
              <input
                id="a-email"
                className="input"
                type="email"
                autoComplete="email"
                value={emailDraft}
                onChange={(e) => setEmailDraft(e.target.value)}
              />
            </div>
            {emailChanged && (
              <div className="field">
                <label htmlFor="a-email-pw">Confirm your password to change email</label>
                <div className="row gap-2">
                  <input
                    id="a-email-pw"
                    className="input"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Current password"
                    value={emailPw}
                    onChange={(e) => setEmailPw(e.target.value)}
                  />
                  <button className="btn" disabled={busyEmail || !emailPw} onClick={doChangeEmail}>
                    {busyEmail ? "Saving…" : "Update"}
                  </button>
                </div>
              </div>
            )}
            <div className="field">
              <label htmlFor="a-new-pw">Change password</label>
              <input
                id="a-cur-pw"
                className="input"
                type="password"
                autoComplete="current-password"
                placeholder="Current password"
                value={curPw}
                onChange={(e) => setCurPw(e.target.value)}
                style={{ marginBottom: "var(--s-2)" }}
              />
              <div className="row gap-2">
                <input
                  id="a-new-pw"
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  placeholder="New password (min 8)"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                />
                <button
                  className="btn"
                  disabled={busyPw || newPw.length < 8 || !curPw}
                  onClick={doChangePassword}
                >
                  {busyPw ? "Saving…" : "Update"}
                </button>
              </div>
            </div>
          </section>

          {/* ---- Appearance ---- */}
          <section className="settings-group">
            <h2 className="serif group-title">Appearance</h2>
            <div className="field">
              <label>Theme</label>
              <Choice<ThemePref>
                value={s.theme}
                onChange={(theme) => updateSettings({ theme })}
                options={[
                  { value: "light", label: "Light" },
                  { value: "dark", label: "Dark" },
                  { value: "system", label: "System" },
                ]}
              />
            </div>
            <div className="field">
              <label>Character card density</label>
              <Choice<CardDensity>
                value={s.cardDensity}
                onChange={(cardDensity) => updateSettings({ cardDensity })}
                options={[
                  { value: "comfortable", label: "Comfortable" },
                  { value: "compact", label: "Compact" },
                ]}
              />
            </div>
            <div className="field">
              <label>App icon</label>
              <div className="icon-picker">
                {APP_ICONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    className={`icon-option ${(s.appIcon ?? "cream") === opt.key ? "on" : ""}`}
                    aria-pressed={(s.appIcon ?? "cream") === opt.key}
                    onClick={() => updateSettings({ appIcon: opt.key })}
                  >
                    <img src={opt.src} alt="" width={56} height={56} />
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
              <span className="hint">
                Sets the brand mark in the app and your browser-tab icon.
              </span>
            </div>
          </section>

          {/* ---- Writing ---- */}
          <section className="settings-group">
            <h2 className="serif group-title">Writing</h2>
            <div className="field">
              <label>Composer font</label>
              <Choice<ComposerFont>
                value={s.composerFont}
                onChange={(composerFont) => updateSettings({ composerFont })}
                options={[
                  { value: "serif", label: "Serif" },
                  { value: "sans", label: "Sans" },
                ]}
              />
            </div>
            <div className="field">
              <label htmlFor="limit">
                Default post length limit:{" "}
                <strong className="mono-num">{s.defaultPostLimit}</strong>
              </label>
              <input
                id="limit"
                type="range"
                min={80}
                max={1000}
                step={20}
                value={s.defaultPostLimit}
                onChange={(e) => updateSettings({ defaultPostLimit: Number(e.target.value) })}
                style={{ accentColor: "var(--accent)" }}
              />
            </div>
            <label className="toggle-row">
              <span>Autosave drafts</span>
              <input
                type="checkbox"
                checked={s.autosave}
                onChange={(e) => updateSettings({ autosave: e.target.checked })}
                style={{ accentColor: "var(--accent)", width: 20, height: 20 }}
              />
            </label>
          </section>

          {/* ---- Privacy ---- */}
          <section className="settings-group">
            <h2 className="serif group-title">Privacy</h2>
            <div className="field">
              <label>Default for new characters</label>
              <Choice<Privacy>
                value={s.defaultPrivacy}
                onChange={(defaultPrivacy) => updateSettings({ defaultPrivacy })}
                options={[
                  { value: "private", label: "Private" },
                  { value: "shareable", label: "Shareable" },
                ]}
              />
            </div>
            <label className="toggle-row">
              <span>
                Keep everything private
                <br />
                <span className="dim" style={{ fontSize: "var(--step--1)" }}>
                  Nothing leaves this device unless you explicitly share it.
                </span>
              </span>
              <input
                type="checkbox"
                checked={s.keepEverythingPrivate}
                onChange={(e) => updateSettings({ keepEverythingPrivate: e.target.checked })}
                style={{ accentColor: "var(--accent)", width: 20, height: 20 }}
              />
            </label>
            {!storageOK && (
              <p className="dim" style={{ fontSize: "var(--step--1)" }}>
                Browser storage is unavailable here, so your wroom lives only in
                this session — use Export below to keep your work.
              </p>
            )}
          </section>

          {/* ---- Data ---- */}
          <section className="settings-group">
            <h2 className="serif group-title">Data</h2>
            <button className="btn btn-block" onClick={doExport}>
              <IconExport size={18} /> Export wroom as JSON
            </button>
            <button className="btn btn-block" onClick={() => importRef.current?.click()}>
              <IconImport size={18} /> Import a wroom
            </button>
            <input
              ref={importRef}
              type="file"
              accept="application/json,.json"
              onChange={doImport}
              style={{ display: "none" }}
            />
            <button className="btn btn-block" onClick={() => setConfirm({ kind: "reseed" })}>
              Reload the demo wroom
            </button>

            {myCharacters.length > 0 && (
              <>
                <div className="section-label">Delete a character</div>
                {myCharacters.map((c) => (
                  <div key={c.id} className="row spread center delete-row">
                    <div className="row gap-2 center">
                      <Avatar name={c.displayName} src={c.avatar} accent={c.accentColor} size={32} />
                      <span className="serif">{c.displayName}</span>
                    </div>
                    <button
                      className="icon-btn"
                      style={{ color: "var(--danger)" }}
                      aria-label={`Delete ${c.displayName}`}
                      onClick={() => setConfirm({ kind: "deleteChar", id: c.id, name: c.displayName })}
                    >
                      <IconTrash />
                    </button>
                  </div>
                ))}
              </>
            )}
          </section>

          {/* ---- Danger ---- */}
          <section className="settings-group">
            <h2 className="serif group-title" style={{ color: "var(--danger)" }}>
              Danger zone
            </h2>
            <button className="btn btn-danger btn-block" onClick={() => setConfirm({ kind: "reset" })}>
              Clear everything & start fresh
            </button>
            <button className="btn btn-danger btn-block" onClick={() => setConfirm({ kind: "deleteAccount" })}>
              Delete my account
            </button>
          </section>

          {/* ---- About ---- */}
          <section className="settings-group">
            <h2 className="serif group-title">About</h2>
            <p className="serif muted">
              <IconSpark size={14} /> Writer's Room is a tool for authoring fiction.
              Every character is invented and every post is make-believe — a
              writer's craft, never a real or affiliated account. Your wroom is
              private to your account and synced securely across your devices.
            </p>
            <button className="btn btn-block" style={{ marginTop: "var(--s-3)" }} onClick={logOut}>
              Log out
            </button>
          </section>
        </div>
      </div>

      <ConfirmDialog
        open={confirm?.kind === "deleteChar"}
        title="Delete character?"
        body={
          confirm?.kind === "deleteChar"
            ? `${confirm.name} and all of their posts will be permanently removed from your wroom.`
            : ""
        }
        confirmLabel="Delete"
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm?.kind === "deleteChar") {
            deleteCharacter(confirm.id);
            showToast("Character deleted");
          }
          setConfirm(null);
        }}
      />
      <ConfirmDialog
        open={confirm?.kind === "reseed"}
        title="Reload the demo wroom?"
        body="This replaces your current wroom with the example 'Lamplight' wroom. Export first if you want to keep your work."
        confirmLabel="Reload demo"
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          reseedDemo();
          setConfirm(null);
          reset({ name: "room" });
          showToast("Demo wroom loaded");
        }}
      />
      <ConfirmDialog
        open={confirm?.kind === "reset"}
        title="Clear everything?"
        body="Every character, post, and follow in your wroom will be permanently deleted. This cannot be undone."
        confirmLabel="Clear everything"
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          resetEverything();
          setConfirm(null);
          reset({ name: "room" });
          showToast("Your wroom is empty");
        }}
      />
      <ConfirmDialog
        open={confirm?.kind === "deleteAccount"}
        title="Delete your account?"
        body="Your account and your entire wroom will be permanently deleted. This cannot be undone."
        confirmLabel="Delete account"
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          deleteAccount();
          setConfirm(null);
        }}
      />
    </>
  );
}
