import { useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/auth-js";
import { AuthView } from "./components/AuthView";
import { CalendarBoard } from "./components/CalendarBoard";
import { FamilyManager } from "./components/FamilyManager";
import { OverviewPanel } from "./components/OverviewPanel";
import { ShoppingListPanel } from "./components/ShoppingListPanel";
import { WishListPanel } from "./components/WishListPanel";
import {
  getNotificationPermission,
  requestNotificationPermission,
  scheduleEventNotifications,
  type NotificationSupportState,
} from "./lib/notifications";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
import {
  AppTab,
  EventFormInput,
  EventItem,
  Family,
  Profile,
  ShoppingItem,
  ShoppingItemInput,
  WishInput,
  WishItem,
} from "./types";

const PERSON_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];
const TABS: { id: AppTab; label: string }[] = [
  { id: "overview", label: "Übersicht" },
  { id: "calendar", label: "Kalender" },
  { id: "shopping", label: "Einkaufsliste" },
  { id: "wishes", label: "Wunschlisten" },
  { id: "family", label: "Familie" },
];

function extractErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Es ist ein unerwarteter Fehler aufgetreten.";
}

function pickColor(seed: string) {
  const value = Array.from(seed).reduce(
    (sum, char) => sum + char.charCodeAt(0),
    0,
  );
  return PERSON_COLORS[value % PERSON_COLORS.length];
}

function makeInviteCode() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
}

function buildEventPayload(
  input: EventFormInput,
  profileId: string,
  familyId: string,
  memberIds: string[],
) {
  const participantIds =
    input.participantIds.length > 0 ? input.participantIds : memberIds;
  const startsAt = new Date(`${input.date}T${input.startTime}:00`);
  const endsAt = input.endTime
    ? new Date(`${input.date}T${input.endTime}:00`)
    : null;

  if (Number.isNaN(startsAt.getTime())) {
    throw new Error("Bitte gib ein gültiges Startdatum an.");
  }

  if (endsAt && Number.isNaN(endsAt.getTime())) {
    throw new Error("Bitte gib eine gültige Endzeit an.");
  }

  if (endsAt && endsAt.getTime() < startsAt.getTime()) {
    throw new Error("Die Endzeit muss nach der Startzeit liegen.");
  }

  return {
    family_id: familyId,
    title: input.title.trim(),
    description: input.description.trim() || null,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt ? endsAt.toISOString() : null,
    created_by: profileId,
    participant_ids: participantIds,
    reminder_minutes: input.reminderMinutes,
  };
}

async function ensureProfile(user: User): Promise<Profile> {
  if (!supabase) {
    throw new Error("Supabase ist nicht konfiguriert.");
  }

  const { data: existingProfile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (existingProfile) {
    return existingProfile as Profile;
  }

  const displayName =
    (typeof user.user_metadata.display_name === "string" &&
      user.user_metadata.display_name) ||
    user.email?.split("@")[0] ||
    "Neues Mitglied";

  const color =
    (typeof user.user_metadata.color === "string" &&
      user.user_metadata.color) ||
    pickColor(user.id);

  const { data: createdProfile, error: createError } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      email: user.email ?? "",
      display_name: displayName,
      color,
    })
    .select("*")
    .single();

  if (createError) {
    throw createError;
  }

  return createdProfile as Profile;
}

