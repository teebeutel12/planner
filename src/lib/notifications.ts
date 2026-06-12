import { EventItem, Profile } from "../types";
import { formatDateTime } from "./date";

export type NotificationSupportState = NotificationPermission | "unsupported";

const STORAGE_PREFIX = "planner-reminder-fired";
const UPCOMING_WINDOW_MS = 24 * 60 * 60 * 1000;
const IMMEDIATE_GRACE_MS = 5 * 60 * 1000;

export function getNotificationPermission(): NotificationSupportState {
  if (typeof window === "undefined" || typeof Notification === "undefined") {
    return "unsupported";
  }

  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationSupportState> {
  if (typeof window === "undefined" || typeof Notification === "undefined") {
    return "unsupported";
  }

  return Notification.requestPermission();
}

function reminderStorageKey(event: EventItem) {
  return `${STORAGE_PREFIX}:${event.id}:${event.starts_at}:${event.reminder_minutes ?? "none"}`;
}

function hasNotificationBeenSent(event: EventItem) {
  return window.localStorage.getItem(reminderStorageKey(event)) !== null;
}

function markNotificationAsSent(event: EventItem) {
  window.localStorage.setItem(reminderStorageKey(event), new Date().toISOString());
}

function shouldNotifyForEvent(event: EventItem, profileId: string) {
  return (
    typeof event.reminder_minutes === "number" &&
    event.reminder_minutes > 0 &&
    event.participant_ids.includes(profileId)
  );
}

function showEventNotification(event: EventItem) {
  const body = event.description
    ? `${formatDateTime(event.starts_at)} • ${event.description}`
    : `${formatDateTime(event.starts_at)} beginnt bald.`;

  const notification = new Notification(`Erinnerung: ${event.title}`, {
    body,
    tag: `planner-event-${event.id}`,
  });

  notification.onclick = () => {
    window.focus();
    notification.close();
  };
}

export function scheduleEventNotifications(options: {
  events: EventItem[];
  currentProfile: Profile | null;
  permission: NotificationSupportState;
}) {
  if (
    typeof window === "undefined" ||
    typeof Notification === "undefined" ||
    options.permission !== "granted" ||
    !options.currentProfile
  ) {
    return () => undefined;
  }

  const timers: number[] = [];
  const now = Date.now();

  options.events
    .filter((event) => shouldNotifyForEvent(event, options.currentProfile!.id))
    .forEach((event) => {
      const startsAt = new Date(event.starts_at).getTime();
      const remindAt = startsAt - (event.reminder_minutes ?? 0) * 60 * 1000;

      if (startsAt <= now || hasNotificationBeenSent(event)) {
        return;
      }

      if (remindAt <= now && now - remindAt <= IMMEDIATE_GRACE_MS) {
        showEventNotification(event);
        markNotificationAsSent(event);
        return;
      }

      if (remindAt > now && remindAt - now <= UPCOMING_WINDOW_MS) {
        timers.push(
          window.setTimeout(() => {
            if (!hasNotificationBeenSent(event)) {
              showEventNotification(event);
              markNotificationAsSent(event);
            }
          }, remindAt - now),
        );
      }
    });

  return () => {
    timers.forEach((timer) => window.clearTimeout(timer));
  };
}
