import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  buildCalendarDays,
  formatDate,
  formatDateTime,
  formatTime,
  isSameDay,
  splitDateTimeValue,
  toDateInputValue,
} from "../lib/date";
import { EventFormInput, EventItem, Profile } from "../types";

interface CalendarBoardProps {
  events: EventItem[];
  members: Profile[];
  busy: boolean;
  onCreateEvent: (input: EventFormInput) => Promise<void>;
  onUpdateEvent: (eventId: string, input: EventFormInput) => Promise<void>;
  onDeleteEvent: (event: EventItem) => Promise<void>;
}

type EventFormState = {
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  participantIds: string[];
  reminderMinutes: string;
};

const REMINDER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "Keine Erinnerung" },
  { value: "5", label: "5 Minuten vorher" },
  { value: "10", label: "10 Minuten vorher" },
  { value: "30", label: "30 Minuten vorher" },
  { value: "60", label: "1 Stunde vorher" },
  { value: "1440", label: "1 Tag vorher" },
];

function createEmptyForm(date: Date, members: Profile[]): EventFormState {
  return {
    title: "",
    description: "",
    date: toDateInputValue(date),
    startTime: "18:00",
    endTime: "19:00",
    participantIds: members.map((member) => member.id),
    reminderMinutes: "30",
  };
}

function eventToFormState(event: EventItem): EventFormState {
  const startsAt = splitDateTimeValue(event.starts_at);
  const endsAt = event.ends_at ? splitDateTimeValue(event.ends_at) : null;

  return {
    title: event.title,
    description: event.description ?? "",
    date: startsAt.date,
    startTime: startsAt.time,
    endTime: endsAt?.time ?? "",
    participantIds: event.participant_ids,
    reminderMinutes: event.reminder_minutes
      ? String(event.reminder_minutes)
      : "",
  };
}

function formatReminderLabel(value: number | null) {
  if (!value) {
    return "Keine Erinnerung";
  }

  const option = REMINDER_OPTIONS.find(
    (entry) => Number(entry.value) === value,
  );
  return option?.label ?? `${value} Minuten vorher`;
}

