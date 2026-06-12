import { FormEvent, useEffect, useMemo, useState } from "react";
import { Profile, WishInput, WishItem } from "../types";

interface WishListPanelProps {
  wishes: WishItem[];
  members: Profile[];
  busy: boolean;
  onCreateWish: (input: WishInput) => Promise<void>;
  onUpdateWish: (wishId: string, input: WishInput) => Promise<void>;
  onDeleteWish: (wish: WishItem) => Promise<void>;
  onToggleFulfilled: (wish: WishItem) => Promise<void>;
}

export function WishListPanel({
  wishes,
  members,
  busy,
  onCreateWish,
  onUpdateWish,
  onDeleteWish,
  onToggleFulfilled,
}: WishListPanelProps) {
  const [personId, setPersonId] = useState(members[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [link, setLink] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPersonId, setEditingPersonId] = useState("");
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDescription, setEditingDescription] = useState("");
  const [editingLink, setEditingLink] = useState("");

  useEffect(() => {
    if (!personId && members[0]) {
      setPersonId(members[0].id);
    }
  }, [members, personId]);

  const groupedWishes = useMemo(
    () =>
      members.map((member) => ({
        member,
        wishes: wishes.filter((wish) => wish.person_id === member.id),
      })),
    [members, wishes],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onCreateWish({ personId, title, description, link });
    setTitle("");
    setDescription("");
    setLink("");
  }

  function startEditing(wish: WishItem) {
    setEditingId(wish.id);
    setEditingPersonId(wish.person_id);
    setEditingTitle(wish.title);
    setEditingDescription(wish.description ?? "");
    setEditingLink(wish.link ?? "");
  }

  function stopEditing() {
    setEditingId(null);
    setEditingPersonId("");
    setEditingTitle("");
    setEditingDescription("");
    setEditingLink("");
  }

  async function handleSave(wishId: string) {
    await onUpdateWish(wishId, {
      personId: editingPersonId,
      title: editingTitle,
      description: editingDescription,
      link: editingLink,
    });
    stopEditing();
  }

  async function handleDelete(wish: WishItem) {
    if (!window.confirm(`Wunsch "${wish.title}" wirklich löschen?`)) {
      return;
    }

    await onDeleteWish(wish);
    if (editingId === wish.id) {
      stopEditing();
    }
  }

  return (
    <div className="dashboard-grid wishes-layout">
      <section className="card compact-card">
        <span className="eyebrow">Wünsche</span>
        <h2>Wunsch hinzufügen</h2>
        <p className="muted-text">
          Wünsche pro Person sammeln und später abhaken.
        </p>
        <form className="form-stack" onSubmit={handleSubmit}>
          <label>
            Für wen?
            <select
              value={personId}
              onChange={(event) => setPersonId(event.target.value)}
              required
            >
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.display_name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Wunsch
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="z. B. Lego-Set"
              required
            />
          </label>
          <label>
            Beschreibung
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Größe, Farbe, Idee ..."
              rows={3}
            />
          </label>
          <label>
            Link
            <input
              value={link}
              onChange={(event) => setLink(event.target.value)}
              placeholder="https://..."
              type="url"
            />
          </label>
          <button className="primary-button" type="submit" disabled={busy}>
            Wunsch speichern
          </button>
        </form>
      </section>

      <section className="card overview-full-width">
        <div className="section-header stacked-mobile">
          <div>
            <h2>Wunschlisten</h2>
            <p className="muted-text">
              Farbig sortiert nach Personen mit klarer Statusansicht.
            </p>
          </div>
          <span className="pill">
            {wishes.filter((wish) => !wish.is_fulfilled).length} offen
          </span>
        </div>
        <div className="wish-columns">
          {groupedWishes.map(({ member, wishes: memberWishes }) => (
            <div className="wish-column" key={member.id}>
              <div className="person-title-row">
                <span
                  className="color-dot"
                  style={{ backgroundColor: member.color }}
                  aria-hidden="true"
                />
                <strong>{member.display_name}</strong>
              </div>
              {memberWishes.length === 0 ? (
                <p className="muted-text">Noch keine Wünsche.</p>
              ) : (
                memberWishes.map((wish) => {
                  const isEditing = editingId === wish.id;
                  return (
                    <article
                      className={
                        wish.is_fulfilled
                          ? "list-card compact is-done"
                          : "list-card compact"
                      }
                      key={wish.id}
                    >
                      {isEditing ? (
                        <div className="inline-form-grid">
                          <label>
                            Für wen?
                            <select
                              value={editingPersonId}
                              onChange={(event) =>
                                setEditingPersonId(event.target.value)
                              }
                            >
                              {members.map((option) => (
                                <option key={option.id} value={option.id}>
                                  {option.display_name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            Wunsch
                            <input
                              value={editingTitle}
                              onChange={(event) =>
                                setEditingTitle(event.target.value)
                              }
                            />
                          </label>
                          <label className="full-width-field">
                            Beschreibung
                            <textarea
                              rows={3}
                              value={editingDescription}
                              onChange={(event) =>
                                setEditingDescription(event.target.value)
                              }
                            />
                          </label>
                          <label className="full-width-field">
                            Link
                            <input
                              type="url"
                              value={editingLink}
                              onChange={(event) =>
                                setEditingLink(event.target.value)
                              }
                            />
                          </label>
                          <div className="card-actions compact-actions">
                            <button
                              className="primary-button"
                              onClick={() => void handleSave(wish.id)}
                              type="button"
                            >
                              Speichern
                            </button>
                            <button
                              className="muted-button"
                              onClick={stopEditing}
                              type="button"
                            >
                              Abbrechen
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div>
                            <strong>{wish.title}</strong>
                            {wish.description && <p>{wish.description}</p>}
                            {wish.link && (
                              <a
                                href={wish.link}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Zum Link
                              </a>
                            )}
                          </div>
                          <div className="card-actions compact-actions">
                            <label className="checkbox-row inline">
                              <input
                                checked={wish.is_fulfilled}
                                onChange={() => void onToggleFulfilled(wish)}
                                type="checkbox"
                              />
                              Erfüllt
                            </label>
                            <button
                              className="secondary-button"
                              onClick={() => startEditing(wish)}
                              type="button"
                            >
                              Bearbeiten
                            </button>
                            <button
                              className="danger-button"
                              onClick={() => void handleDelete(wish)}
                              type="button"
                            >
                              Löschen
                            </button>
                          </div>
                        </>
                      )}
                    </article>
                  );
                })
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
