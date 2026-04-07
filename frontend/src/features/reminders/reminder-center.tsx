import { useQuery } from "@tanstack/react-query";
import { Bell, BellRing } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "../../components/ui/forms";
import { useI18n } from "../../lib/i18n";
import { api } from "../../lib/api/client";
import type { DueReminder } from "../../types/api";

const READ_STORAGE_KEY = "plansync-reminders-read";
const DISMISSED_STORAGE_KEY = "plansync-reminders-dismissed";

function parseStoredKeys(storageKey: string) {
  if (typeof window === "undefined") return new Set<string>();

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set<string>(parsed) : new Set<string>();
  } catch {
    return new Set<string>();
  }
}

function persistKeys(storageKey: string, values: Set<string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(Array.from(values)));
}

function getReminderKey(reminder: DueReminder) {
  return `${reminder.item_id}:${reminder.occurrence_date ?? "single"}:${reminder.trigger_at}`;
}

export function ReminderCenter() {
  const browserNotificationSupported = typeof window !== "undefined" && "Notification" in window;
  const [notificationPermission, setNotificationPermission] = useState(browserNotificationSupported ? Notification.permission : "default");
  const [isOpen, setIsOpen] = useState(false);
  const [readReminderKeys, setReadReminderKeys] = useState<Set<string>>(() => parseStoredKeys(READ_STORAGE_KEY));
  const [dismissedReminderKeys, setDismissedReminderKeys] = useState<Set<string>>(() => parseStoredKeys(DISMISSED_STORAGE_KEY));
  const deliveredKeys = useRef(new Set<string>());
  const fabRef = useRef<HTMLButtonElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const { language, messages } = useI18n();

  const labels =
    language === "ru"
      ? {
          empty: "\u0423\u0432\u0435\u0434\u043e\u043c\u043b\u0435\u043d\u0438\u0439 \u043d\u0435\u0442",
          readAll: "\u041f\u0440\u043e\u0447\u0438\u0442\u0430\u0442\u044c \u0432\u0441\u0435",
          deleteAll: "\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u0432\u0441\u0435 \u0443\u0432\u0435\u0434\u043e\u043c\u043b\u0435\u043d\u0438\u044f",
          enableBrowser: "\u0412\u043a\u043b\u044e\u0447\u0438\u0442\u044c browser-\u0443\u0432\u0435\u0434\u043e\u043c\u043b\u0435\u043d\u0438\u044f",
          count: (value: number) => `${value} \u0443\u0432\u0435\u0434\u043e\u043c\u043b\u0435\u043d\u0438\u0439`,
        }
      : {
          empty: "No notifications",
          readAll: "Mark all read",
          deleteAll: "Delete all notifications",
          enableBrowser: "Enable browser notifications",
          count: (value: number) => `${value} notifications`,
        };

  const remindersQuery = useQuery({
    queryKey: ["due-reminders"],
    queryFn: api.dueReminders,
    refetchInterval: 60_000,
  });

  const activeReminders = useMemo(
    () =>
      [...(remindersQuery.data ?? [])].sort(
        (left, right) => new Date(right.trigger_at).getTime() - new Date(left.trigger_at).getTime(),
      ),
    [remindersQuery.data],
  );

  const visibleReminders = useMemo(
    () =>
      activeReminders.filter((reminder) => {
        const key = getReminderKey(reminder);
        return !readReminderKeys.has(key) && !dismissedReminderKeys.has(key);
      }),
    [activeReminders, readReminderKeys, dismissedReminderKeys],
  );

  const hasUnread = visibleReminders.length > 0;

  useEffect(() => {
    persistKeys(READ_STORAGE_KEY, readReminderKeys);
  }, [readReminderKeys]);

  useEffect(() => {
    persistKeys(DISMISSED_STORAGE_KEY, dismissedReminderKeys);
  }, [dismissedReminderKeys]);

  useEffect(() => {
    for (const reminder of activeReminders) {
      const key = getReminderKey(reminder);
      if (deliveredKeys.current.has(key)) continue;
      deliveredKeys.current.add(key);

      if (browserNotificationSupported && reminder.channel === "browser" && Notification.permission === "granted") {
        new Notification(reminder.title, {
          body: reminder.item_type === "event" ? messages.reminders.eventStartsSoon : messages.reminders.taskNeedsAttention,
        });
      }
    }
  }, [activeReminders, browserNotificationSupported, messages.reminders.eventStartsSoon, messages.reminders.taskNeedsAttention]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (popupRef.current?.contains(target) || fabRef.current?.contains(target)) return;
      setIsOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const markAllRead = () => {
    setReadReminderKeys((current) => {
      const next = new Set(current);
      for (const reminder of visibleReminders) {
        next.add(getReminderKey(reminder));
      }
      return next;
    });
  };

  const deleteAllNotifications = () => {
    setDismissedReminderKeys((current) => {
      const next = new Set(current);
      for (const reminder of visibleReminders) {
        next.add(getReminderKey(reminder));
      }
      return next;
    });
  };

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <div className="relative">
        {isOpen ? (
          <div
            ref={popupRef}
            className="absolute bottom-16 right-0 z-10 grid w-[min(22rem,calc(100vw-2rem))] gap-3 rounded-[1.75rem] border border-white/70 bg-white/95 p-4 shadow-soft backdrop-blur"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <Bell className="size-4" />
                  {messages.reminders.title}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {visibleReminders.length ? labels.count(visibleReminders.length) : labels.empty}
                </p>
              </div>
              {browserNotificationSupported && notificationPermission !== "granted" ? (
                <Button
                  variant="ghost"
                  className="px-3 py-1 text-xs"
                  onClick={async () => {
                    const permission = await Notification.requestPermission();
                    setNotificationPermission(permission);
                  }}
                >
                  {labels.enableBrowser}
                </Button>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" className="px-3 py-2 text-xs" onClick={markAllRead} disabled={!visibleReminders.length}>
                {labels.readAll}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="px-3 py-2 text-xs text-red-500"
                onClick={deleteAllNotifications}
                disabled={!visibleReminders.length}
              >
                {labels.deleteAll}
              </Button>
            </div>

            {visibleReminders.length ? (
              <div className="grid max-h-80 gap-2 overflow-y-auto">
                {visibleReminders.map((reminder) => (
                  <div key={getReminderKey(reminder)} className="rounded-2xl bg-ink px-4 py-3 text-white shadow-soft">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <BellRing className="size-4 text-coral" />
                      <span className="min-w-0 break-words">{reminder.title}</span>
                    </div>
                    <p className="mt-1 text-sm text-white/70">
                      {reminder.item_type === "event" ? `${messages.reminders.eventStartsSoon}.` : `${messages.reminders.taskNeedsAttention}.`}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">{labels.empty}</div>
            )}
          </div>
        ) : null}

        <button
          ref={fabRef}
          type="button"
          className="relative grid size-12 place-items-center rounded-full border border-white/70 bg-white/95 text-ink shadow-soft transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-coral/40"
          onClick={() => setIsOpen((current) => !current)}
          aria-label={messages.reminders.title}
          title={messages.reminders.title}
        >
          <Bell className="size-5" />
          {hasUnread ? <span className="absolute right-1.5 top-1.5 size-2.5 rounded-full bg-coral" /> : null}
        </button>
      </div>
    </div>
  );
}
