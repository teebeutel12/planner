import { FormEvent, useMemo, useState } from "react";
import { Profile, TodoInput, TodoItem, TodoPriority } from "../types";

interface TodoPanelProps {
  todos: TodoItem[];
  members: Profile[];
  busy: boolean;
  onCreateTodo: (input: TodoInput) => Promise<void>;
  onUpdateTodo: (todoId: string, input: TodoInput) => Promise<void>;
  onDeleteTodo: (todo: TodoItem) => Promise<void>;
  onToggleDone: (todo: TodoItem) => Promise<void>;
}

const PRIORITY_LABELS: Record<TodoPriority, string> = {
  low: "Niedrig",
  medium: "Mittel",
  high: "Hoch",
};

const PRIORITY_ORDER: Record<TodoPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const FILTERS = [
  { id: "open", label: "Offen" },
  { id: "all", label: "Alle" },
  { id: "done", label: "Erledigt" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

function formatDueDate(date: string | null) {
  if (!date) {
    return "Ohne Datum";
  }

  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function isOverdue(todo: TodoItem) {
  if (!todo.due_date || todo.is_done) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(`${todo.due_date}T00:00:00`);

  return dueDate.getTime() < today.getTime();
}

function emptyInput(): TodoInput {
  return {
    title: "",
    description: "",
    assignedTo: "",
    dueDate: "",
    priority: "medium",
  };
}

export function TodoPanel({
  todos,
  members,
  busy,
  onCreateTodo,
  onUpdateTodo,
  onDeleteTodo,
  onToggleDone,
}: TodoPanelProps) {
  const [filter, setFilter] = useState<FilterId>("open");
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [input, setInput] = useState<TodoInput>(emptyInput());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingInput, setEditingInput] = useState<TodoInput>(emptyInput());

  const membersById = useMemo(
    () => new Map(members.map((member) => [member.id, member])),
    [members],
  );

  const stats = useMemo(() => {
    const open = todos.filter((todo) => !todo.is_done).length;
    const done = todos.filter((todo) => todo.is_done).length;
    const overdue = todos.filter(isOverdue).length;
    const total = todos.length;
    const progress = total === 0 ? 0 : Math.round((done / total) * 100);

    return { open, done, overdue, total, progress };
  }, [todos]);

  void stats;

  const filteredTodos = useMemo(() => {
    const relevantTodos = todos.filter((todo) => {
      if (filter === "open") {
        return !todo.is_done;
      }

      if (filter === "done") {
        return todo.is_done;
      }

      return true;
    });

    return [...relevantTodos].sort((left, right) => {
      if (left.is_done !== right.is_done) {
        return Number(left.is_done) - Number(right.is_done);
      }

      const leftOverdue = Number(isOverdue(left));
      const rightOverdue = Number(isOverdue(right));
      if (leftOverdue !== rightOverdue) {
        return rightOverdue - leftOverdue;
      }

      if (left.priority !== right.priority) {
        return PRIORITY_ORDER[left.priority] - PRIORITY_ORDER[right.priority];
      }

      const leftDate = left.due_date ?? "9999-12-31";
      const rightDate = right.due_date ?? "9999-12-31";
      return leftDate.localeCompare(rightDate);
    });
  }, [filter, todos]);

  async function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onCreateTodo(input);
    setInput(emptyInput());
    setIsCreateFormOpen(false);
  }

  function startEditing(todo: TodoItem) {
    setEditingId(todo.id);
    setEditingInput({
      title: todo.title,
      description: todo.description ?? "",
      assignedTo: todo.assigned_to ?? "",
      dueDate: todo.due_date ?? "",
      priority: todo.priority,
    });
  }

  function stopEditing() {
    setEditingId(null);
    setEditingInput(emptyInput());
  }

  async function handleSave(todoId: string) {
    await onUpdateTodo(todoId, editingInput);
    stopEditing();
  }

  async function handleDelete(todo: TodoItem) {
    if (!window.confirm(`ToDo "${todo.title}" wirklich löschen?`)) {
      return;
    }

    await onDeleteTodo(todo);
    if (editingId === todo.id) {
      stopEditing();
    }
  }

  return (
    <div className="dashboard-grid todo-layout">
      {isCreateFormOpen && (
        <section className="card overview-full-width">
          <form className="form-stack" onSubmit={handleCreateSubmit}>
            <div className="two-column-form">
              <label>
                Titel
                <input
                  required
                  value={input.title}
                  onChange={(event) =>
                    setInput({ ...input, title: event.target.value })
                  }
                  placeholder="z. B. Kindergarten-Unterlagen abgeben"
                />
              </label>
              <label>
                Zuständig
                <select
                  value={input.assignedTo}
                  onChange={(event) =>
                    setInput({ ...input, assignedTo: event.target.value })
                  }
                >
                  <option value="">Keine Zuordnung</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.display_name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Beschreibung
              <textarea
                rows={3}
                value={input.description}
                onChange={(event) =>
                  setInput({ ...input, description: event.target.value })
                }
                placeholder="Optional: Details zur Aufgabe"
              />
            </label>
            <div className="two-column-form">
              <label>
                Fällig am
                <input
                  type="date"
                  value={input.dueDate}
                  onChange={(event) =>
                    setInput({ ...input, dueDate: event.target.value })
                  }
                />
              </label>
              <label>
                Priorität
                <select
                  value={input.priority}
                  onChange={(event) =>
                    setInput({
                      ...input,
                      priority: event.target.value as TodoPriority,
                    })
                  }
                >
                  <option value="low">Niedrig</option>
                  <option value="medium">Mittel</option>
                  <option value="high">Hoch</option>
                </select>
              </label>
            </div>
            <div className="card-actions right-aligned">
              <button
                className="secondary-button"
                onClick={() => {
                  setInput(emptyInput());
                  setIsCreateFormOpen(false);
                }}
                type="button"
              >
                Abbrechen
              </button>

              <button
                className="primary-button"
                disabled={busy || !input.title.trim()}
                type="submit"
              >
                Speichern
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="card overview-full-width">
        <div className="section-header stacked-mobile">
          <div>
            <h2>Aufgabenliste</h2>
          </div>
          <div className="card-actions compact-actions">
            <button
              className="primary-button"
              onClick={() => setIsCreateFormOpen((open) => !open)}
              type="button"
            >
              {isCreateFormOpen ? "Schließen" : "+"}
            </button>

            {FILTERS.map((item) => (
              <button
                className={filter === item.id ? "tab active" : "tab"}
                key={item.id}
                onClick={() => setFilter(item.id)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="list-stack todo-list">
          {filteredTodos.length === 0 ? (
            <p className="muted-text">Keine passenden ToDos. Nice.</p>
          ) : (
            filteredTodos.map((todo) => {
              const assigned = todo.assigned_to
                ? membersById.get(todo.assigned_to)
                : null;
              const overdue = isOverdue(todo);
              const isEditing = editingId === todo.id;

              return (
                <article
                  className={todo.is_done ? "list-card is-done" : "list-card"}
                  key={todo.id}
                >
                  <div className="todo-content">
                    <div className="todo-title-line">
                      <input
                        checked={todo.is_done}
                        disabled={busy}
                        onChange={() => void onToggleDone(todo)}
                        type="checkbox"
                      />
                      <strong>{todo.title}</strong>
                    </div>

                    {isEditing ? (
                      <div className="form-stack">
                        <div className="two-column-form">
                          <label>
                            Titel
                            <input
                              value={editingInput.title}
                              onChange={(event) =>
                                setEditingInput({
                                  ...editingInput,
                                  title: event.target.value,
                                })
                              }
                            />
                          </label>
                          <label>
                            Zuständig
                            <select
                              value={editingInput.assignedTo}
                              onChange={(event) =>
                                setEditingInput({
                                  ...editingInput,
                                  assignedTo: event.target.value,
                                })
                              }
                            >
                              <option value="">Keine Zuordnung</option>
                              {members.map((member) => (
                                <option key={member.id} value={member.id}>
                                  {member.display_name}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                        <label>
                          Beschreibung
                          <textarea
                            rows={2}
                            value={editingInput.description}
                            onChange={(event) =>
                              setEditingInput({
                                ...editingInput,
                                description: event.target.value,
                              })
                            }
                          />
                        </label>
                        <div className="two-column-form">
                          <label>
                            Fällig am
                            <input
                              type="date"
                              value={editingInput.dueDate}
                              onChange={(event) =>
                                setEditingInput({
                                  ...editingInput,
                                  dueDate: event.target.value,
                                })
                              }
                            />
                          </label>
                          <label>
                            Priorität
                            <select
                              value={editingInput.priority}
                              onChange={(event) =>
                                setEditingInput({
                                  ...editingInput,
                                  priority: event.target.value as TodoPriority,
                                })
                              }
                            >
                              <option value="low">Niedrig</option>
                              <option value="medium">Mittel</option>
                              <option value="high">Hoch</option>
                            </select>
                          </label>
                        </div>
                      </div>
                    ) : (
                      <>
                        {todo.description && <p>{todo.description}</p>}
                        <div className="badge-row">
                          <span className="pill">
                            {formatDueDate(todo.due_date)}
                          </span>
                          <span className="pill">
                            Prio: {PRIORITY_LABELS[todo.priority]}
                          </span>
                          {overdue && (
                            <span className="pill danger-pill">Überfällig</span>
                          )}
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
                            <span className="muted-text">Ohne Zuordnung</span>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="card-actions compact-actions">
                    {isEditing ? (
                      <>
                        <button
                          className="primary-button"
                          disabled={busy || !editingInput.title.trim()}
                          onClick={() => void handleSave(todo.id)}
                          type="button"
                        >
                          Speichern
                        </button>
                        <button
                          className="secondary-button"
                          onClick={stopEditing}
                          type="button"
                        >
                          Abbrechen
                        </button>
                      </>
                    ) : (
                      <button
                        className="secondary-button"
                        onClick={() => startEditing(todo)}
                        type="button"
                      >
                        <span aria-hidden="true">⚙</span>
                      </button>
                    )}
                    <button
                      className="danger-button"
                      disabled={busy}
                      onClick={() => void handleDelete(todo)}
                      type="button"
                    >
                      <span aria-hidden="true">🗑️</span>
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
