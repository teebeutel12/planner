import { FormEvent, useMemo, useState } from "react";
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

const DEFAULT_LIST_NAME = "Allgemein";
const LIST_SUGGESTIONS_ID = "shopping-list-suggestions";

function normalizeListName(listName: string) {
  return listName.trim() || DEFAULT_LIST_NAME;
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
  const [listName, setListName] = useState(DEFAULT_LIST_NAME);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingListName, setEditingListName] = useState(DEFAULT_LIST_NAME);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingNotes, setEditingNotes] = useState("");
  const [editingAssignedTo, setEditingAssignedTo] = useState("");

  const existingLists = useMemo(
    () =>
      Array.from(
        new Set(items.map((item) => normalizeListName(item.list_name))),
      ).sort((left, right) => left.localeCompare(right, "de")),
    [items],
  );

  const groupedItems = useMemo(() => {
    const groups = new Map<string, ShoppingItem[]>();

    [...items]
      .sort((left, right) => {
        const listSort = normalizeListName(left.list_name).localeCompare(
          normalizeListName(right.list_name),
          "de",
        );
        if (listSort !== 0) {
          return listSort;
        }

        if (left.is_done !== right.is_done) {
          return Number(left.is_done) - Number(right.is_done);
        }

        return left.title.localeCompare(right.title, "de");
      })
      .forEach((item) => {
        const key = normalizeListName(item.list_name);
        const current = groups.get(key) ?? [];
        current.push(item);
        groups.set(key, current);
      });

    return Array.from(groups.entries()).map(([name, listItems]) => ({
      name,
      items: listItems,
      openCount: listItems.filter((item) => !item.is_done).length,
    }));
  }, [items]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onCreateItem({
      listName,
      title,
      notes,
      assignedTo,
    });
    setListName(DEFAULT_LIST_NAME);
    setTitle("");
    setNotes("");
    setAssignedTo("");
  }

  function startEditing(item: ShoppingItem) {
    setEditingId(item.id);
    setEditingListName(normalizeListName(item.list_name));
    setEditingTitle(item.title);
    setEditingNotes(item.notes ?? "");
    setEditingAssignedTo(item.assigned_to ?? "");
  }

  function stopEditing() {
    setEditingId(null);
    setEditingListName(DEFAULT_LIST_NAME);
    setEditingTitle("");
    setEditingNotes("");
    setEditingAssignedTo("");
  }

  async function handleSave(itemId: string) {
    await onUpdateItem(itemId, {
      listName: editingListName,
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
          Lege Einträge an und ordne sie direkt einem Laden oder einer eigenen
          Liste zu.
        </p>
        <form className="form-stack" onSubmit={handleSubmit}>
          <label>
            Liste / Laden
            <input
              value={listName}
              onChange={(event) => setListName(event.target.value)}
              list={LIST_SUGGESTIONS_ID}
              placeholder="z. B. Rewe, DM, Wochenmarkt"
              required
            />
            <datalist id={LIST_SUGGESTIONS_ID}>
              {existingLists.map((entry) => (
                <option key={entry} value={entry} />
              ))}
            </datalist>
          </label>
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
              placeholder="Optional: Menge, Marke, Hinweis"
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
            <h2>Einkaufslisten</h2>
            <p className="muted-text">
              Getrennt nach Läden oder eigenen Listen, damit alles übersichtlich
              bleibt.
            </p>
          </div>
          <span className="pill">
            {items.filter((item) => !item.is_done).length} offen
          </span>
        </div>

        {groupedItems.length > 0 && (
          <div className="shopping-list-pills">
            {groupedItems.map((group) => (
              <span className="pill" key={group.name}>
                {group.name} · {group.openCount} offen
              </span>
            ))}
          </div>
        )}

        <div className="list-stack shopping-groups">
          {groupedItems.length === 0 ? (
            <p className="muted-text">Noch nichts auf euren Listen.</p>
          ) : (
            groupedItems.map((group) => (
              <section className="shopping-group" key={group.name}>
                <div className="section-header stacked-mobile shopping-group-header">
                  <div>
                    <h3>{group.name}</h3>
                    <p className="muted-text">
                      {group.items.length} Einträge, davon {group.openCount}{" "}
                      offen
                    </p>
                  </div>
                </div>

                <div className="list-stack">
                  {group.items.map((item) => {
                    const assigned = item.assigned_to
                      ? members.find((member) => member.id === item.assigned_to)
                      : null;
                    const isEditing = editingId === item.id;

                    return (
                      <article
                        className={
                          item.is_done ? "list-card is-done" : "list-card"
                        }
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

                        {isEditing ? (
                          <div className="inline-form-grid">
                            <label>
                              Liste / Laden
                              <input
                                value={editingListName}
                                onChange={(event) =>
                                  setEditingListName(event.target.value)
                                }
                                list={LIST_SUGGESTIONS_ID}
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
                            <label>
                              Eintrag
                              <input
                                value={editingTitle}
                                onChange={(event) =>
                                  setEditingTitle(event.target.value)
                                }
                              />
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
                        ) : (
                          <div className="shopping-item-meta">
                            {item.notes && <p>{item.notes}</p>}
                            <div className="badge-row">
                              <span className="pill">
                                {normalizeListName(item.list_name)}
                              </span>
                              {assigned ? (
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
                                <span className="muted-text">
                                  Nicht zugewiesen
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
