import { FormEvent, useState } from "react";
import { Profile, ShoppingItem, ShoppingItemInput } from "../types";

interface ShoppingListPanelProps {
  items: ShoppingItem[];
  members: Profile[];
  busy: boolean;
  onCreateItem: (input: ShoppingItemInput) => Promise<void>;
  onUpdateItem: (itemId: string, input: ShoppingItemInput) => Promise<void>;
  onDeleteItem: (item: ShoppingItem) => Promise<void>;
  onToggleDone: (item: ShoppingItem) => Promise<void>;
}

export function ShoppingListPanel({
  items,
  members,
  busy,
  onCreateItem,
  onUpdateItem,
  onDeleteItem,
  onToggleDone,
}: ShoppingListPanelProps) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingNotes, setEditingNotes] = useState("");
  const [editingAssignedTo, setEditingAssignedTo] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onCreateItem({ title, notes, assignedTo });
    setTitle("");
    setNotes("");
    setAssignedTo("");
  }

  function startEditing(item: ShoppingItem) {
    setEditingId(item.id);
    setEditingTitle(item.title);
    setEditingNotes(item.notes ?? "");
    setEditingAssignedTo(item.assigned_to ?? "");
  }

  function stopEditing() {
    setEditingId(null);
    setEditingTitle("");
    setEditingNotes("");
    setEditingAssignedTo("");
  }

  async function handleSave(itemId: string) {
    await onUpdateItem(itemId, {
      title: editingTitle,
      notes: editingNotes,
      assignedTo: editingAssignedTo,
    });
    stopEditing();
  }

  async function handleDelete(item: ShoppingItem) {
    if (!window.confirm(`Eintrag "${item.title}" wirklich löschen?`)) {
      return;
    }

    await onDeleteItem(item);
    if (editingId === item.id) {
      stopEditing();
    }
  }

  return (
    <div className="dashboard-grid shopping-layout">
      <section className="card compact-card">
        <span className="eyebrow">Einkauf</span>
        <h2>Zur Einkaufsliste hinzufügen</h2>
        <p className="muted-text">
          Lege Einträge an und ordne sie direkt einer Person zu.
        </p>
        <form className="form-stack" onSubmit={handleSubmit}>
          <label>
            Eintrag
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="z. B. Milch"
              required
            />
          </label>
          <label>
            Notiz
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Optional: Menge, Marke, Laden"
              rows={3}
            />
          </label>
          <label>
            Zuständig
            <select
              value={assignedTo}
              onChange={(event) => setAssignedTo(event.target.value)}
            >
              <option value="">Niemand ausgewählt</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.display_name}
                </option>
              ))}
            </select>
          </label>
          <button className="primary-button" type="submit" disabled={busy}>
            Speichern
          </button>
        </form>
      </section>

      <section className="card overview-full-width">
        <div className="section-header stacked-mobile">
          <div>
            <h2>Einkaufsliste</h2>
            <p className="muted-text">
              Alles offen, erledigt oder gerade in Bearbeitung.
            </p>
          </div>
          <span className="pill">
            {items.filter((item) => !item.is_done).length} offen
          </span>
        </div>
        <div className="list-stack">
          {items.length === 0 ? (
            <p className="muted-text">Noch nichts auf der Liste.</p>
          ) : (
            items.map((item) => {
              const assigned = item.assigned_to
                ? members.find((member) => member.id === item.assigned_to)
                : null;
              const isEditing = editingId === item.id;

              return (
                <article
                  className={item.is_done ? "list-card is-done" : "list-card"}
                  key={item.id}
                >
                  <div className="checkbox-row spread-on-mobile">
                    <label className="checkbox-row inline">
                      <input
                        checked={item.is_done}
                        onChange={() => void onToggleDone(item)}
                        type="checkbox"
                      />
                      <strong>{item.title}</strong>
                    </label>
                    <div className="card-actions compact-actions">
                      <button
                        className="secondary-button"
                        onClick={() => startEditing(item)}
                        type="button"
                      >
                        Bearbeiten
                      </button>
                      <button
                        className="danger-button"
                        onClick={() => void handleDelete(item)}
                        type="button"
                      >
                        Löschen
                      </button>
                    </div>
                  </div>

                  {item.notes && !isEditing && <p>{item.notes}</p>}

                  {isEditing ? (
                    <div className="inline-form-grid">
                      <label>
                        Eintrag
                        <input
                          value={editingTitle}
                          onChange={(event) =>
                            setEditingTitle(event.target.value)
                          }
                        />
                      </label>
                      <label>
                        Zuständig
                        <select
                          value={editingAssignedTo}
                          onChange={(event) =>
                            setEditingAssignedTo(event.target.value)
                          }
                        >
                          <option value="">Niemand ausgewählt</option>
                          {members.map((member) => (
                            <option key={member.id} value={member.id}>
                              {member.display_name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="full-width-field">
                        Notiz
                        <textarea
                          rows={3}
                          value={editingNotes}
                          onChange={(event) =>
                            setEditingNotes(event.target.value)
                          }
                        />
                      </label>
                      <div className="card-actions compact-actions">
                        <button
                          className="primary-button"
                          onClick={() => void handleSave(item.id)}
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
                  ) : assigned ? (
                    <span
                      className="person-badge"
                      style={{
                        backgroundColor: `${assigned.color}22`,
                        color: assigned.color,
                      }}
                    >
                      {assigned.display_name}
                    </span>
                  ) : (
                    <span className="muted-text">Nicht zugewiesen</span>
                  )}
                </article>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
