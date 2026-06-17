import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Profile,
  ShoppingItem,
  ShoppingItemInput,
  ShoppingList,
} from "../types";

interface ShoppingListPanelProps {
  items: ShoppingItem[];
  lists: ShoppingList[];
  members: Profile[];
  busy: boolean;
  onCreateList: (name: string) => Promise<void>;
  onRenameList: (oldName: string, newName: string) => Promise<void>;
  onDeleteList: (name: string) => Promise<void>;
  onCreateItem: (input: ShoppingItemInput) => Promise<void>;
  onUpdateItem: (itemId: string, input: ShoppingItemInput) => Promise<void>;
  onDeleteItem: (item: ShoppingItem) => Promise<void>;
  onToggleDone: (item: ShoppingItem) => Promise<void>;
}

const DEFAULT_LIST_NAME = "Allgemein";
const ALL_LISTS_KEY = "__all__";
const LIST_SUGGESTIONS_ID = "shopping-list-suggestions";

function normalizeListName(listName: string) {
  return listName.trim() || DEFAULT_LIST_NAME;
}

export function ShoppingListPanel({
  items,
  lists,
  members,
  busy,
  onCreateList,
  onRenameList,
  onDeleteList,
  onCreateItem,
  onUpdateItem,
  onDeleteItem,
  onToggleDone,
}: ShoppingListPanelProps) {
  const [activeListName, setActiveListName] = useState(ALL_LISTS_KEY);
  const [newListName, setNewListName] = useState("");
  const [renameListName, setRenameListName] = useState("");
  const [listName, setListName] = useState(DEFAULT_LIST_NAME);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingListName, setEditingListName] = useState(DEFAULT_LIST_NAME);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingNotes, setEditingNotes] = useState("");
  const [editingAssignedTo, setEditingAssignedTo] = useState("");

  const normalizedLists = useMemo(
    () =>
      Array.from(
        new Set([
          ...lists.map((list) => normalizeListName(list.name)),
          ...items.map((item) => normalizeListName(item.list_name)),
        ]),
      ).sort((left, right) => left.localeCompare(right, "de")),
    [items, lists],
  );

  const filteredItems = useMemo(() => {
    const relevantItems =
      activeListName === ALL_LISTS_KEY
        ? items
        : items.filter(
            (item) => normalizeListName(item.list_name) === activeListName,
          );

    return [...relevantItems].sort((left, right) => {
      if (left.is_done !== right.is_done) {
        return Number(left.is_done) - Number(right.is_done);
      }

      return left.title.localeCompare(right.title, "de");
    });
  }, [activeListName, items]);

  const groupedItems = useMemo(() => {
    if (activeListName !== ALL_LISTS_KEY) {
      return [
        {
          name: activeListName,
          items: filteredItems,
        },
      ];
    }

    return normalizedLists.map((name) => ({
      name,
      items: filteredItems.filter(
        (item) => normalizeListName(item.list_name) === name,
      ),
    }));
  }, [activeListName, filteredItems, normalizedLists]);

  const activeListStats = useMemo(() => {
    if (activeListName === ALL_LISTS_KEY) {
      return {
        openCount: items.filter((item) => !item.is_done).length,
        totalCount: items.length,
      };
    }

    const currentItems = items.filter(
      (item) => normalizeListName(item.list_name) === activeListName,
    );

    return {
      openCount: currentItems.filter((item) => !item.is_done).length,
      totalCount: currentItems.length,
    };
  }, [activeListName, items]);

  useEffect(() => {
    if (
      activeListName !== ALL_LISTS_KEY &&
      !normalizedLists.includes(activeListName)
    ) {
      setActiveListName(ALL_LISTS_KEY);
    }
  }, [activeListName, normalizedLists]);

  useEffect(() => {
    if (activeListName === ALL_LISTS_KEY) {
      return;
    }

    setListName(activeListName);
    setRenameListName(activeListName);
  }, [activeListName]);

  async function handleCreateListSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = normalizeListName(newListName);
    await onCreateList(normalized);
    setActiveListName(normalized);
    setListName(normalized);
    setRenameListName(normalized);
    setNewListName("");
  }

  async function handleRenameListSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (activeListName === ALL_LISTS_KEY) {
      return;
    }

    const normalized = normalizeListName(renameListName);
    await onRenameList(activeListName, normalized);
    setActiveListName(normalized);
    setListName(normalized);
    setRenameListName(normalized);
  }

  async function handleDeleteListClick() {
    if (activeListName === ALL_LISTS_KEY) {
      return;
    }

    const confirmed = window.confirm(
      `Liste "${activeListName}" wirklich löschen? Alle zugehörigen Einträge werden ebenfalls entfernt.`,
    );

    if (!confirmed) {
      return;
    }

    await onDeleteList(activeListName);
    setActiveListName(ALL_LISTS_KEY);
    setListName(DEFAULT_LIST_NAME);
    setRenameListName("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = normalizeListName(listName);

    await onCreateItem({
      listName: normalized,
      title,
      notes,
      assignedTo,
    });

    setListName(
      activeListName === ALL_LISTS_KEY ? DEFAULT_LIST_NAME : normalized,
    );
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
        <h2>Einkaufslisten verwalten</h2>
        <p className="muted-text">
          Erstelle Listen für verschiedene Läden und behalte offene Einträge
          getrennt im Blick.
        </p>

        <div
          className="shopping-list-tabs"
          role="tablist"
          aria-label="Einkaufslisten"
        >
          <button
            className={
              activeListName === ALL_LISTS_KEY
                ? "tab shopping-list-tab active"
                : "tab shopping-list-tab"
            }
            onClick={() => setActiveListName(ALL_LISTS_KEY)}
            type="button"
          >
            Alle
          </button>
          {normalizedLists.map((name) => (
            <button
              className={
                activeListName === name
                  ? "tab shopping-list-tab active"
                  : "tab shopping-list-tab"
              }
              key={name}
              onClick={() => setActiveListName(name)}
              type="button"
            >
              {name}
            </button>
          ))}
        </div>

        <div className="shopping-summary-grid">
          <article className="summary-card">
            <span className="muted-label">Aktive Ansicht</span>
            <strong>
              {activeListName === ALL_LISTS_KEY
                ? "Alle Listen"
                : activeListName}
            </strong>
            <p>{activeListStats.openCount} offen</p>
          </article>
          <article className="summary-card">
            <span className="muted-label">Listen</span>
            <strong>{normalizedLists.length}</strong>
            <p>stehen aktuell zur Auswahl</p>
          </article>
        </div>

        <div className="shopping-management-grid">
          <form
            className="form-stack shopping-list-form-card"
            onSubmit={handleCreateListSubmit}
          >
            <h3>Neue Liste anlegen</h3>
            <label>
              Name der Liste
              <input
                value={newListName}
                onChange={(event) => setNewListName(event.target.value)}
                placeholder="z. B. Rewe, DM, Wochenmarkt"
                required
              />
            </label>
            <button className="secondary-button" type="submit" disabled={busy}>
              Liste speichern
            </button>
          </form>

          <div className="shopping-list-form-card">
            <h3>Aktive Liste verwalten</h3>
            {activeListName === ALL_LISTS_KEY ? (
              <p className="muted-text">
                Wähle oben eine konkrete Liste aus, um sie umzubenennen oder zu
                löschen.
              </p>
            ) : (
              <form className="form-stack" onSubmit={handleRenameListSubmit}>
                <label>
                  Listenname
                  <input
                    value={renameListName}
                    onChange={(event) => setRenameListName(event.target.value)}
                    required
                  />
                </label>
                <div className="card-actions compact-actions">
                  <button
                    className="primary-button"
                    type="submit"
                    disabled={busy}
                  >
                    Umbenennen
                  </button>
                  <button
                    className="danger-button"
                    onClick={() => void handleDeleteListClick()}
                    type="button"
                    disabled={busy}
                  >
                    Liste löschen
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      <section className="card overview-full-width">
        <div className="section-header stacked-mobile">
          <div>
            <h2>
              {activeListName === ALL_LISTS_KEY
                ? "Einkaufslisten"
                : `Liste: ${activeListName}`}
            </h2>
            <p className="muted-text">
              {activeListName === ALL_LISTS_KEY
                ? "Alle Listen im Überblick – sauber nach Läden getrennt."
                : "Einträge dieser Liste bearbeiten, abhaken oder neu anlegen."}
            </p>
          </div>
          <span className="pill">{activeListStats.openCount} offen</span>
        </div>

        <form
          className="form-stack shopping-item-create-form"
          onSubmit={handleSubmit}
        >
          <div className="inline-form-grid">
            <label>
              Liste / Laden
              <input
                value={listName}
                onChange={(event) => setListName(event.target.value)}
                list={LIST_SUGGESTIONS_ID}
                placeholder="z. B. Rewe"
                required
              />
              <datalist id={LIST_SUGGESTIONS_ID}>
                {normalizedLists.map((entry) => (
                  <option key={entry} value={entry} />
                ))}
              </datalist>
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
            <label>
              Eintrag
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="z. B. Milch"
                required
              />
            </label>
            <label className="full-width-field">
              Notiz
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Optional: Menge, Marke, Hinweis"
                rows={3}
              />
            </label>
          </div>
          <button className="primary-button" type="submit" disabled={busy}>
            Eintrag speichern
          </button>
        </form>

        <div className="list-stack shopping-groups">
          {groupedItems.every((group) => group.items.length === 0) ? (
            <p className="muted-text">Noch keine Einträge in dieser Ansicht.</p>
          ) : (
            groupedItems.map((group) => {
              if (group.items.length === 0) {
                return null;
              }

              return (
                <section className="shopping-group" key={group.name}>
                  {activeListName === ALL_LISTS_KEY && (
                    <div className="section-header stacked-mobile shopping-group-header">
                      <div>
                        <h3>{group.name}</h3>
                        <p className="muted-text">
                          {group.items.filter((item) => !item.is_done).length}{" "}
                          offen, {group.items.length} gesamt
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="list-stack">
                    {group.items.map((item) => {
                      const assigned = item.assigned_to
                        ? members.find(
                            (member) => member.id === item.assigned_to,
                          )
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
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
