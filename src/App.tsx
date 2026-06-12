import { useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/auth-js";
import { AuthView } from "./components/AuthView";
import { CalendarBoard } from "./components/CalendarBoard";
import { FamilyManager } from "./components/FamilyManager";
import { OverviewPanel } from "./components/OverviewPanel";
import { ProfileSettingsPanel } from "./components/ProfileSettingsPanel";
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
  ProfileSettingsInput,
  ShoppingItem,
  ShoppingItemInput,
  ThemePreference,
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
  { id: "shopping", label: "Einkauf" },
  { id: "wishes", label: "Wünsche" },
  { id: "family", label: "Familie" },
  { id: "profile", label: "Profil" },
];

function extractErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Es ist ein unerwarteter Fehler aufgetreten.";
}

function getNotificationStatusLabel(permission: NotificationSupportState) {
  if (permission === "granted") {
    return "Aktiv";
  }

  if (permission === "denied") {
    return "Blockiert";
  }

  if (permission === "unsupported") {
    return "Kein Push";
  }

  return "Aus";
}

function getNotificationStatusClass(permission: NotificationSupportState) {
  if (permission === "granted") {
    return "status-pill is-active";
  }

  if (permission === "denied") {
    return "status-pill is-blocked";
  }

  if (permission === "unsupported") {
    return "status-pill is-unsupported";
  }

  return "status-pill";
}

function getNotificationButtonClass(permission: NotificationSupportState) {
  if (permission === "granted") {
    return "icon-button is-active";
  }

  if (permission === "denied") {
    return "icon-button is-blocked";
  }

  if (permission === "unsupported") {
    return "icon-button is-unsupported";
  }

  return "icon-button";
}

