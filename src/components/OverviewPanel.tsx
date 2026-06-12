import { EventItem, Profile, ShoppingItem, WishItem } from '../types';
import { formatDateTime } from '../lib/date';

interface OverviewPanelProps {
  events: EventItem[];
  members: Profile[];
  shoppingItems: ShoppingItem[];
  wishes: WishItem[];
}

function memberNameMap(members: Profile[]) {
  return new Map(members.map((member) => [member.id, member]));
}

export function OverviewPanel({ events, members, shoppingItems, wishes }: OverviewPanelProps) {
  const membersById = memberNameMap(members);
  const upcomingEvents = [...events]
    .filter((event) => new Date(event.starts_at).getTime() >= Date.now() - 24 * 60 * 60 * 1000)
    .sort((left, right) => new Date(left.starts_at).getTime() - new Date(right.starts_at).getTime())
    .slice(0, 6);

  const openShoppingItems = shoppingItems.filter((item) => !item.is_done).slice(0, 8);
  const activeWishes = wishes.filter((wish) => !wish.is_fulfilled);

  const wishesByPerson = members.map((member) => ({
    member,
    wishes: activeWishes.filter((wish) => wish.person_id === member.id).slice(0, 4),
  }));

  return (
    <div className="dashboard-grid">
      <section className="card">
        <div className="section-header">
          <h2>Nächste Termine</h2>
          <span className="pill">{upcomingEvents.length}</span>
        </div>
        <div className="list-stack">
          {upcomingEvents.length === 0 ? (
            <p className="muted-text">Noch keine Termine geplant.</p>
          ) : (
            upcomingEvents.map((event) => (
              <article className="list-card" key={event.id}>
                <div>
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
                        style={{ backgroundColor: `${participant.color}22`, color: participant.color }}
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
        <div className="section-header">
          <h2>Offene Einkaufsliste</h2>
          <span className="pill">{openShoppingItems.length}</span>
        </div>
        <div className="list-stack">
          {openShoppingItems.length === 0 ? (
            <p className="muted-text">Alles erledigt – die Liste ist leer.</p>
          ) : (
            openShoppingItems.map((item) => {
              const assigned = item.assigned_to ? membersById.get(item.assigned_to) : null;
              return (
                <article className="list-card" key={item.id}>
                  <div>
                    <strong>{item.title}</strong>
                    {item.notes && <p>{item.notes}</p>}
                  </div>
                  {assigned && (
                    <span
                      className="person-badge"
                      style={{ backgroundColor: `${assigned.color}22`, color: assigned.color }}
                    >
                      {assigned.display_name}
                    </span>
                  )}
                </article>
              );
            })
          )}
        </div>
      </section>

      <section className="card overview-full-width">
        <div className="section-header">
          <h2>Wunschliste nach Personen</h2>
          <span className="pill">{activeWishes.length}</span>
        </div>
        <div className="wish-columns">
          {wishesByPerson.map(({ member, wishes: memberWishes }) => (
            <div className="wish-column" key={member.id}>
              <div className="person-title-row">
                <span className="color-dot" style={{ backgroundColor: member.color }} aria-hidden="true" />
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
