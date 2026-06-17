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
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
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
    setIsCreateFormOpen(false);
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
      <section className="card overview-full-width">
        <h2>Wünsche</h2>
        {members.length === 0 ? (
          <p className="muted-text">
            Lege zuerst mindestens ein Profil in der Familie an, bevor du
            Wünsche verteilst.
          </p>
        ) : isCreateFormOpen ? (
          <form className="form-stack" onSubmit={handleSubmit}>
            <div className="section-header stacked-mobile">
              <h3>Neuen Wunsch hinzufügen</h3>
              <button
                className="muted-button"
                onClick={() => setIsCreateFormOpen(false)}
                type="button"
              >
                Abbrechen
              </button>
            </div>

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
        ) : (
          <button
            className="primary-button"
            onClick={() => setIsCreateFormOpen(true)}
            type="button"
            style={{ marginBottom: 20 }}
          >
            + Wunsch hinzufügen
          </button>
        )}
        <div
          className="section-header stacked-mobile"
          style={{ marginBottom: 20 }}
        >
          <span className="pill">
            {wishes.filter((wish) => !wish.is_fulfilled).length} offen
          </span>
        </div>
        <div className="wish-columns">
          {groupedWishes.map(({ member, wishes: memberWishes }) => (
            <div className="wish-column" key={member.id}>
              <div className="person-title-row" style={{ marginBottom: 10 }}>
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
                            <div className="wish-content">
                              <label className="wish-checkbox">
                                <input
                                  checked={wish.is_fulfilled}
                                  onChange={() => void onToggleFulfilled(wish)}
                                  type="checkbox"
                                />
                              </label>

                              <div className="wish-text">
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
                            </div>
                          </div>
                          <div className="card-actions compact-actions">
                            <button
                              className="secondary-button"
                              onClick={() => startEditing(wish)}
                              type="button"
                            >
                              <span aria-hidden="true">⚙</span>
                            </button>
                            <button
                              className="secondary-button"
                              onClick={() => void handleDelete(wish)}
                              type="button"
                            >
                              <span aria-hidden="true">🗑️</span>
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