function getTabIcon(tabId: AppTab) {
  switch (tabId) {
    case "overview":
      return (
        <svg
          aria-hidden="true"
          className="tab-icon"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
          viewBox="0 0 24 24"
        >
          <path d="M4 13h6V4H4z" />
          <path d="M14 20h6v-9h-6z" />
          <path d="M14 10h6V4h-6z" />
          <path d="M4 20h6v-3H4z" />
        </svg>
      );
    case "calendar":
      return (
        <svg
          aria-hidden="true"
          className="tab-icon"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
          viewBox="0 0 24 24"
        >
          <rect height="18" rx="3" width="18" x="3" y="4" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      );
    case "shopping":
      return (
        <svg
          aria-hidden="true"
          className="tab-icon"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
          viewBox="0 0 24 24"
        >
          <circle cx="9" cy="20" r="1" />
          <circle cx="18" cy="20" r="1" />
          <path d="M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 2-1.5L22 7H7" />
        </svg>
      );
    case "wishes":
      return (
        <svg
          aria-hidden="true"
          className="tab-icon"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
          viewBox="0 0 24 24"
        >
          <path d="M12 21s-6.7-4.4-9-8.1C1.1 9.8 2.2 6 6 6c2.1 0 3.3 1.1 4 2 0.7-0.9 1.9-2 4-2 3.8 0 4.9 3.8 3 6.9-2.3 3.7-9 8.1-9 8.1z" />
        </svg>
      );
    case "family":
      return (
        <svg
          aria-hidden="true"
          className="tab-icon"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
          viewBox="0 0 24 24"
        >
          <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
          <circle cx="9.5" cy="7" r="3" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.9" />
          <path d="M16 3.1a3 3 0 0 1 0 5.8" />
        </svg>
      );
    case "profile":
      return (
        <svg
          aria-hidden="true"
          className="tab-icon"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="8" r="4" />
          <path d="M5 20a7 7 0 0 1 14 0" />
        </svg>
      );
  }
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
      avatar_url: null,
      theme_preference: "system",
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

  useEffect(() => {
    const preference = currentProfile?.theme_preference ?? "system";

    const resolveTheme = () => {
      if (preference === "system") {
        return window.matchMedia("(prefers-color-scheme: light)").matches
          ? "light"
          : "dark";
      }

      return preference;
    };

    const applyTheme = () => {
      const resolvedTheme = resolveTheme();
      document.documentElement.dataset.theme = resolvedTheme;
      document.body.dataset.theme = resolvedTheme;
    };

    applyTheme();

    if (preference !== "system") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: light)");
    const listener = () => applyTheme();
    mediaQuery.addEventListener("change", listener);

    return () => {
      mediaQuery.removeEventListener("change", listener);
    };
  }, [currentProfile?.theme_preference]);

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

  async function handleUpdateProfile(input: ProfileSettingsInput) {
    if (!profile || !supabase) {
      return;
    }

    const client = supabase;

    await runAction(async () => {
      const payload = {
        display_name: input.displayName.trim(),
        color: input.color,
        avatar_url: input.avatarUrl.trim() || null,
        theme_preference: input.themePreference,
      } satisfies {
        display_name: string;
        color: string;
        avatar_url: string | null;
        theme_preference: ThemePreference;
      };

      const { error } = await client
        .from("profiles")
        .update(payload)
        .eq("id", profile.id);

      if (error) {
        throw error;
      }

      setProfile({ ...profile, ...payload });
      await refreshData();
    }, "Profil aktualisiert.");
  }

  async function handleQuickProfileUpdate(displayName: string, color: string) {
    await handleUpdateProfile({
      displayName,
      color,
      avatarUrl: currentProfile?.avatar_url ?? "",
      themePreference: currentProfile?.theme_preference ?? "system",
    });
  }

  async function handleCopyInviteCode(inviteCode: string) {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setSuccessMessage("Einladungscode kopiert.");
      setErrorMessage(null);
    } catch {
      setErrorMessage("Der Einladungscode konnte nicht kopiert werden.");
      setSuccessMessage(null);
    }
  }

  async function handleTransferOwnership(memberId: string) {
    if (!profile || !family || !supabase) {
      return;
    }

    const client = supabase;

    await runAction(async () => {
      if (family.owner_id !== profile.id) {
        throw new Error(
          "Nur der aktuelle Eigentümer kann das Familienkonto übertragen.",
        );
      }

      const { error } = await client
        .from("families")
        .update({ owner_id: memberId })
        .eq("id", family.id);

      if (error) {
        throw error;
      }

      await refreshData();
    }, "Eigentümer erfolgreich übertragen.");
  }

  async function handleRemoveMember(member: Profile) {
    if (!profile || !family || !supabase) {
      return;
    }

    const client = supabase;

    await runAction(async () => {
      if (family.owner_id !== profile.id) {
        throw new Error("Nur der Eigentümer kann Mitglieder entfernen.");
      }

      const { error } = await client
        .from("family_members")
        .delete()
        .eq("family_id", family.id)
        .eq("profile_id", member.id);

      if (error) {
        throw error;
      }

      await refreshData();
    }, `${member.display_name} wurde aus der Familie entfernt.`);
  }

  async function handleChangePassword(newPassword: string) {
    if (!supabase) {
      return;
    }

    const client = supabase;

    await runAction(async () => {
      const { error } = await client.auth.updateUser({ password: newPassword });
      if (error) {
        throw error;
      }
    }, "Passwort aktualisiert.");
  }

  async function handleLeaveFamily() {
    if (!profile || !family || !supabase) {
      return;
    }

    const client = supabase;
    const isOwner = family.owner_id === profile.id;

    await runAction(
      async () => {
        if (isOwner && members.length > 1) {
          throw new Error(
            "Du bist Eigentümer dieses Familienkontos. Entferne erst andere Mitglieder oder übertrage das Konto, bevor du es verlässt.",
          );
        }

        if (isOwner) {
          const { error } = await client
            .from("families")
            .delete()
            .eq("id", family.id);
          if (error) {
            throw error;
          }
        } else {
          const { error } = await client
            .from("family_members")
            .delete()
            .eq("family_id", family.id)
            .eq("profile_id", profile.id);

          if (error) {
            throw error;
          }
        }

        await refreshData();
        setActiveTab("family");
      },
      isOwner ? "Familienkonto entfernt." : "Familienkonto verlassen.",
    );
  }

  async function handleDeleteAccount() {
    if (!supabase) {
      return;
    }

    const client = supabase;

    await runAction(async () => {
      const { error } = await client.rpc("delete_current_user");
      if (error) {
        throw error;
      }

      await client.auth.signOut();
      setSession(null);
      setProfile(null);
      setFamily(null);
      setMembers([]);
      setEvents([]);
      setShoppingItems([]);
      setWishes([]);
      setActiveTab("family");
    }, "Account gelöscht.");
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
        <div className="topbar-title">
          <span className="eyebrow">Planner</span>
          <h1>{family ? family.name : "Familienkonto einrichten"}</h1>
          <p className="topbar-subline">
            <span>{currentProfile?.display_name}</span>
            <span className="topbar-email"> · {currentProfile?.email}</span>
          </p>
        </div>
        <div className="header-actions">
          <span className={getNotificationStatusClass(notificationPermission)}>
            {getNotificationStatusLabel(notificationPermission)}
          </span>
          <button
            aria-label={
              notificationPermission === "granted"
                ? "Erinnerungen aktiv"
                : "Erinnerungen aktivieren"
            }
            className={getNotificationButtonClass(notificationPermission)}
            disabled={
              notificationPermission === "granted" ||
              notificationPermission === "unsupported"
            }
            onClick={() => void handleEnableNotifications()}
            title={
              notificationPermission === "granted"
                ? "Erinnerungen sind aktiv"
                : notificationPermission === "unsupported"
                  ? "Dieser Browser unterstützt keine Benachrichtigungen"
                  : "Erinnerungen aktivieren"
            }
            type="button"
          >
            <svg
              aria-hidden="true"
              className="icon-bell"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
              viewBox="0 0 24 24"
            >
              <path d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
              <path d="M10 17a2 2 0 0 0 4 0" />
            </svg>
          </button>
          <button
            aria-label="Logout"
            className="icon-button logout-button"
            onClick={() => void handleSignOut()}
            title="Logout"
            type="button"
          >
            <svg
              aria-hidden="true"
              className="icon-logout"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
              viewBox="0 0 24 24"
            >
              <path d="M14 16l4-4-4-4" />
              <path d="M18 12H9" />
              <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
            </svg>
          </button>
        </div>
      </header>

      {family && (
        <>
          <nav className="tab-row tab-shell desktop-tab-nav">
            {TABS.map((tab) => (
              <button
                className={activeTab === tab.id ? "tab active" : "tab"}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                {getTabIcon(tab.id)}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
            {TABS.map((tab) => (
              <button
                className={
                  activeTab === tab.id
                    ? "mobile-nav-item active"
                    : "mobile-nav-item"
                }
                key={`mobile-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                {getTabIcon(tab.id)}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </>
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
              onUpdateProfile={handleQuickProfileUpdate}
              onCopyInviteCode={handleCopyInviteCode}
              onTransferOwnership={handleTransferOwnership}
              onRemoveMember={handleRemoveMember}
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

      {currentProfile && activeTab === "profile" && (
        <ProfileSettingsPanel
          currentProfile={currentProfile}
          family={family}
          members={members}
          busy={busy}
          notificationPermission={notificationPermission}
          onEnableNotifications={handleEnableNotifications}
          onUpdateProfile={handleUpdateProfile}
          onChangePassword={handleChangePassword}
          onLeaveFamily={handleLeaveFamily}
          onDeleteAccount={handleDeleteAccount}
        />
      )}
    </div>
  );
}
