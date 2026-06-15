import { useMemo, useState } from "react";
import { useStore } from "../store/store";
import { useNav } from "../nav";
import type { Privacy } from "../types";
import { ACCENT_PALETTE, randomAccent } from "../lib/color";
import { gradientBanner } from "../lib/avatars";
import { fileToDataURL } from "../lib/image";
import { Avatar } from "../components/Avatar";
import { PrivacyBadge } from "../components/PrivacyBadge";
import { IconBack, IconLock, IconGlobe } from "../components/icons";

export function CharacterEditor({ editId }: { editId?: string }) {
  const {
    db,
    currentAuthor,
    createCharacter,
    updateCharacter,
    normalizeHandle,
    isHandleAvailable,
  } = useStore();
  const { back, reset } = useNav();

  const existing = editId ? db.characters.find((c) => c.id === editId) : undefined;

  const [displayName, setDisplayName] = useState(existing?.displayName ?? "");
  const [handle, setHandle] = useState(existing?.handle ?? "");
  const [bio, setBio] = useState(existing?.bio ?? "");
  const [pronouns, setPronouns] = useState(existing?.pronouns ?? "");
  const [occupation, setOccupation] = useState(existing?.occupation ?? "");
  const [location, setLocation] = useState(existing?.location ?? "");
  const [eraTag, setEraTag] = useState(existing?.eraTag ?? "");
  const [voiceNote, setVoiceNote] = useState(existing?.voiceNote ?? "");
  const [accent, setAccent] = useState(existing?.accentColor ?? randomAccent());
  const [avatar, setAvatar] = useState<string | undefined>(existing?.avatar);
  const [banner, setBanner] = useState<string | undefined>(existing?.banner);
  const [tags, setTags] = useState(existing?.tags.join(", ") ?? "");
  const [privacy, setPrivacy] = useState<Privacy>(
    existing?.privacy ?? currentAuthor?.settings.defaultPrivacy ?? "private"
  );
  const [imgError, setImgError] = useState<string | null>(null);

  const normalized = normalizeHandle(handle);
  const handleTaken =
    normalized.length > 0 && !isHandleAvailable(normalized, existing?.id);
  const canSave = displayName.trim().length > 0 && normalized.length > 0 && !handleTaken;

  const previewName = displayName.trim() || "Your character";

  async function pick(
    e: React.ChangeEvent<HTMLInputElement>,
    set: (v: string) => void,
    maxDim: number
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgError(null);
    try {
      set(await fileToDataURL(file, maxDim));
    } catch (err) {
      setImgError(err instanceof Error ? err.message : "Couldn't load that image.");
    }
    e.target.value = "";
  }

  function save() {
    if (!canSave) return;
    const tagList = tags
      .split(",")
      .map((t) => t.trim().replace(/^#/, ""))
      .filter(Boolean);
    const payload = {
      displayName,
      handle: normalized,
      bio,
      pronouns,
      occupation,
      location,
      eraTag,
      voiceNote,
      accentColor: accent,
      avatar,
      banner,
      tags: tagList,
      privacy,
    };
    if (existing) {
      updateCharacter(existing.id, payload);
      back();
    } else {
      createCharacter(payload);
      reset({ name: "room" });
    }
  }

  const bannerBg = banner ? `url(${banner}) center/cover` : gradientBanner(accent);
  const flavor = useMemo(
    () => [pronouns, occupation, location, eraTag].filter(Boolean),
    [pronouns, occupation, location, eraTag]
  );

  return (
    <>
      <header className="topbar">
        <div className="row spread center">
          <button className="icon-btn" aria-label="Back" onClick={back}>
            <IconBack />
          </button>
          <div className="bar-title" style={{ fontSize: "var(--step-1)" }}>
            {existing ? "Edit character" : "New character"}
          </div>
          <button
            className="btn btn-primary"
            disabled={!canSave}
            onClick={save}
          >
            {existing ? "Save" : "Create"}
          </button>
        </div>
      </header>

      <div className="app-scroll">
        <div className="screen-pad editor-grid fade-in">
          {/* ---- Live preview ---- */}
          <div>
            <div className="section-label" style={{ marginTop: 0 }}>
              Live preview
            </div>
            <div className="preview-card" style={{ ["--accent" as string]: accent }}>
              <div className="preview-banner" style={{ background: bannerBg }} />
              <div className="preview-inner">
                <div className="preview-avatar">
                  <Avatar name={previewName} src={avatar} accent={accent} size={64} ring />
                </div>
                <div className="row spread center" style={{ marginTop: 6 }}>
                  <div style={{ minWidth: 0 }}>
                    <div className="serif" style={{ fontSize: "var(--step-2)", fontWeight: 600 }}>
                      {previewName}
                    </div>
                    <div className="handle">@{normalized || "handle"}</div>
                  </div>
                  <span className="fiction-tag">✦ Fiction</span>
                </div>
                {bio.trim() && (
                  <p className="serif" style={{ marginTop: "var(--s-3)", color: "var(--ink)" }}>
                    {bio}
                  </p>
                )}
                {flavor.length > 0 && (
                  <div className="flavor-row">
                    {flavor.map((f) => (
                      <span key={f} className="pill">
                        {f}
                      </span>
                    ))}
                  </div>
                )}
                {voiceNote.trim() && (
                  <p
                    className="serif"
                    style={{
                      marginTop: "var(--s-3)",
                      color: "var(--accent)",
                      fontStyle: "italic",
                      fontSize: "var(--step--1)",
                    }}
                  >
                    Voice: “{voiceNote}”
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ---- Images ---- */}
          <div className="field">
            <label>Banner & avatar</label>
            <label className="uploader" style={{ height: 110 }}>
              <div style={{ height: "100%", background: bannerBg }} />
              <div className="hint-overlay">Tap to set banner image</div>
              <input type="file" accept="image/*" onChange={(e) => pick(e, setBanner, 1400)} />
            </label>
            <div className="row gap-3 center" style={{ marginTop: "var(--s-2)" }}>
              <label className="uploader" style={{ borderRadius: "50%" }}>
                <Avatar name={previewName} src={avatar} accent={accent} size={64} />
                <div className="hint-overlay" style={{ borderRadius: "50%" }}>
                  Avatar
                </div>
                <input type="file" accept="image/*" onChange={(e) => pick(e, setAvatar, 512)} />
              </label>
              <div className="col gap-1">
                {(avatar || banner) && (
                  <button
                    className="btn btn-ghost"
                    onClick={() => {
                      setAvatar(undefined);
                      setBanner(undefined);
                    }}
                  >
                    Clear images
                  </button>
                )}
                <span className="hint">Defaults use the accent color.</span>
              </div>
            </div>
            {imgError && (
              <p style={{ color: "var(--danger)", fontSize: "var(--step--1)" }}>{imgError}</p>
            )}
          </div>

          {/* ---- Identity ---- */}
          <div className="field">
            <label htmlFor="c-name">Display name</label>
            <input
              id="c-name"
              className="input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Vera Sloane"
            />
          </div>

          <div className="field">
            <label htmlFor="c-handle">Handle</label>
            <div className="row center" style={{ position: "relative" }}>
              <span
                className="dim"
                style={{ position: "absolute", left: 14, fontWeight: 600 }}
              >
                @
              </span>
              <input
                id="c-handle"
                className="input"
                style={{ paddingLeft: 28, borderColor: handleTaken ? "var(--danger)" : undefined }}
                value={normalized}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="handle"
                autoCapitalize="none"
                autoCorrect="off"
              />
            </div>
            {handleTaken ? (
              <span className="hint" style={{ color: "var(--danger)" }}>
                Another account in your wroom already uses @{normalized}.
              </span>
            ) : (
              <span className="hint">Unique within your wroom. Letters, numbers, . and _</span>
            )}
          </div>

          <div className="field">
            <label htmlFor="c-bio">Bio</label>
            <textarea
              id="c-bio"
              className="textarea"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A line or two in their voice."
              maxLength={300}
            />
          </div>

          {/* ---- Flavor ---- */}
          <div className="row gap-3 wrap">
            <div className="field" style={{ flex: 1, minWidth: 130 }}>
              <label htmlFor="c-pron">Pronouns</label>
              <input id="c-pron" className="input" value={pronouns} onChange={(e) => setPronouns(e.target.value)} placeholder="she/her" />
            </div>
            <div className="field" style={{ flex: 1, minWidth: 130 }}>
              <label htmlFor="c-occ">Occupation</label>
              <input id="c-occ" className="input" value={occupation} onChange={(e) => setOccupation(e.target.value)} placeholder="Private investigator" />
            </div>
          </div>
          <div className="row gap-3 wrap">
            <div className="field" style={{ flex: 1, minWidth: 130 }}>
              <label htmlFor="c-loc">Location</label>
              <input id="c-loc" className="input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Lamplight City" />
            </div>
            <div className="field" style={{ flex: 1, minWidth: 130 }}>
              <label htmlFor="c-era">Era / world</label>
              <input id="c-era" className="input" value={eraTag} onChange={(e) => setEraTag(e.target.value)} placeholder="1947 · noir" />
            </div>
          </div>

          <div className="field">
            <label htmlFor="c-voice">Voice note</label>
            <input
              id="c-voice"
              className="input"
              value={voiceNote}
              onChange={(e) => setVoiceNote(e.target.value)}
              placeholder="How do they speak? (shown by the composer)"
            />
            <span className="hint">A one-line reminder you'll see while writing as them.</span>
          </div>

          <div className="field">
            <label htmlFor="c-tags">Tags</label>
            <input
              id="c-tags"
              className="input"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="noir, detective (comma separated)"
            />
          </div>

          {/* ---- Accent ---- */}
          <div className="field">
            <label>Accent color</label>
            <span className="hint">Drives the whole app when you step into them.</span>
            <div className="accent-swatches" style={{ marginTop: "var(--s-2)" }}>
              {ACCENT_PALETTE.map((c) => (
                <button
                  key={c}
                  className="swatch"
                  style={{ background: c }}
                  aria-pressed={accent === c}
                  aria-label={`Accent ${c}`}
                  onClick={() => setAccent(c)}
                />
              ))}
              <label
                className="swatch"
                style={{
                  background: `conic-gradient(from 0deg, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)`,
                  position: "relative",
                  overflow: "hidden",
                }}
                title="Custom color"
              >
                <input
                  type="color"
                  value={accent}
                  onChange={(e) => setAccent(e.target.value)}
                  style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
                />
              </label>
            </div>
          </div>

          {/* ---- Privacy ---- */}
          <div className="field">
            <label>Privacy</label>
            <div className="row gap-2">
              <button
                className={`btn ${privacy === "private" ? "btn-primary" : ""}`}
                style={{ flex: 1 }}
                onClick={() => setPrivacy("private")}
              >
                <IconLock size={15} /> Private
              </button>
              <button
                className={`btn ${privacy === "shareable" ? "btn-primary" : ""}`}
                style={{ flex: 1 }}
                onClick={() => setPrivacy("shareable")}
              >
                <IconGlobe size={15} /> Shareable
              </button>
            </div>
            <span className="hint row gap-1 center" style={{ marginTop: 4 }}>
              <PrivacyBadge privacy={privacy} />
              {privacy === "private"
                ? "Only you can see this character."
                : "Creates a read-only, watermarked view you can export and share."}
            </span>
          </div>

          <button
            className="btn btn-primary btn-lg btn-block"
            disabled={!canSave}
            onClick={save}
            style={{ marginTop: "var(--s-2)" }}
          >
            {existing ? "Save changes" : "Create character"}
          </button>
        </div>
      </div>
    </>
  );
}
