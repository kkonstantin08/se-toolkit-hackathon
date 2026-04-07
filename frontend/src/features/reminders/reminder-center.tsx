import { useQuery } from "@tanstack/react-query";
import { Bell, BellRing } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "../../components/ui/forms";
import { useI18n } from "../../lib/i18n";
import { api } from "../../lib/api/client";
import type { DueReminder } from "../../types/api";

export function ReminderCenter() {
  const browserNotificationSupported = typeof window !== "undefined" && "Notification" in window;
  const [notificationPermission, setNotificationPermission] = useState(browserNotificationSupported ? Notification.permission : "default");
  const deliveredKeys = useRef(new Set<string>());
  const { messages } = useI18n();

  const remindersQuery = useQuery({
    queryKey: ["due-reminders"],
    queryFn: api.dueReminders,
    refetchInterval: 60_000,
  });

  const visibleReminders: DueReminder[] = (remindersQuery.data ?? []).slice(0, 4);

  useEffect(() => {
    for (const reminder of remindersQuery.data ?? []) {
      const key = `${reminder.item_id}:${reminder.occurrence_date ?? "single"}:${reminder.trigger_at}`;
      if (deliveredKeys.current.has(key)) continue;
      deliveredKeys.current.add(key);
      if (browserNotificationSupported && reminder.channel === "browser" && Notification.permission === "granted") {
        new Notification(reminder.title, {
          body: reminder.item_type === "event" ? messages.reminders.eventStartsSoon : messages.reminders.taskNeedsAttention,
        });
      }
    }
  }, [browserNotificationSupported, remindersQuery.data, messages.reminders.eventStartsSoon, messages.reminders.taskNeedsAttention]);

  return (
    <div className="fixed bottom-4 right-4 z-40 grid w-[min(24rem,calc(100vw-2rem))] gap-3">
      <div className="flex items-center justify-between rounded-2xl bg-white/90 px-4 py-3 shadow-soft backdrop-blur">
        <div className="flex items-center gap-2 text-sm font-medium text-ink">
          <Bell className="size-4" />
          {messages.reminders.title}
        </div>
        {browserNotificationSupported && notificationPermission !== "granted" ? (
          <Button
            variant="ghost"
            className="px-3 py-1"
            onClick={async () => {
              const permission = await Notification.requestPermission();
              setNotificationPermission(permission);
            }}
          >
            {messages.common.browser}
          </Button>
        ) : null}
      </div>
      {visibleReminders.map((reminder) => (
        <div key={`${reminder.item_id}-${reminder.trigger_at}`} className="rounded-2xl bg-ink px-4 py-3 text-white shadow-soft">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <BellRing className="size-4 text-coral" />
            {reminder.title}
          </div>
          <p className="mt-1 text-sm text-white/70">{reminder.item_type === "event" ? `${messages.reminders.eventStartsSoon}.` : `${messages.reminders.taskNeedsAttention}.`}</p>
        </div>
      ))}
    </div>
  );
}