async function fetchAppData(profileId: string) {
  if (!supabase) {
    throw new Error("Supabase ist nicht konfiguriert.");
  }

  const { data: membershipRows, error: membershipError } = await supabase
    .from("family_members")
    .select("family_id")
    .eq("profile_id", profileId)
    .limit(1);

  if (membershipError) {
    throw membershipError;
  }

  const familyId = membershipRows?.[0]?.family_id as string | undefined;

  if (!familyId) {
    return {
      family: null,
      members: [] as Profile[],
      events: [] as EventItem[],
      shoppingItems: [] as ShoppingItem[],
      wishes: [] as WishItem[],
    };
  }

  const [
    familyResponse,
    familyMembersResponse,
    eventsResponse,
    shoppingResponse,
    wishesResponse,
  ] = await Promise.all([
    supabase.from("families").select("*").eq("id", familyId).single(),
    supabase
      .from("family_members")
      .select("profile_id")
      .eq("family_id", familyId),
    supabase
      .from("events")
      .select("*")
      .eq("family_id", familyId)
      .order("starts_at", { ascending: true }),
    supabase
      .from("shopping_items")
      .select("*")
      .eq("family_id", familyId)
      .order("created_at", { ascending: false }),
    supabase
      .from("wishes")
      .select("*")
      .eq("family_id", familyId)
      .order("created_at", { ascending: false }),
  ]);

  if (familyResponse.error) {
    throw familyResponse.error;
  }
  if (familyMembersResponse.error) {
    throw familyMembersResponse.error;
  }
  if (eventsResponse.error) {
    throw eventsResponse.error;
  }
  if (shoppingResponse.error) {
    throw shoppingResponse.error;
  }
  if (wishesResponse.error) {
    throw wishesResponse.error;
  }

  const profileIds = (familyMembersResponse.data ?? []).map(
    (entry) => entry.profile_id,
  );
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("*")
    .in("id", profileIds)
    .order("display_name", { ascending: true });

  if (profilesError) {
    throw profilesError;
  }

  return {
    family: familyResponse.data as Family,
    members: (profiles ?? []) as Profile[],
    events: (eventsResponse.data ?? []) as EventItem[],
    shoppingItems: (shoppingResponse.data ?? []) as ShoppingItem[],
    wishes: (wishesResponse.data ?? []) as WishItem[],
  };
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [members, setMembers] = useState<Profile[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [wishes, setWishes] = useState<WishItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>("overview");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationSupportState>(getNotificationPermission());

  const currentProfile = useMemo(
    () => members.find((member) => member.id === profile?.id) ?? profile,
    [members, profile],
  );

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    setNotificationPermission(getNotificationPermission());

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function syncState() {
      if (!session?.user) {
        setProfile(null);
        setFamily(null);
        setMembers([]);
        setEvents([]);
        setShoppingItems([]);
        setWishes([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const ensuredProfile = await ensureProfile(session.user);
        const appData = await fetchAppData(ensuredProfile.id);

        if (cancelled) {
          return;
        }

        setProfile(ensuredProfile);
        setFamily(appData.family);
        setMembers(appData.members);
        setEvents(appData.events);
        setShoppingItems(appData.shoppingItems);
        setWishes(appData.wishes);

        if (!appData.family) {
          setActiveTab("family");
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(extractErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void syncState();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  useEffect(() => {
    return scheduleEventNotifications({
      events,
      currentProfile: currentProfile ?? null,
      permission: notificationPermission,
    });
  }, [events, currentProfile, notificationPermission]);

  async function refreshData() {
    if (!profile) {
      return;
    }

    const appData = await fetchAppData(profile.id);
    setFamily(appData.family);
    setMembers(appData.members);
    setEvents(appData.events);
    setShoppingItems(appData.shoppingItems);
    setWishes(appData.wishes);
  }

  async function runAction(action: () => Promise<void>, success?: string) {
    setBusy(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await action();
      if (success) {
        setSuccessMessage(success);
      }
    } catch (error) {
      setErrorMessage(extractErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleEnableNotifications() {
    const permission = await requestNotificationPermission();
    setNotificationPermission(permission);

    if (permission === "granted") {
      setSuccessMessage("Browser-Erinnerungen wurden aktiviert.");
      setErrorMessage(null);
      return;
    }

    if (permission === "denied") {
      setErrorMessage(
        "Browser-Erinnerungen wurden blockiert. Du kannst sie in den Browser-Einstellungen wieder aktivieren.",
      );
      setSuccessMessage(null);
      return;
    }

    if (permission === "unsupported") {
      setErrorMessage("Dieser Browser unterstützt keine Benachrichtigungen.");
      setSuccessMessage(null);
    }
  }

  async function handleSignIn(email: string, password: string) {
    await runAction(async () => {
      if (!supabase) {
        throw new Error("Supabase ist nicht konfiguriert.");
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        throw error;
      }
    });
  }

  async function handleSignUp(name: string, email: string, password: string) {
    await runAction(async () => {
      if (!supabase) {
        throw new Error("Supabase ist nicht konfiguriert.");
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: name,
            color: pickColor(email),
          },
        },
      });

      if (error) {
        throw error;
      }
    }, "Konto erstellt. Falls E-Mail-Bestätigung aktiv ist, bestätige zuerst deine Adresse.");
  }

  async function handleSignOut() {
    await runAction(async () => {
      if (!supabase) {
        throw new Error("Supabase ist nicht konfiguriert.");
      }

      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
    });
  }

  async function handleCreateFamily(name: string) {
    if (!profile || !supabase) {
      return;
    }

    const client = supabase;

    await runAction(async () => {
      const inviteCode = makeInviteCode();
      const { data: createdFamily, error } = await client
        .from("families")
        .insert({
          name,
          invite_code: inviteCode,
          owner_id: profile.id,
        })
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      const { error: membershipError } = await client
        .from("family_members")
        .insert({
          family_id: createdFamily.id,
          profile_id: profile.id,
        });

      if (membershipError) {
        throw membershipError;
      }

      await refreshData();
      setActiveTab("overview");
    }, "Familienkonto wurde erstellt.");
  }

  async function handleJoinFamily(inviteCode: string) {
    if (!profile || !supabase) {
      return;
    }

    const client = supabase;

    await runAction(async () => {
      const { data: targetFamily, error } = await client
        .from("families")
        .select("*")
        .eq("invite_code", inviteCode)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!targetFamily) {
        throw new Error(
          "Kein Familienkonto mit diesem Einladungscode gefunden.",
        );
      }

      const { error: membershipError } = await client
        .from("family_members")
        .upsert(
          {
            family_id: targetFamily.id,
            profile_id: profile.id,
          },
          { onConflict: "family_id,profile_id" },
        );

      if (membershipError) {
        throw membershipError;
      }

      await refreshData();
      setActiveTab("overview");
    }, "Familienkonto erfolgreich verknüpft.");
  }

  async function handleUpdateProfile(displayName: string, color: string) {
    if (!profile || !supabase) {
      return;
    }

    const client = supabase;

    await runAction(async () => {
      const { error } = await client
        .from("profiles")
        .update({ display_name: displayName, color })
        .eq("id", profile.id);

      if (error) {
        throw error;
      }

      setProfile({ ...profile, display_name: displayName, color });
      await refreshData();
    }, "Profil aktualisiert.");
  }

  async function handleCreateEvent(input: EventFormInput) {
    if (!profile || !family || !supabase) {
      return;
    }

    const client = supabase;

    await runAction(async () => {
      const payload = buildEventPayload(
        input,
        profile.id,
        family.id,
        members.map((member) => member.id),
      );

      const { error } = await client.from("events").insert(payload);
      if (error) {
        throw error;
      }

      await refreshData();
    }, "Termin gespeichert.");
  }

  async function handleUpdateEvent(eventId: string, input: EventFormInput) {
    if (!profile || !family || !supabase) {
      return;
    }

    const client = supabase;

    await runAction(async () => {
      const payload = buildEventPayload(
        input,
        profile.id,
        family.id,
        members.map((member) => member.id),
      );

      const { error } = await client
        .from("events")
        .update(payload)
        .eq("id", eventId);
      if (error) {
        throw error;
      }

      await refreshData();
    }, "Termin aktualisiert.");
  }

  async function handleDeleteEvent(event: EventItem) {
    if (!supabase) {
      return;
    }

    const client = supabase;

    await runAction(async () => {
      const { error } = await client.from("events").delete().eq("id", event.id);
      if (error) {
        throw error;
      }

      await refreshData();
    }, "Termin gelöscht.");
  }

  async function handleCreateShoppingItem(input: ShoppingItemInput) {
    if (!profile || !family || !supabase) {
      return;
    }

    const client = supabase;

    await runAction(async () => {
      const { error } = await client.from("shopping_items").insert({
        family_id: family.id,
        title: input.title.trim(),
        notes: input.notes.trim() || null,
        assigned_to: input.assignedTo || null,
        added_by: profile.id,
      });

      if (error) {
        throw error;
      }

      await refreshData();
    }, "Einkaufseintrag gespeichert.");
  }

  async function handleUpdateShoppingItem(
    itemId: string,
    input: ShoppingItemInput,
  ) {
    if (!supabase) {
      return;
    }

    const client = supabase;

    await runAction(async () => {
      const { error } = await client
        .from("shopping_items")
        .update({
          title: input.title.trim(),
          notes: input.notes.trim() || null,
          assigned_to: input.assignedTo || null,
        })
        .eq("id", itemId);

      if (error) {
        throw error;
      }

      await refreshData();
    }, "Einkaufseintrag aktualisiert.");
  }

  async function handleDeleteShoppingItem(item: ShoppingItem) {
    if (!supabase) {
      return;
    }

    const client = supabase;

    await runAction(async () => {
      const { error } = await client
        .from("shopping_items")
        .delete()
        .eq("id", item.id);
      if (error) {
        throw error;
      }

      await refreshData();
    }, "Einkaufseintrag gelöscht.");
  }

  async function handleToggleShoppingDone(item: ShoppingItem) {
    if (!supabase) {
      return;
    }

    const client = supabase;

    await runAction(async () => {
      const { error } = await client
        .from("shopping_items")
        .update({ is_done: !item.is_done })
        .eq("id", item.id);

      if (error) {
        throw error;
      }

      await refreshData();
    });
  }

  async function handleCreateWish(input: WishInput) {
    if (!profile || !family || !supabase) {
      return;
    }

    const client = supabase;

    await runAction(async () => {
      const { error } = await client.from("wishes").insert({
        family_id: family.id,
        person_id: input.personId,
        title: input.title.trim(),
        description: input.description.trim() || null,
        link: input.link.trim() || null,
        created_by: profile.id,
      });

      if (error) {
        throw error;
      }

      await refreshData();
    }, "Wunsch gespeichert.");
  }

  async function handleUpdateWish(wishId: string, input: WishInput) {
    if (!supabase) {
      return;
    }

    const client = supabase;

    await runAction(async () => {
      const { error } = await client
        .from("wishes")
        .update({
          person_id: input.personId,
          title: input.title.trim(),
          description: input.description.trim() || null,
          link: input.link.trim() || null,
        })
        .eq("id", wishId);

      if (error) {
        throw error;
      }

      await refreshData();
    }, "Wunsch aktualisiert.");
  }

  async function handleDeleteWish(wish: WishItem) {
    if (!supabase) {
      return;
    }

    const client = supabase;

    await runAction(async () => {
      const { error } = await client.from("wishes").delete().eq("id", wish.id);
      if (error) {
        throw error;
      }

      await refreshData();
    }, "Wunsch gelöscht.");
  }

  async function handleToggleWishFulfilled(wish: WishItem) {
    if (!supabase) {
      return;
    }

    const client = supabase;

    await runAction(async () => {
      const { error } = await client
        .from("wishes")
        .update({ is_fulfilled: !wish.is_fulfilled })
        .eq("id", wish.id);

      if (error) {
        throw error;
      }

      await refreshData();
    });
  }

  if (!isSupabaseConfigured || !supabase) {
    return (
      <div className="empty-state-shell">
        <div className="card empty-state-card">
          <span className="eyebrow">Setup nötig</span>
          <h1>Supabase verbinden</h1>
          <p>
            Die App ist fertig scaffolded, braucht aber noch deine
            Supabase-Zugangsdaten, damit Login und Cloud-Speicherung
            funktionieren.
          </p>
          <ol>
            <li>Lege ein Supabase-Projekt an.</li>
            <li>Führe die SQL aus `supabase/schema.sql` aus.</li>
            <li>
              Kopiere `.env.example` nach `.env` und trage URL + Anon Key ein.
            </li>
            <li>Starte die App mit `npm install` und `npm run dev`.</li>
          </ol>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="empty-state-shell">
        <div className="card empty-state-card">
          <h1>Planner lädt ...</h1>
        </div>
      </div>
    );
  }

  if (!session || !profile) {
    return (
      <>
        <AuthView
          loading={busy}
          onSignIn={handleSignIn}
          onSignUp={handleSignUp}
        />
        {(errorMessage || successMessage) && (
          <div className="floating-message-stack">
            {errorMessage && <div className="toast error">{errorMessage}</div>}
            {successMessage && (
              <div className="toast success">{successMessage}</div>
            )}
          </div>
        )}
      </>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <span className="eyebrow">Planner</span>
          <h1>{family ? family.name : "Familienkonto einrichten"}</h1>
          <p>
            {currentProfile?.display_name} · {currentProfile?.email}
          </p>
        </div>
        <div className="header-actions">
          <span className="status-pill">
            Erinnerungen:{" "}
            {notificationPermission === "granted"
              ? "aktiv"
              : notificationPermission === "unsupported"
                ? "nicht unterstützt"
                : "inaktiv"}
          </span>
          {notificationPermission !== "granted" && (
            <button
              className="secondary-button"
              onClick={() => void handleEnableNotifications()}
              type="button"
            >
              Erinnerungen aktivieren
            </button>
          )}
          <button
            className="secondary-button"
            type="button"
            onClick={() => void handleSignOut()}
          >
            Logout
          </button>
        </div>
      </header>

      {family && (
        <nav className="tab-row">
          {TABS.map((tab) => (
            <button
              className={activeTab === tab.id ? "tab active" : "tab"}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </nav>
      )}

      {(errorMessage || successMessage) && (
        <div className="message-stack">
          {errorMessage && <div className="banner error">{errorMessage}</div>}
          {successMessage && (
            <div className="banner success">{successMessage}</div>
          )}
        </div>
      )}

      {!family || activeTab === "family"
        ? currentProfile && (
            <FamilyManager
              family={family}
              members={members}
              currentProfile={currentProfile}
              busy={busy}
              onCreateFamily={handleCreateFamily}
              onJoinFamily={handleJoinFamily}
              onUpdateProfile={handleUpdateProfile}
            />
          )
        : null}

      {family && activeTab === "overview" && (
        <OverviewPanel
          events={events}
          members={members}
          shoppingItems={shoppingItems}
          wishes={wishes}
        />
      )}

      {family && activeTab === "calendar" && (
        <CalendarBoard
          events={events}
          members={members}
          busy={busy}
          onCreateEvent={handleCreateEvent}
          onUpdateEvent={handleUpdateEvent}
          onDeleteEvent={handleDeleteEvent}
        />
      )}

      {family && activeTab === "shopping" && (
        <ShoppingListPanel
          items={shoppingItems}
          members={members}
          busy={busy}
          onCreateItem={handleCreateShoppingItem}
          onUpdateItem={handleUpdateShoppingItem}
          onDeleteItem={handleDeleteShoppingItem}
          onToggleDone={handleToggleShoppingDone}
        />
      )}

      {family && activeTab === "wishes" && (
        <WishListPanel
          wishes={wishes}
          members={members}
          busy={busy}
          onCreateWish={handleCreateWish}
          onUpdateWish={handleUpdateWish}
          onDeleteWish={handleDeleteWish}
          onToggleFulfilled={handleToggleWishFulfilled}
        />
      )}
    </div>
  );
}
