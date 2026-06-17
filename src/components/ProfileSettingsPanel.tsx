import { FormEvent, useEffect, useMemo, useState } from "react";
import type { NotificationSupportState } from "../lib/notifications";
import {
  Family,
  Profile,
  ProfileSettingsInput,
  ThemePreference,
} from "../types";

interface ProfileSettingsPanelProps {
  currentProfile: Profile;
  family: Family | null;
  members: Profile[];
  busy: boolean;
  notificationPermission: NotificationSupportState;
  onUpdateProfile: (input: ProfileSettingsInput) => Promise<void>;
  onChangePassword: (newPassword: string) => Promise<void>;
  onLeaveFamily: () => Promise<void>;
  onDeleteAccount: () => Promise<void>;
}

const THEME_OPTIONS: Array<{ value: ThemePreference; label: string }> = [
  { value: "system", label: "System" },
  { value: "light", label: "Hell" },
  { value: "dark", label: "Dunkel" },
];

function getNotificationLabel(permission: NotificationSupportState) {
  if (permission === "granted") {
    return "Aktiv";
  }

  if (permission === "denied") {
    return "Blockiert";
  }

  if (permission === "unsupported") {
    return "Nicht unterstützt";
  }

  return "Noch nicht aktiviert";
}

export function ProfileSettingsPanel({
  currentProfile,
  family,
  members,
  busy,
  notificationPermission,
  onUpdateProfile,
  onChangePassword,
  onLeaveFamily,
  onDeleteAccount,
}: ProfileSettingsPanelProps) {
  const [displayName, setDisplayName] = useState(currentProfile.display_name);
  const [color, setColor] = useState(currentProfile.color);
  const [avatarUrl, setAvatarUrl] = useState(currentProfile.avatar_url ?? "");
  const [themePreference, setThemePreference] = useState<ThemePreference>(
    currentProfile.theme_preference,
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    setDisplayName(currentProfile.display_name);
    setColor(currentProfile.color);
    setAvatarUrl(currentProfile.avatar_url ?? "");
    setThemePreference(currentProfile.theme_preference);
  }, [
    currentProfile.avatar_url,
    currentProfile.color,
    currentProfile.display_name,
    currentProfile.theme_preference,
  ]);

  const initials = useMemo(() => {
    return currentProfile.display_name
      .split(" ")
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 2);
  }, [currentProfile.display_name]);

  const avatarPreview = avatarUrl.trim() || currentProfile.avatar_url;
  const isOwner = family?.owner_id === currentProfile.id;
  const isOnlyMember = members.length <= 1;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onUpdateProfile({
      displayName,
      color,
      avatarUrl,
      themePreference,
    });
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password.length < 6) {
      window.alert("Das Passwort muss mindestens 6 Zeichen lang sein.");
      return;
    }

    if (password !== confirmPassword) {
      window.alert("Die Passwörter stimmen nicht überein.");
      return;
    }

    await onChangePassword(password);
    setPassword("");
    setConfirmPassword("");
  }

  async function handleLeaveFamily() {
    const confirmed = window.confirm(
      family
        ? `Willst du ${family.name} wirklich verlassen?`
        : "Willst du dein aktuelles Familienkonto wirklich verlassen?",
    );

    if (!confirmed) {
      return;
    }

    await onLeaveFamily();
  }

  async function handleDeleteAccount() {
    const confirmed = window.confirm(
      "Willst du deinen Account wirklich löschen? Dieser Schritt kann nicht rückgängig gemacht werden.",
    );

    if (!confirmed) {
      return;
    }

    await onDeleteAccount();
  }

  return (
    <div className="dashboard-grid profile-layout">
      <section className="card">
        <div className="profile-hero">
          {avatarPreview ? (
            <img
              alt={`Avatar von ${currentProfile.display_name}`}
              className="profile-avatar profile-avatar-image"
              src={avatarPreview}
            />
          ) : (
            <div
              className="profile-avatar"
              style={{ backgroundColor: currentProfile.color }}
            >
              {initials || "P"}
            </div>
          )}
          <div>
            <h2>{currentProfile.display_name}</h2>
            <p>{currentProfile.email}</p>
            <div className="badge-row">
              <span className="pill">
                {family ? family.name : "Kein Familienkonto"}
              </span>
              <span className="pill">{members.length} Personen verbunden</span>
              <span className="pill">Theme: {themePreference}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="card">
        <span className="eyebrow">Profil</span>
        <h2>Persönliche Daten</h2>
        <p className="muted-text">
          Dein öffentlicher Name, dein Avatar und die Darstellung in der App.
        </p>
        <form className="form-stack" onSubmit={handleSubmit}>
          <label>
            Anzeigename
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Wie sollen dich andere sehen?"
              required
            />
          </label>
          <label>
            E-Mail
            <input value={currentProfile.email} type="email" disabled />
          </label>
          <label>
            Theme
            <select
              value={themePreference}
              onChange={(event) =>
                setThemePreference(event.target.value as ThemePreference)
              }
            >
              {THEME_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Personenfarbe
            <div className="color-settings-row">
              <input
                value={color}
                onChange={(event) => setColor(event.target.value)}
                type="color"
              />
              <span
                className="person-badge"
                style={{ backgroundColor: `${color}22`, color }}
              >
                Vorschau für Termine und Listen
              </span>
            </div>
          </label>
          <button className="primary-button" type="submit" disabled={busy}>
            Profil speichern
          </button>
        </form>
      </section>

      <section className="card compact-card">
        <h2>Sicherheit</h2>
        <p className="muted-text">
          Ändere dein Passwort direkt in deinem Account.
        </p>
        <form className="form-stack" onSubmit={handlePasswordSubmit}>
          <label>
            Neues Passwort
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              minLength={6}
              placeholder="Mindestens 6 Zeichen"
              required
            />
          </label>
          <label>
            Passwort wiederholen
            <input
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              type="password"
              minLength={6}
              required
            />
          </label>
          <button className="secondary-button" type="submit" disabled={busy}>
            Passwort ändern
          </button>
        </form>
      </section>

      <section className="card compact-card">
        <h2>Benachrichtigungen</h2>
        <div className="form-stack">
          <div>
            <span className="muted-label">Status</span>
            <strong>{getNotificationLabel(notificationPermission)}</strong>
          </div>
          <p className="muted-text">
            Die App fragt beim ersten Öffnen automatisch nach der Berechtigung.
            Falls Benachrichtigungen blockiert wurden, kannst du sie später in
            den Browser- oder App-Einstellungen wieder erlauben.
          </p>
        </div>
      </section>

      <section className="card compact-card">
        <h2>Familienkonto</h2>
        <div className="form-stack">
          <p className="muted-text">
            {isOwner
              ? isOnlyMember
                ? "Da du aktuell alleiniger Eigentümer und das einzige Mitglied bist, wird das Familienkonto beim Verlassen vollständig gelöscht."
                : "Du bist Eigentümer der Familie. Solange noch andere Mitglieder drin sind, musst du das Konto erst übertragen oder aufräumen."
              : "Du kannst dein aktuelles Familienkonto jederzeit verlassen."}
          </p>
          <button
            className={
              isOwner && isOnlyMember ? "danger-button" : "secondary-button"
            }
            disabled={busy || !family || (Boolean(isOwner) && !isOnlyMember)}
            onClick={() => void handleLeaveFamily()}
            type="button"
          >
            {isOwner && isOnlyMember
              ? "Familienkonto löschen"
              : "Familie verlassen"}
          </button>
        </div>
      </section>

      <section className="card compact-card">
        <h2>Account löschen</h2>
        <div className="form-stack">
          <p className="muted-text">
            Dadurch wird dein Benutzerkonto dauerhaft gelöscht. Eigene
            Familienkonten und damit verknüpfte Daten können dabei ebenfalls
            entfernt werden.
          </p>
          <button
            className="danger-button"
            disabled={busy}
            onClick={() => void handleDeleteAccount()}
            type="button"
          >
            Account dauerhaft löschen
          </button>
        </div>
      </section>

      <section className="card profile-full-width">
        <div className="section-header">
          <h2>Mein Platz in der Familie</h2>
          <span className="pill">{members.length} Profile</span>
        </div>
        {members.length === 0 ? (
          <p className="muted-text">
            Noch keine verbundenen Profile vorhanden.
          </p>
        ) : (
          <div className="person-list">
            {members.map((member) => (
              <div className="person-row list-card compact" key={member.id}>
                <span
                  className="color-dot"
                  style={{ backgroundColor: member.color }}
                  aria-hidden="true"
                />
                <div>
                  <strong>{member.display_name}</strong>
                  <p>{member.email}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
