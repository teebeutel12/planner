import {
  EventItem,
  Profile,
  ShoppingItem,
  ShoppingList,
  WishItem,
} from "../types";
import { formatDateTime } from "../lib/date";

interface OverviewPanelProps {
  events: EventItem[];
  members: Profile[];
  shoppingLists: ShoppingList[];
  shoppingItems: ShoppingItem[];
  wishes: WishItem[];
}

function memberNameMap(members: Profile[]) {
  return new Map(members.map((member) => [member.id, member]));
}

export function OverviewPanel({
  events,
  members,
  shoppingLists,
  shoppingItems,
  wishes,
}: OverviewPanelProps) {
  const membersById = memberNameMap(members);
  const allUpcomingEvents = [...events]
    .filter((event) => new Date(event.starts_at).getTime() >= Date.now())
    .sort(
      (left, right) =>
        new Date(left.starts_at).getTime() -
        new Date(right.starts_at).getTime(),
    );
  const upcomingEvents = allUpcomingEvents.slice(0, 6);

  const openShoppingItems = shoppingItems.filter((item) => !item.is_done);
  const previewShoppingItems = openShoppingItems.slice(0, 8);
  const openShoppingLists = shoppingLists.filter((list) =>
    openShoppingItems.some((item) => item.list_name === list.name),
  );
  const activeWishes = wishes.filter((wish) => !wish.is_fulfilled);

  const wishesByPerson = members.map((member) => ({
    member,
    wishes: activeWishes
      .filter((wish) => wish.person_id === member.id)
      .slice(0, 4),
  }));

  return (
    <div className="dashboard-grid overview-layout">
      <section className="card overview-full-width compact-card">
        <span className="eyebrow">Übersicht</span>
        <div className="section-header stacked-mobile">
          <div>
            <h2>Alles auf einen Blick</h2>
            <p className="muted-text">
              Die wichtigsten Termine, Einkaufslisten und Wünsche deiner
              Familie.
            </p>
          </div>
        </div>
        <div className="stats-grid">
          <article className="summary-card">
            <span className="muted-label">Nächste Termine</span>
            <strong>{allUpcomingEvents.length}</strong>
            <p>
              {upcomingEvents.length > 0
                ? "stehen noch an"
                : "aktuell nichts geplant"}
            </p>
          </article>
          <article className="summary-card">
            <span className="muted-label">Offene Einkaufslisten</span>
            <strong>{openShoppingLists.length}</strong>
            <p>haben aktuell offene Einträge</p>
          </article>
          <article className="summary-card">
            <span className="muted-label">Offene Einkäufe</span>
            <strong>{openShoppingItems.length}</strong>
            <p>stehen aktuell auf euren Listen</p>
          </article>
          <article className="summary-card">
            <span className="muted-label">Offene Wünsche</span>
            <strong>{activeWishes.length}</strong>
            <p>sind noch nicht erfüllt</p>
          </article>
        </div>
      </section>

      <section className="card">
        <div className="section-header stacked-mobile">
          <div>
            <h2>Nächste Termine</h2>
            <p className="muted-text">Was steht als Nächstes an?</p>
          </div>
          <span className="pill">{allUpcomingEvents.length}</span>
        </div>
        <div className="list-stack">
          {upcomingEvents.length === 0 ? (
            <p className="muted-text">Noch keine Termine geplant.</p>
          ) : (
            upcomingEvents.map((event) => (
              <article className="list-card" key={event.id}>
                <div className="content-stack-sm">
                  <strong>{event.title}</strong>
                  <p>{formatDateTime(event.starts_at)}</p>
                </div>
                <div className="badge-row">
                  {event.participant_ids.map((participantId) => {
                    const participant = membersById.get(participantId);
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
              </article>
            ))
          )}
        </div>
      </section>

      <section className="card">
        <div className="section-header stacked-mobile">
          <div>
            <h2>Offene Einkaufslisten</h2>
            <p className="muted-text">
              Was sollte als Nächstes und in welchem Laden besorgt werden?
            </p>
          </div>
          <span className="pill">{openShoppingItems.length}</span>
        </div>
        <div className="list-stack">
          {previewShoppingItems.length === 0 ? (
            <p className="muted-text">
              Alles erledigt – eure Listen sind leer.
            </p>
          ) : (
            previewShoppingItems.map((item) => {
              const assigned = item.assigned_to
                ? membersById.get(item.assigned_to)
                : null;
              return (
                <article className="list-card" key={item.id}>
                  <div className="content-stack-sm">
                    <strong>{item.title}</strong>
                    <div className="badge-row">
                      <span className="pill">{item.list_name}</span>
                    </div>
                    {item.notes && <p>{item.notes}</p>}
                  </div>
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
                </article>
              );
            })
          )}
        </div>
      </section>

      <section className="card overview-full-width">
        <div className="section-header stacked-mobile">
          <div>
            <h2>Wunschlisten nach Personen</h2>
            <p className="muted-text">
              Jede Person mit eigener, farblich sortierter Liste.
            </p>
          </div>
          <span className="pill">{activeWishes.length}</span>
        </div>
        <div className="wish-columns">
          {wishesByPerson.map(({ member, wishes: memberWishes }) => (
            <div className="wish-column soft-column" key={member.id}>
              <div className="person-title-row">
                <span
                  className="color-dot"
                  style={{ backgroundColor: member.color }}
                  aria-hidden="true"
                />
                <strong>{member.display_name}</strong>
              </div>
              {memberWishes.length === 0 ? (
                <p className="muted-text">Keine offenen Wünsche.</p>
              ) : (
                memberWishes.map((wish) => (
                  <article className="list-card compact" key={wish.id}>
                    <strong>{wish.title}</strong>
                    {wish.description && <p>{wish.description}</p>}
                  </article>
                ))
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
