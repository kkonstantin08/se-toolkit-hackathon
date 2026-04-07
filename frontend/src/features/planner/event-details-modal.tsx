import { CalendarSync, CheckCircle2, Clock3, Pencil, Repeat, RotateCcw, Trash2, X } from "lucide-react";

import { Button } from "../../components/ui/forms";
import { getItemTypeLabel, getPlannerStatusLabel, getReminderChannelLabel, getSyncStatusLabel, useI18n } from "../../lib/i18n";
import { formatDisplayDate } from "../../lib/utils/datetime";
import type { PlannerOccurrence, Reminder } from "../../types/api";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded-2xl bg-slate-50 px-4 py-3">
      <div className="text-xs uppercase tracking-[0.16em] text-slate-400">{label}</div>
      <div className="text-sm text-ink">{value}</div>
    </div>
  );
}

export function EventDetailsModal({
  open,
  item,
  syncEnabled,
  syncHint,
  onClose,
  onEdit,
  onDelete,
  onRetrySync,
}: {
  open: boolean;
  item: PlannerOccurrence | null;
  syncEnabled: boolean;
  syncHint: string;
  onClose: () => void;
  onEdit: (item: PlannerOccurrence) => void;
  onDelete: (item: PlannerOccurrence) => void;
  onRetrySync: (item: PlannerOccurrence) => void;
}) {
  const { language, messages } = useI18n();

  if (!open || !item) return null;

  const isEvent = item.item_type === "event";
  const primaryDate = item.display_start_at ?? item.display_due_at ?? item.start_at ?? item.due_at;
  const secondaryDate = item.display_end_at ?? item.end_at;
  const syncStatus = getSyncStatusLabel(language, item.sync_status);
  const statusLabel = getPlannerStatusLabel(language, item.status, item.completed_for_occurrence);

  const describeRecurrence = (currentItem: PlannerOccurrence) => {
    if (!currentItem.recurrence) return messages.eventDetails.noRecurrence;

    const { frequency, interval, by_weekdays, day_of_month, ends_on, occurrence_count } = currentItem.recurrence;
    const weekdays = messages.common.recurrenceWeekdays;

    let label = "";
    if (frequency === "daily") {
      label = interval === 1 ? messages.eventDetails.everyDay : messages.eventDetails.everyNDays(interval);
    } else if (frequency === "weekly") {
      const days = (by_weekdays ?? []).map((weekday) => weekdays[weekday]).join(", ");
      label = interval === 1 ? messages.eventDetails.everyWeek(days) : messages.eventDetails.everyNWeeks(interval, days);
    } else {
      label = interval === 1 ? messages.eventDetails.everyMonth(day_of_month) : messages.eventDetails.everyNMonths(interval, day_of_month);
    }

    if (ends_on) {
      label += ` ${messages.eventDetails.untilDate(ends_on)}`;
    } else if (occurrence_count) {
      label += messages.eventDetails.occurrences(occurrence_count);
    }

    return label;
  };

  const describeReminder = (reminder: Reminder) => {
    if (reminder.trigger_mode === "absolute") {
      return messages.eventDetails.exactDate(formatDisplayDate(reminder.absolute_trigger_at, language));
    }

    const minutes = Math.abs(reminder.offset_minutes ?? 0);
    if (minutes >= 1440) return messages.eventDetails.daysBefore(Math.floor(minutes / 1440));
    if (minutes >= 60) return messages.eventDetails.hoursBefore(Math.floor(minutes / 60));
    return messages.eventDetails.minutesBefore(minutes);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-soft">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white"
                style={{ backgroundColor: item.color ?? "#0f3d3e" }}
              >
                {getItemTypeLabel(language, item.item_type)}
              </span>
              {item.is_recurring ? <Repeat className="size-4 text-slate-400" /> : null}
              {!isEvent ? (
                <span className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.16em] text-slate-400">
                  <CheckCircle2 className="size-3.5" />
                  {statusLabel}
                </span>
              ) : (
                <span className="text-xs uppercase tracking-[0.16em] text-slate-400">{syncStatus}</span>
              )}
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-ink">{item.title}</h2>
              <p className="mt-2 text-sm text-slate-500">{isEvent ? messages.eventDetails.detailsEventSubtitle : messages.eventDetails.detailsTaskSubtitle}</p>
            </div>
          </div>
          <Button variant="ghost" className="size-10 rounded-full p-0" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <DetailRow label={isEvent ? messages.eventDetails.dateTime : messages.eventDetails.deadline} value={primaryDate ? formatDisplayDate(primaryDate, language) : messages.common.noDate} />
          <DetailRow label={isEvent ? messages.eventDetails.end : messages.eventDetails.status} value={isEvent ? (secondaryDate ? formatDisplayDate(secondaryDate, language) : messages.common.notSpecified) : statusLabel} />
          <DetailRow label={messages.eventDetails.allDay} value={item.all_day ? messages.common.yes : messages.common.no} />
          <DetailRow label={messages.eventDetails.recurrence} value={describeRecurrence(item)} />
        </div>

        <div className="mt-4 grid gap-3">
          <DetailRow label={messages.eventDetails.description} value={item.description?.trim() ? item.description : messages.common.noDescription} />
          <div className="grid gap-2 rounded-2xl bg-slate-50 px-4 py-3">
            <div className="text-xs uppercase tracking-[0.16em] text-slate-400">{messages.eventDetails.reminders}</div>
            {item.reminders.length ? (
              <div className="grid gap-2">
                {item.reminders.map((reminder, index) => (
                  <div key={`${reminder.id ?? "reminder"}-${index}`} className="flex items-center gap-2 text-sm text-ink">
                    <Clock3 className="size-4 text-slate-400" />
                    <span>{describeReminder(reminder)}</span>
                    <span className="text-slate-400">·</span>
                    <span className="uppercase text-slate-500">{getReminderChannelLabel(language, reminder.channel)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-500">{messages.common.noReminders}</div>
            )}
          </div>
        </div>

        {item.is_recurring ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {isEvent && item.sync_status ? messages.eventDetails.recurringEventNote : messages.eventDetails.recurringTaskNote}
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button className="gap-2" onClick={() => onEdit(item)}>
            <Pencil className="size-4" />
            {messages.common.edit}
          </Button>
          {isEvent ? (
            <Button variant="secondary" className="gap-2" onClick={() => onRetrySync(item)} disabled={!syncEnabled} title={syncHint}>
              <CalendarSync className="size-4" />
              {messages.eventDetails.sync}
            </Button>
          ) : null}
          <Button variant="ghost" className="gap-2 text-red-500" onClick={() => onDelete(item)}>
            <Trash2 className="size-4" />
            {messages.common.delete}
          </Button>
          <Button variant="ghost" className="gap-2" onClick={onClose}>
            <RotateCcw className="size-4" />
            {messages.common.close}
          </Button>
        </div>
      </div>
    </div>
  );
}
