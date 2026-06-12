import { FormEvent, useEffect, useMemo, useState } from "react";
import { Family, Profile } from "../types";

interface FamilyManagerProps {
  family: Family | null;
  members: Profile[];
  currentProfile: Profile;
  busy: boolean;
  onCreateFamily: (name: string) => Promise<void>;
  onJoinFamily: (inviteCode: string) => Promise<void>;
  onUpdateProfile: (displayName: string, color: string) => Promise<void>;
  onCopyInviteCode: (inviteCode: string) => Promise<void>;
  onTransferOwnership: (memberId: string) => Promise<void>;
  onRemoveMember: (member: Profile) => Promise<void>;
}

export function FamilyManager({
  family,
  members,
  currentProfile,
  busy,
  onCreateFamily,
  onJoinFamily,
  onUpdateProfile,
  onCopyInviteCode,
  onTransferOwnership,
  onRemoveMember,
}: FamilyManagerProps) {
  const [familyName, setFamilyName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [displayName, setDisplayName] = useState(currentProfile.display_name);
  const [color, setColor] = useState(currentProfile.color);

  useEffect(() => {
    setDisplayName(currentProfile.display_name);
    setColor(currentProfile.color);
  }, [currentProfile.color, currentProfile.display_name]);

  const isOwner = family?.owner_id === currentProfile.id;
  const transferableMembers = useMemo(
    () => members.filter((member) => member.id !== currentProfile.id),
    [currentProfile.id, members],
  );

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

  async function handleRemove(member: Profile) {
    const confirmed = window.confirm(
      `${member.display_name} wirklich aus der Familie entfernen?`,
    );

    if (!confirmed) {
      return;
    }

    await onRemoveMember(member);
  }

  async function handleTransfer(memberId: string) {
    const member = members.find((entry) => entry.id === memberId);
    if (!member) {
      return;
    }

    const confirmed = window.confirm(
      `Willst du ${member.display_name} wirklich zum neuen Eigentümer machen?`,
    );

    if (!confirmed) {
      return;
    }

    await onTransferOwnership(memberId);
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
              <div className="invite-code-row">
                <code>{family.invite_code}</code>
                <button
                  className="secondary-button"
                  onClick={() => void onCopyInviteCode(family.invite_code)}
                  type="button"
                >
                  Kopieren
                </button>
              </div>
            </div>
            <p className="muted-text">
              Teile den Code mit Partner oder Familie, damit sie demselben
              Familienbereich beitreten können.
            </p>
            <div>
              <span className="muted-label">Rolle</span>
              <strong>{isOwner ? "Eigentümer" : "Mitglied"}</strong>
            </div>
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

      {family && isOwner && transferableMembers.length > 0 && (
        <section className="card">
          <h2>Eigentümer übertragen</h2>
          <p className="muted-text">
            Übertrage das Familienkonto an ein anderes Mitglied, damit du die
            Familie später selbst verlassen kannst.
          </p>
          <div className="list-stack">
            {transferableMembers.map((member) => (
              <div className="list-card" key={`owner-${member.id}`}>
                <div>
                  <strong>{member.display_name}</strong>
                  <p>{member.email}</p>
                </div>
                <button
                  className="secondary-button"
                  disabled={busy}
                  onClick={() => void handleTransfer(member.id)}
                  type="button"
                >
                  Zum Owner machen
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="card family-members">
        <div className="section-header">
          <h2>Personen</h2>
          <span className="pill">{members.length}</span>
        </div>
        {members.length === 0 ? (
          <p className="muted-text">
            Sobald Personen verbunden sind, erscheinen sie hier.
          </p>
        ) : (
          <div className="list-stack">
            {members.map((member) => {
              const memberIsOwner = family?.owner_id === member.id;
              const isCurrentUser = member.id === currentProfile.id;

              return (
                <div className="list-card" key={member.id}>
                  <div className="person-row">
                    <span
                      className="color-dot"
                      style={{ backgroundColor: member.color }}
                      aria-hidden="true"
                    />
                    <div>
                      <strong>
                        {member.display_name}
                        {isCurrentUser ? " (du)" : ""}
                      </strong>
                      <p>{member.email}</p>
                    </div>
                  </div>
                  <div className="card-actions compact-actions">
                    {memberIsOwner && <span className="pill">Owner</span>}
                    {isOwner && !memberIsOwner && (
                      <button
                        className="danger-button"
                        disabled={busy}
                        onClick={() => void handleRemove(member)}
                        type="button"
                      >
                        Entfernen
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
