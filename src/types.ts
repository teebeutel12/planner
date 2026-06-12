export type AppTab =
  | "overview"
  | "calendar"
  | "shopping"
  | "wishes"
  | "family"
  | "profile";

export type ThemePreference = "system" | "light" | "dark";

export interface Profile {
  id: string;
  email: string;
  display_name: string;
  color: string;
  avatar_url: string | null;
  theme_preference: ThemePreference;
}

export interface Family {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
}

export interface EventItem {
  id: string;
  family_id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  created_by: string;
  participant_ids: string[];
  reminder_minutes: number | null;
  created_at: string;
}

export interface ShoppingItem {
  id: string;
  family_id: string;
  title: string;
  notes: string | null;
  added_by: string;
  assigned_to: string | null;
  is_done: boolean;
  created_at: string;
}

export interface WishItem {
  id: string;
  family_id: string;
  person_id: string;
  title: string;
  description: string | null;
  link: string | null;
  created_by: string;
  is_fulfilled: boolean;
  created_at: string;
}

export interface EventFormInput {
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  participantIds: string[];
  reminderMinutes: number | null;
}

export interface ShoppingItemInput {
  title: string;
  notes: string;
  assignedTo: string;
}

export interface WishInput {
  personId: string;
  title: string;
  description: string;
  link: string;
}

export interface ProfileSettingsInput {
  displayName: string;
  color: string;
  avatarUrl: string;
  themePreference: ThemePreference;
}
