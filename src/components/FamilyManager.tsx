import { FormEvent, useEffect, useState } from "react";
import { Family, Profile } from "../types";

interface FamilyManagerProps {
  family: Family | null;
  members: Profile[];
  currentProfile: Profile;
  busy: boolean;
  onCreateFamily: (name: string) => Promise<void>;
  onJoinFamily: (inviteCode: string) => Promise<void>;
  onUpdateProfile: (displayName: string, color: string) => Promise<void>;
}

export function FamilyManager({
  family,
  members,
  currentProfile,
  busy,
  onCreateFamily,
  onJoinFamily,
  onUpdateProfile,
}: FamilyManagerProps) {
  const [familyName, setFamilyName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [displayName, setDisplayName] = useState(currentProfile.display_name);
  const [color, setColor] = useState(currentProfile.color);

  useEffect(() => {
    setDisplayName(currentProfile.display_name);
    setColor(currentProfile.color);
  }, [currentProfile.color, currentProfile.display_name]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onCreateFamily(familyName);
    setFamilyName("");
  }

  async function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onJoinFamily(inviteCode);
    setInviteCode("");
  }

  async function handleProfileSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onUpdateProfile(displayName, color);
  }

  return (
    <div className="dashboard-grid family-layout">
      <section className="card">
        <h2>Mein Profil</h2>
        <form className="form-stack" onSubmit={handleProfileSave}>
          <label>
            Name
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              required
            />
          </label>
          <label>
            Meine Farbe
            <input
              value={color}
              onChange={(event) => setColor(event.target.value)}
              type="color"
            />
          </label>
          <button className="primary-button" type="submit" disabled={busy}>
            Profil speichern
          </button>
        </form>
      </section>

      <section className="card">
        <h2>{family ? "Familienkonto" : "Familienkonto verknüpfen"}</h2>
        {family ? (
          <div className="family-summary">
            <div>
              <span className="muted-label">Name</span>
              <strong>{family.name}</strong>
            </div>
            <div>
              <span className="muted-label">Einladungscode</span>
              <code>{family.invite_code}</code>
            </div>
            <p className="muted-text">
              Teile den Code mit Partner oder Familie, damit sie demselben
              Familienbereich beitreten können.
            </p>
          </div>
        ) : (
          <div className="setup-stack">
            <form className="form-stack" onSubmit={handleCreate}>
              <h3>Neue Familie erstellen</h3>
              <label>
                Familienname
                <input
                  value={familyName}
                  onChange={(event) => setFamilyName(event.target.value)}
                  placeholder="z. B. Familie Vika"
                  required
                />
              </label>
              <button className="primary-button" type="submit" disabled={busy}>
                Familie anlegen
              </button>
            </form>

            <div className="divider">oder</div>

            <form className="form-stack" onSubmit={handleJoin}>
              <h3>Bestehender Familie beitreten</h3>
              <label>
                Einladungscode
                <input
                  value={inviteCode}
                  onChange={(event) =>
                    setInviteCode(event.target.value.toUpperCase())
                  }
                  placeholder="ABC12345"
                  required
                />
              </label>
              <button
                className="secondary-button"
                type="submit"
                disabled={busy}
              >
                Mit Familie verknüpfen
              </button>
            </form>
          </div>
        )}
      </section>

      <section className="card family-members">
        <h2>Personen</h2>
        {members.length === 0 ? (
          <p className="muted-text">
            Sobald Personen verbunden sind, erscheinen sie hier.
          </p>
        ) : (
          <div className="person-list">
            {members.map((member) => (
              <div className="person-row" key={member.id}>
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
