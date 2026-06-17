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
  const [quantity, setQuantity] = useState("");
  const [category, setCategory] = useState("");
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [isCreateListFormOpen, setIsCreateListFormOpen] = useState(false);
  const [isEditingList, setIsEditingList] = useState(false);
  const [assignedTo, setAssignedTo] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingListName, setEditingListName] = useState(DEFAULT_LIST_NAME);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingNotes, setEditingNotes] = useState("");
  const [editingQuantity, setEditingQuantity] = useState("");
  const [editingCategory, setEditingCategory] = useState("");
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
    setIsEditingList(false);
    setNewListName("");
    setIsCreateListFormOpen(false);
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
    setIsEditingList(false);
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
    setIsEditingList(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = normalizeListName(listName);

    await onCreateItem({
      listName: normalized,
      title,
      notes,
      assignedTo,
      quantity,
      category,
    });

    setListName(
      activeListName === ALL_LISTS_KEY ? DEFAULT_LIST_NAME : normalized,
    );
    setTitle("");
    setNotes("");
    setAssignedTo("");
    setQuantity("");
    setCategory("");
    setIsCreateFormOpen(false);
  }

  function startEditing(item: ShoppingItem) {
    setEditingId(item.id);
    setEditingListName(normalizeListName(item.list_name));
    setEditingTitle(item.title);
    setEditingNotes(item.notes ?? "");
    setEditingAssignedTo(item.assigned_to ?? "");
    setEditingQuantity(item.quantity ?? "");
    setEditingCategory(item.category ?? "");
  }

  function stopEditing() {
    setEditingId(null);
    setEditingListName(DEFAULT_LIST_NAME);
    setEditingTitle("");
    setEditingNotes("");
    setEditingAssignedTo("");
    setEditingQuantity("");
    setEditingCategory("");
  }

  async function handleSave(itemId: string) {
    await onUpdateItem(itemId, {
      listName: editingListName,
      title: editingTitle,
      notes: editingNotes,
      assignedTo: editingAssignedTo,
      quantity: editingQuantity,
      category: editingCategory,
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
        <h2>Einkaufslisten verwalten</h2>
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

          {isCreateListFormOpen ? (
            <form
              className="form-stack shopping-list-form-card"
              onSubmit={handleCreateListSubmit}
            >
              <div className="section-header stacked-mobile">
                <div>
                  <h3>Neue Liste anlegen</h3>
                  <p className="muted-text">
                    Erstelle eine neue Einkaufsliste.
                  </p>
                </div>
                <button
                  className="muted-button"
                  onClick={() => setIsCreateListFormOpen(false)}
                  type="button"
                >
                  Abbrechen
                </button>
              </div>

              <label>
                Name der Liste
                <input
                  value={newListName}
                  onChange={(event) => setNewListName(event.target.value)}
                  placeholder="z. B. Rewe, DM, Wochenmarkt"
                  required
                />
              </label>

              <button
                className="secondary-button"
                type="submit"
                disabled={busy}
              >
                Liste <span aria-hidden="true">✓</span>
              </button>
            </form>
          ) : (
            <button
              className="secondary-button"
              onClick={() => setIsCreateListFormOpen(true)}
              type="button"
            >
              +
            </button>
          )}
        </div>
      </section>
      <section className="card overview-full-width">
        <div className="section-header stacked-mobile">
          <div>
            <div className="shopping-title-row">
              <h2>{activeListName === ALL_LISTS_KEY ? "" : activeListName}</h2>
              {activeListName !== ALL_LISTS_KEY && (
                <button
                  className="icon-button"
                  onClick={() => {
                    setRenameListName(activeListName);
                    setIsEditingList(true);
                  }}
                  type="button"
                  title="Liste bearbeiten"
                >
                  <span aria-hidden="true">⚙</span>
                </button>
              )}
            </div>
            {activeListName !== ALL_LISTS_KEY &&
              !isEditingList &&
              (isCreateFormOpen ? (
                <form
                  className="form-stack shopping-item-create-form"
                  onSubmit={handleSubmit}
                >
                  <div className="section-header stacked-mobile">
                    <h3>Neuen Einkauf hinzufügen</h3>
                    <button
                      className="muted-button"
                      onClick={() => setIsCreateFormOpen(false)}
                      type="button"
                    >
                      <span aria-hidden="true">×</span>
                    </button>
                  </div>

                  <div className="inline-form-grid">
                    <label>
                      Liste / Laden
                      <select
                        value={listName}
                        onChange={(event) => setListName(event.target.value)}
                        required
                      >
                        {normalizedLists.map((entry) => (
                          <option key={entry} value={entry}>
                            {entry}
                          </option>
                        ))}
                      </select>
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

                    <label>
                      Menge
                      <input
                        value={quantity}
                        onChange={(event) => setQuantity(event.target.value)}
                        placeholder="z. B. 2x, 1 kg"
                      />
                    </label>

                    <label>
                      Kategorie
                      <input
                        value={category}
                        onChange={(event) => setCategory(event.target.value)}
                        placeholder="z. B. Obst, Getränke"
                      />
                    </label>

                    <label className="full-width-field">
                      Notiz
                      <textarea
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        placeholder="Optional: Marke, Hinweis"
                        rows={3}
                      />
                    </label>
                  </div>

                  <button
                    className="primary-button"
                    type="submit"
                    disabled={busy}
                  >
                    Eintrag speichern
                  </button>
                </form>
              ) : (
                <button
                  className="primary-button add-item-button"
                  onClick={() => {
                    setListName(activeListName);
                    setIsCreateFormOpen(true);
                  }}
                  type="button"
                >
                  + Einkauf hinzufügen
                </button>
              ))}
            {isEditingList && activeListName !== ALL_LISTS_KEY && (
              <form
                className="form-stack shopping-list-form-card"
                onSubmit={handleRenameListSubmit}
              >
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
                    <span aria-hidden="true">✓</span>
                  </button>

                  <button
                    className="muted-button"
                    onClick={() => setIsEditingList(false)}
                    type="button"
                  >
                    <span aria-hidden="true">×</span>
                  </button>

                  <button
                    className="danger-button"
                    onClick={() => void handleDeleteListClick()}
                    type="button"
                    disabled={busy}
                  >
                    <span aria-hidden="true">🗑️</span>
                  </button>
                </div>
              </form>
            )}
          </div>
          <span className="pill">{activeListStats.openCount} offen</span>
        </div>
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
                            <label className="shopping-check-title">
                              <input
                                checked={item.is_done}
                                onChange={() => void onToggleDone(item)}
                                type="checkbox"
                              />
                              <div className="shopping-item-title">
                                {activeListName === ALL_LISTS_KEY && (
                                  <span className="shopping-list-name">
                                    {normalizeListName(item.list_name)}
                                  </span>
                                )}
                                <strong>{item.title}</strong>
                              </div>
                            </label>
                            <div className="card-actions compact-actions">
                              <button
                                className="secondary-button"
                                onClick={() => startEditing(item)}
                                type="button"
                              >
                                <span aria-hidden="true">⚙</span>
                              </button>
                              <button
                                className="secondary-button"
                                onClick={() => void handleDelete(item)}
                                type="button"
                              >
                                <span aria-hidden="true">🗑️</span>
                              </button>
                            </div>
                          </div>

                          {isEditing ? (
                            <div className="inline-form-grid">
                              <label>
                                Liste / Laden
                                <select
                                  value={editingListName}
                                  onChange={(event) =>
                                    setEditingListName(event.target.value)
                                  }
                                  required
                                >
                                  {normalizedLists.map((entry) => (
                                    <option key={entry} value={entry}>
                                      {entry}
                                    </option>
                                  ))}
                                </select>
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
                              <label>
                                Menge
                                <input
                                  value={editingQuantity}
                                  onChange={(event) =>
                                    setEditingQuantity(event.target.value)
                                  }
                                />
                              </label>

                              <label>
                                Kategorie
                                <input
                                  value={editingCategory}
                                  onChange={(event) =>
                                    setEditingCategory(event.target.value)
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
                                  <span aria-hidden="true">✓</span>
                                </button>
                                <button
                                  className="muted-button"
                                  onClick={stopEditing}
                                  type="button"
                                >
                                  <span aria-hidden="true">×</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="shopping-item-meta">
                              {item.notes && <p>{item.notes}</p>}
                              {item.quantity && <p>Menge: {item.quantity}</p>}
                              {item.category && (
                                <p>Kategorie: {item.category}</p>
                              )}
                              <div className="badge-row">
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