export function CalendarBoard({
  events,
  members,
  busy,
  onCreateEvent,
  onUpdateEvent,
  onDeleteEvent,
}: CalendarBoardProps) {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [activeEvent, setActiveEvent] = useState<EventItem | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<EventFormState>(() =>
    createEmptyForm(new Date(), members),
  );

  useEffect(() => {
    if (members.length === 0) {
      return;
    }

    setForm((current) =>
      current.participantIds.length > 0
        ? current
        : { ...current, participantIds: members.map((member) => member.id) },
    );
  }, [members]);

  const days = useMemo(() => buildCalendarDays(selectedMonth), [selectedMonth]);
  const sortedEvents = useMemo(
    () =>
      [...events].sort(
        (left, right) =>
          new Date(left.starts_at).getTime() -
          new Date(right.starts_at).getTime(),
      ),
    [events],
  );

  const selectedDayEvents = useMemo(
    () =>
      sortedEvents.filter((event) => isSameDay(event.starts_at, selectedDay)),
    [selectedDay, sortedEvents],
  );

  const selectedMonthEvents = useMemo(
    () =>
      sortedEvents.filter(
        (event) =>
          new Date(event.starts_at).getMonth() === selectedMonth.getMonth() &&
          new Date(event.starts_at).getFullYear() ===
            selectedMonth.getFullYear(),
      ),
    [selectedMonth, sortedEvents],
  );

  const upcomingMonthEvents = useMemo(
    () =>
      selectedMonthEvents.filter(
        (event) => new Date(event.starts_at).getTime() >= Date.now(),
      ).length,
    [selectedMonthEvents],
  );

  function resetForm(nextDate = selectedDay) {
    setEditingEventId(null);
    setIsFormOpen(false);
    setForm(createEmptyForm(nextDate, members));
  }

  function openCreateForm(nextDate = selectedDay) {
    setEditingEventId(null);
    setIsFormOpen(true);
    setForm(createEmptyForm(nextDate, members));
  }

  function updateForm<K extends keyof EventFormState>(
    key: K,
    value: EventFormState[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleParticipant(id: string) {
    setForm((current) => ({
      ...current,
      participantIds: current.participantIds.includes(id)
        ? current.participantIds.filter((value) => value !== id)
        : [...current.participantIds, id],
    }));
  }

  function handleDayClick(day: Date) {
    setSelectedDay(day);
    setSelectedMonth(new Date(day.getFullYear(), day.getMonth(), 1));
  }

  function startEditing(event: EventItem) {
    setSelectedDay(new Date(event.starts_at));
    setSelectedMonth(
      new Date(
        new Date(event.starts_at).getFullYear(),
        new Date(event.starts_at).getMonth(),
        1,
      ),
    );
    setEditingEventId(event.id);
    setIsFormOpen(true);
    setActiveEvent(null);
    setForm(eventToFormState(event));
  }

  async function handleSubmit(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();

    const payload: EventFormInput = {
      title: form.title,
      description: form.description,
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      participantIds: form.participantIds,
      reminderMinutes: form.reminderMinutes
        ? Number(form.reminderMinutes)
        : null,
    };

    if (editingEventId) {
      await onUpdateEvent(editingEventId, payload);
    } else {
      await onCreateEvent(payload);
    }

    setSelectedDay(new Date(form.date));
    resetForm(new Date(form.date));
  }

  async function handleDelete(event: EventItem) {
    if (!window.confirm(`Termin "${event.title}" wirklich löschen?`)) {
      return;
    }

    await onDeleteEvent(event);
    if (activeEvent?.id === event.id) {
      setActiveEvent(null);
    }
    if (editingEventId === event.id) {
      resetForm();
    }
  }

  function getParticipant(id: string) {
    return members.find((member) => member.id === id) ?? null;
  }

  return (
    <div className="dashboard-grid calendar-layout">
      <section className="card calendar-card modern-calendar-card">
        <div className="calendar-card-header">
          <div>
            <span className="eyebrow">Monatsansicht</span>
            <h2>
              {selectedMonth.toLocaleDateString("de-DE", {
                month: "long",
                year: "numeric",
              })}
            </h2>
          </div>
          <div className="calendar-toolbar-group">
            <button
              className="secondary-button"
              type="button"
              onClick={() =>
                setSelectedMonth(
                  new Date(
                    selectedMonth.getFullYear(),
                    selectedMonth.getMonth() - 1,
                    1,
                  ),
                )
              }
            >
              ←
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                const today = new Date();
                setSelectedMonth(
                  new Date(today.getFullYear(), today.getMonth(), 1),
                );
                setSelectedDay(today);
              }}
            >
              Heute
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() =>
                setSelectedMonth(
                  new Date(
                    selectedMonth.getFullYear(),
                    selectedMonth.getMonth() + 1,
                    1,
                  ),
                )
              }
            >
              →
            </button>
          </div>
        </div>

        <div className="calendar-stats">
          <div className="calendar-stat">
            <span className="muted-label">Termine im Monat</span>
            <strong>{selectedMonthEvents.length}</strong>
          </div>
          <div className="calendar-stat">
            <span className="muted-label">Noch bevorstehend</span>
            <strong>{upcomingMonthEvents}</strong>
          </div>
          <div className="calendar-stat">
            <span className="muted-label">Ausgewählter Tag</span>
            <strong>{selectedDayEvents.length}</strong>
          </div>
        </div>

        <div className="calendar-legend">
          <span>
            <span className="legend-dot is-today" />
            Heute
          </span>
          <span>
            <span className="legend-dot is-selected" />
            Ausgewählt
          </span>
          <span>
            <span className="legend-dot is-event" />
            Mit Termin
          </span>
        </div>

        <div className="calendar-weekdays">
          {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>

        <div className="calendar-grid">
          {days.map((day) => {
            const dayEvents = sortedEvents.filter((entry) =>
              isSameDay(entry.starts_at, day),
            );
            const isCurrentMonth = day.getMonth() === selectedMonth.getMonth();
            const isToday = isSameDay(day, new Date());
            const isSelectedDay = isSameDay(day, selectedDay);

            return (
              <button
                className={[
                  "calendar-day",
                  isCurrentMonth ? "" : "muted",
                  isSelectedDay ? "selected" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                key={day.toISOString()}
                onClick={() => handleDayClick(day)}
                type="button"
              >
                <div className="calendar-day-header">
                  <span
                    className={
                      isToday ? "today-indicator" : "calendar-day-number"
                    }
                  >
                    {day.getDate()}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className="calendar-day-count">
                      {dayEvents.length}
                    </span>
                  )}
                </div>
                <div className="calendar-day-events">
                  {dayEvents.slice(0, 2).map((entry) => {
                    const accent =
                      getParticipant(entry.participant_ids[0])?.color ??
                      "#38bdf8";
                    return (
                      <button
                        className="calendar-chip calendar-chip-button"
                        key={entry.id}
                        onClick={(event) => {
                          event.stopPropagation();
                          setActiveEvent(entry);
                        }}
                        style={{ borderLeftColor: accent }}
                        type="button"
                      >
                        <strong>{entry.title}</strong>
                        <small>{formatTime(entry.starts_at)}</small>
                      </button>
                    );
                  })}
                  {dayEvents.length > 2 && (
                    <small>+ {dayEvents.length - 2} weitere</small>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="card calendar-side-card">
        <div className="section-header">
          <div>
            <h2>Tagesansicht</h2>
            <p className="muted-text">{formatDate(selectedDay)}</p>
          </div>
          <button
            className="secondary-button"
            onClick={() => {
              setSelectedMonth(
                new Date(selectedDay.getFullYear(), selectedDay.getMonth(), 1),
              );
              openCreateForm(selectedDay);
            }}
            type="button"
          >
            Termin erstellen
          </button>
        </div>

        <div className="list-stack day-agenda-list">
          {selectedDayEvents.length === 0 ? (
            <p className="muted-text">
              Für diesen Tag ist noch nichts geplant.
            </p>
          ) : (
            selectedDayEvents.map((event) => (
              <button
                className="day-agenda-item"
                key={event.id}
                onClick={() => setActiveEvent(event)}
                type="button"
              >
                <div>
                  <strong>{event.title}</strong>
                  <p>
                    {formatTime(event.starts_at)}
                    {event.ends_at ? ` – ${formatTime(event.ends_at)}` : ""}
                  </p>
                </div>
                <div className="calendar-event-dots">
                  {event.participant_ids.slice(0, 4).map((participantId) => {
                    const participant = getParticipant(participantId);
                    if (!participant) {
                      return null;
                    }

                    return (
                      <span
                        className="color-dot"
                        key={participant.id}
                        style={{ backgroundColor: participant.color }}
                        title={participant.display_name}
                      />
                    );
                  })}
                </div>
              </button>
            ))
          )}
        </div>
      </section>

      <section className="card calendar-form-card">
        {isFormOpen ? (
          <>
            <div className="section-header">
              <div>
                <h2>
                  {editingEventId ? "Termin bearbeiten" : "Termin erstellen"}
                </h2>
                <p className="muted-text">
                  Für {formatDate(new Date(form.date))} mit Teilnehmern und
                  optionaler Browser-Erinnerung.
                </p>
              </div>
              <button
                className="muted-button"
                onClick={() => resetForm()}
                type="button"
              >
                Abbrechen
              </button>
            </div>

            <form className="form-stack" onSubmit={handleSubmit}>
              <label>
                Titel
                <input
                  value={form.title}
                  onChange={(event) => updateForm("title", event.target.value)}
                  placeholder="z. B. Elternabend"
                  required
                />
              </label>
              <label>
                Beschreibung
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    updateForm("description", event.target.value)
                  }
                  placeholder="Optional: Ort, Hinweise, Notizen"
                  rows={3}
                />
              </label>
              <div className="two-column-form">
                <label>
                  Datum
                  <input
                    value={form.date}
                    onChange={(event) => updateForm("date", event.target.value)}
                    type="date"
                    required
                  />
                </label>
                <label>
                  Start
                  <input
                    value={form.startTime}
                    onChange={(event) =>
                      updateForm("startTime", event.target.value)
                    }
                    type="time"
                    required
                  />
                </label>
              </div>
              <div className="two-column-form">
                <label>
                  Ende
                  <input
                    value={form.endTime}
                    onChange={(event) =>
                      updateForm("endTime", event.target.value)
                    }
                    type="time"
                  />
                </label>
                <label>
                  Erinnerung
                  <select
                    value={form.reminderMinutes}
                    onChange={(event) =>
                      updateForm("reminderMinutes", event.target.value)
                    }
                  >
                    {REMINDER_OPTIONS.map((option) => (
                      <option key={option.label} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <fieldset>
                <legend>Wen betrifft der Termin?</legend>
                <div className="checkbox-grid">
                  {members.map((member) => (
                    <label className="checkbox-tile" key={member.id}>
                      <input
                        checked={form.participantIds.includes(member.id)}
                        onChange={() => toggleParticipant(member.id)}
                        type="checkbox"
                      />
                      <span
                        className="color-dot"
                        style={{ backgroundColor: member.color }}
                        aria-hidden="true"
                      />
                      {member.display_name}
                    </label>
                  ))}
                </div>
              </fieldset>
              <button className="primary-button" type="submit" disabled={busy}>
                {editingEventId ? "Termin aktualisieren" : "Termin speichern"}
              </button>
            </form>
          </>
        ) : (
          <div className="calendar-form-placeholder">
            <div className="calendar-form-placeholder-copy">
              <span className="eyebrow">Schnell hinzufügen</span>
              <h2>Neuen Termin für {formatDate(selectedDay)} anlegen</h2>
              <p className="muted-text">
                Das Formular bleibt ausgeblendet, bis du es bewusst öffnest.
              </p>
            </div>

            <div className="calendar-form-placeholder-stats">
              <div className="calendar-form-placeholder-stat">
                <span className="muted-label">Ausgewählter Tag</span>
                <strong>{formatDate(selectedDay)}</strong>
              </div>
              <div className="calendar-form-placeholder-stat">
                <span className="muted-label">Termine an diesem Tag</span>
                <strong>{selectedDayEvents.length}</strong>
              </div>
            </div>

            <button
              className="primary-button"
              onClick={() => openCreateForm(selectedDay)}
              type="button"
            >
              + Termin erstellen
            </button>
          </div>
        )}
      </section>

      <section className="card overview-full-width">
        <div className="section-header">
          <h2>Terminübersicht</h2>
          <span className="pill">{sortedEvents.length}</span>
        </div>
        <div className="list-stack">
          {sortedEvents.length === 0 ? (
            <p className="muted-text">Noch keine Termine vorhanden.</p>
          ) : (
            sortedEvents.map((entry) => (
              <article className="list-card" key={entry.id}>
                <div>
                  <strong>{entry.title}</strong>
                  <p>{formatDateTime(entry.starts_at)}</p>
                  {entry.description && <p>{entry.description}</p>}
                  <p className="muted-text">
                    {formatReminderLabel(entry.reminder_minutes)}
                  </p>
                </div>
                <div className="card-actions right-aligned">
                  <div className="badge-row">
                    {entry.participant_ids.map((participantId) => {
                      const participant = getParticipant(participantId);
                      if (!participant) {
                        return null;
                      }

                      return (
                        <span
                          className="person-badge"
                          key={participant.id}
                          style={{
                            backgroundColor: `${participant.color}22`,
                            color: participant.color,
                          }}
                        >
                          {participant.display_name}
                        </span>
                      );
                    })}
                  </div>
                  <div className="card-actions compact-actions">
                    <button
                      className="muted-button"
                      onClick={() => setActiveEvent(entry)}
                      type="button"
                    >
                      Details
                    </button>
                    <button
                      className="secondary-button"
                      onClick={() => startEditing(entry)}
                      type="button"
                    >
                      Bearbeiten
                    </button>
                    <button
                      className="danger-button"
                      onClick={() => void handleDelete(entry)}
                      type="button"
                    >
                      Löschen
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      {activeEvent && (
        <div
          className="modal-backdrop"
          onClick={() => setActiveEvent(null)}
          role="presentation"
        >
          <div
            className="card modal-card"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="section-header">
              <div>
                <h2>{activeEvent.title}</h2>
                <p className="muted-text">
                  {formatDateTime(activeEvent.starts_at)}
                </p>
              </div>
              <button
                className="muted-button"
                onClick={() => setActiveEvent(null)}
                type="button"
              >
                Schließen
              </button>
            </div>

            <div className="modal-details">
              {activeEvent.description && <p>{activeEvent.description}</p>}
              <p>
                <strong>Ende:</strong>{" "}
                {activeEvent.ends_at
                  ? formatTime(activeEvent.ends_at)
                  : "Nicht gesetzt"}
              </p>
              <p>
                <strong>Erinnerung:</strong>{" "}
                {formatReminderLabel(activeEvent.reminder_minutes)}
              </p>
              <div className="badge-row">
                {activeEvent.participant_ids.map((participantId) => {
                  const participant = getParticipant(participantId);
                  if (!participant) {
                    return null;
                  }

                  return (
                    <span
                      className="person-badge"
                      key={participant.id}
                      style={{
                        backgroundColor: `${participant.color}22`,
                        color: participant.color,
                      }}
                    >
                      {participant.display_name}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="secondary-button"
                onClick={() => startEditing(activeEvent)}
                type="button"
              >
                Bearbeiten
              </button>
              <button
                className="danger-button"
                onClick={() => void handleDelete(activeEvent)}
                type="button"
              >
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
