import { Capacitor } from "@capacitor/core";
import {
  LocalNotifications,
  type PermissionStatus,
  type SettingsPermissionStatus,
} from "@capacitor/local-notifications";
import { EventItem, Profile } from "../types";
import { formatDateTime } from "./date";

export type NotificationSupportState = NotificationPermission | "unsupported";

const STORAGE_PREFIX = "planner-reminder-fired";
const UPCOMING_WINDOW_MS = 24 * 60 * 60 * 1000;
const IMMEDIATE_GRACE_MS = 5 * 60 * 1000;
const ANDROID_REMINDER_CHANNEL_ID = "planner-event-reminders";

let nativeSyncToken = 0;
let nativeSyncQueue: Promise<void> = Promise.resolve();

function isNativeNotificationsSupported() {
  return typeof window !== "undefined" && Capacitor.isNativePlatform();
}

function mapNativePermission(
  status: PermissionStatus,
): NotificationSupportState {
  if (status.display === "granted") {
    return "granted";
  }

  if (status.display === "denied") {
    return "denied";
  }

  return "default";
}

function isAndroidNativePlatform() {
  return (
    isNativeNotificationsSupported() && Capacitor.getPlatform() === "android"
  );
}

function mapExactAlarmPermission(status: SettingsPermissionStatus) {
  return status.exact_alarm;
}

async function ensureAndroidReminderChannel() {
  if (
    !isNativeNotificationsSupported() ||
    Capacitor.getPlatform() !== "android"
  ) {
    return;
  }

  await LocalNotifications.createChannel({
    id: ANDROID_REMINDER_CHANNEL_ID,
    name: "Terminerinnerungen",
    description: "Erinnerungen für bevorstehende Termine",
    importance: 5,
    visibility: 1,
  });
}

function buildNotificationBody(event: EventItem) {
  return event.description
    ? `${formatDateTime(event.starts_at)} • ${event.description}`
    : `${formatDateTime(event.starts_at)} beginnt bald.`;
}

function getNativeNotificationId(event: EventItem) {
  const seed = `${event.id}:${event.starts_at}:${event.reminder_minutes ?? "none"}`;
  let hash = 0;

  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }

  return (hash % 2147480000) + 1;
}

async function clearNativeScheduledNotifications() {
  const pending = await LocalNotifications.getPending();

  if (pending.notifications.length === 0) {
    return;
  }

  await LocalNotifications.cancel({ notifications: pending.notifications });
}

async function isExactAlarmAvailable() {
  if (!isAndroidNativePlatform()) {
    return true;
  }

  const status = await LocalNotifications.checkExactNotificationSetting();
  return mapExactAlarmPermission(status) === "granted";
}

function isLatestNativeSync(token: number) {
  return token === nativeSyncToken;
}

async function syncNativeScheduledNotifications(
  options: {
    events: EventItem[];
    currentProfile: Profile | null;
    permission: NotificationSupportState;
  },
  token: number,
) {
  if (!isNativeNotificationsSupported() || !isLatestNativeSync(token)) {
    return;
  }

  if (options.permission !== "granted" || !options.currentProfile) {
    await clearNativeScheduledNotifications();
    return;
  }

  await ensureAndroidReminderChannel();
  if (!isLatestNativeSync(token)) {
    return;
  }

  const exactAlarmAvailable = await isExactAlarmAvailable();
  if (!isLatestNativeSync(token)) {
    return;
  }

  await clearNativeScheduledNotifications();
  if (!isLatestNativeSync(token)) {
    return;
  }

  const now = Date.now();
  const notifications = options.events
    .filter((event) => shouldNotifyForEvent(event, options.currentProfile!.id))
    .flatMap((event) => {
      const startsAt = new Date(event.starts_at).getTime();
      const remindAt = startsAt - (event.reminder_minutes ?? 0) * 60 * 1000;

      if (startsAt <= now) {
        return [];
      }

      let triggerAt = remindAt;
      if (remindAt <= now) {
        if (now - remindAt > IMMEDIATE_GRACE_MS) {
          return [];
        }

        triggerAt = now + 1000;
      }

      return [
        {
          id: getNativeNotificationId(event),
          title: `Erinnerung: ${event.title}`,
          body: buildNotificationBody(event),
          schedule: {
            at: new Date(triggerAt),
            allowWhileIdle: exactAlarmAvailable,
          },
          channelId: ANDROID_REMINDER_CHANNEL_ID,
          extra: {
            eventId: event.id,
          },
        },
      ];
    });

  if (notifications.length === 0 || !isLatestNativeSync(token)) {
    return;
  }

  await LocalNotifications.schedule({ notifications });
}

export function getNotificationPermission(): NotificationSupportState {
  if (isNativeNotificationsSupported()) {
    return "default";
  }

  if (typeof window === "undefined" || typeof Notification === "undefined") {
    return "unsupported";
  }

  return Notification.permission;
}

export async function refreshNotificationPermission(): Promise<NotificationSupportState> {
  if (isNativeNotificationsSupported()) {
    const status = await LocalNotifications.checkPermissions();
    return mapNativePermission(status);
  }

  return getNotificationPermission();
}

export async function requestNotificationPermission(): Promise<NotificationSupportState> {
  if (isNativeNotificationsSupported()) {
    const status = await LocalNotifications.requestPermissions();
    const permission = mapNativePermission(status);

    if (permission === "granted") {
      await ensureAndroidReminderChannel();
      if (isAndroidNativePlatform()) {
        await LocalNotifications.checkExactNotificationSetting();
      }
    }

    return permission;
  }

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
  window.localStorage.setItem(
    reminderStorageKey(event),
    new Date().toISOString(),
  );
}

function shouldNotifyForEvent(event: EventItem, profileId: string) {
  return (
    typeof event.reminder_minutes === "number" &&
    event.reminder_minutes > 0 &&
    event.participant_ids.includes(profileId)
  );
}

function showEventNotification(event: EventItem) {
  const notification = new Notification(`Erinnerung: ${event.title}`, {
    body: buildNotificationBody(event),
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
  if (isNativeNotificationsSupported()) {
    const token = ++nativeSyncToken;
    nativeSyncQueue = nativeSyncQueue
      .catch(() => undefined)
      .then(() => syncNativeScheduledNotifications(options, token))
      .catch(() => undefined);

    return () => {
      if (nativeSyncToken === token) {
        nativeSyncToken += 1;
      }
    };
  }

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
