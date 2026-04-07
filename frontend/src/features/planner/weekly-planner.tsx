import clsx from "clsx";
import { addDays, format, parseISO } from "date-fns";
import { CalendarSync, CheckCircle2, Repeat } from "lucide-react";

import { Button } from "../../components/ui/forms";
import { getItemTypeLabel, getSyncStatusLabel, useI18n } from "../../lib/i18n";
import { formatTime } from "../../lib/utils/datetime";
import type { PlannerOccurrence } from "../../types/api";

function groupByDay(items: PlannerOccurrence[], startOfWeek: string) {
  const start = parseISO(startOfWeek);
  return Array.from({ length: 7 }).map((_, index) => {
    const day = addDays(start, index);
    const dayKey = format(day, "yyyy-MM-dd");
    return {
      day,
      items: items.filter((item) => {
        const itemDate =
          item.occurrence_date ??
          item.display_start_at?.slice(0, 10) ??
          item.display_due_at?.slice(0, 10) ??
          item.start_at?.slice(0, 10) ??
          item.due_at?.slice(0, 10);
        return itemDate === dayKey;
      }),
    };
  });
}

function EventChip({
  item,
  onOpen,
  onSync,
  syncEnabled,
  syncHint,
}: {
  item: PlannerOccurrence;
  onOpen: (item: PlannerOccurrence) => void;
  onSync: (item: PlannerOccurrence) => void;
  syncEnabled: boolean;
  syncHint: string;
}) {
  const timeValue = item.display_start_at ?? item.display_due_at;
  const { language, messages } = useI18n();
  const itemTypeLabel = getItemTypeLabel(language, item.item_type);
  const syncStatusLabel = getSyncStatusLabel(language, item.sync_status);

  return (
    <>
      <div className="lg:hidden">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3 rounded-3xl border border-white/70 bg-white/90 p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-tide/20 hover:shadow-md">
          <button
            type="button"
            className="grid min-w-0 gap-3 text-left focus:outline-none focus:ring-2 focus:ring-coral/40"
            onClick={() => onOpen(item)}
          >
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span
                className="inline-flex rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white"
                style={{ backgroundColor: item.color ?? "#0f3d3e" }}
              >
                {itemTypeLabel}
              </span>
              {item.is_recurring ? <Repeat className="size-4 text-slate-400" /> : null}
              {item.sync_status ? <span className="min-w-0 break-words text-[11px] uppercase tracking-[0.16em] text-slate-400">{syncStatusLabel}</span> : null}
            </div>
            <div className="min-w-0">
              <div className="break-words text-sm font-semibold text-ink">{item.title}</div>
              <div className="text-xs text-slate-500">{timeValue ? formatTime(timeValue) : messages.common.noTime}</div>
            </div>
          </button>
          <div className="flex shrink-0 flex-col gap-2 self-start">
            <Button
              variant={syncEnabled ? "secondary" : "ghost"}
              className="h-11 w-11 rounded-full p-0"
              onClick={(event) => {
                event.stopPropagation();
                onSync(item);
              }}
              disabled={!syncEnabled}
              title={syncHint}
              aria-label={messages.weeklyPlanner.syncEvent}
            >
              <CalendarSync className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="relative hidden min-w-0 rounded-3xl border border-white/70 bg-white/90 p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-tide/20 hover:shadow-md lg:block">
        <Button
          variant={syncEnabled ? "secondary" : "ghost"}
          className="absolute right-4 top-4 h-9 w-9 rounded-full p-0"
          onClick={(event) => {
            event.stopPropagation();
            onSync(item);
          }}
          disabled={!syncEnabled}
          title={syncHint}
          aria-label={messages.weeklyPlanner.syncEvent}
        >
          <CalendarSync className="size-4" />
        </Button>

        <button
          type="button"
          className="grid min-w-0 gap-3 pr-12 text-left focus:outline-none focus:ring-2 focus:ring-coral/40"
          onClick={() => onOpen(item)}
        >
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span
              className="inline-flex rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white"
              style={{ backgroundColor: item.color ?? "#0f3d3e" }}
            >
              {itemTypeLabel}
            </span>
            {item.is_recurring ? <Repeat className="size-4 text-slate-400" /> : null}
            {item.sync_status ? <span className="min-w-0 break-words text-[11px] uppercase tracking-[0.16em] text-slate-400">{syncStatusLabel}</span> : null}
          </div>
          <div className="min-w-0">
            <div className="overflow-hidden text-sm font-semibold leading-5 text-ink [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
              {item.title}
            </div>
            <div className="mt-1 text-xs text-slate-500">{timeValue ? formatTime(timeValue) : messages.common.noTime}</div>
          </div>
        </button>
      </div>
    </>
  );
}

function TaskChip({ item, onOpen, onToggleComplete }: { item: PlannerOccurrence; onOpen: (item: PlannerOccurrence) => void; onToggleComplete: (item: PlannerOccurrence) => void }) {
  const timeValue = item.display_start_at ?? item.display_due_at;
  const isCompleted = item.completed_for_occurrence;
  const { language, messages } = useI18n();
  const itemTypeLabel = getItemTypeLabel(language, item.item_type);

  return (
    <>
      <div className="lg:hidden">
        <div
          className={clsx(
            "grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3 rounded-3xl border p-4 shadow-soft transition",
            isCompleted ? "border-emerald-200 bg-emerald-50/90" : "border-white/70 bg-white/90",
          )}
        >
          <button
            type="button"
            className="grid min-w-0 gap-2 text-left transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-coral/40"
            onClick={() => onOpen(item)}
          >
            <div className="min-w-0 space-y-2">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span
                  className="inline-flex rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white"
                  style={{ backgroundColor: item.color ?? "#0f3d3e" }}
                >
                  {itemTypeLabel}
                </span>
                {item.is_recurring ? <Repeat className="size-4 text-slate-400" /> : null}
              </div>
              <div className="min-w-0">
                <div className="break-words text-sm font-semibold text-ink">{item.title}</div>
                <div className="text-xs text-slate-500">{timeValue ? formatTime(timeValue) : messages.common.noTime}</div>
              </div>
            </div>
          </button>
          <div className="flex shrink-0 flex-col gap-2 self-start">
            <Button
              variant={isCompleted ? "secondary" : "ghost"}
              className={clsx(
                "h-12 w-12 rounded-full p-0",
                isCompleted ? "border border-emerald-200 bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : "border border-slate-200",
              )}
              onClick={(event) => {
                event.stopPropagation();
                onToggleComplete(item);
              }}
              aria-label={isCompleted ? messages.weeklyPlanner.uncomplete : messages.weeklyPlanner.complete}
              title={isCompleted ? messages.weeklyPlanner.uncomplete : messages.weeklyPlanner.complete}
            >
              <CheckCircle2 className="size-5" />
            </Button>
          </div>
        </div>
      </div>

      <div
        className={clsx(
          "relative hidden min-w-0 rounded-3xl border p-4 shadow-soft transition lg:block",
          isCompleted ? "border-emerald-200 bg-emerald-50/90" : "border-white/70 bg-white/90 hover:-translate-y-0.5 hover:border-tide/20 hover:shadow-md",
        )}
      >
        <Button
          variant={isCompleted ? "secondary" : "ghost"}
          className={clsx(
            "absolute right-4 top-4 h-9 w-9 rounded-full p-0",
            isCompleted ? "border border-emerald-200 bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : "border border-slate-200",
          )}
          onClick={(event) => {
            event.stopPropagation();
            onToggleComplete(item);
          }}
          aria-label={isCompleted ? messages.weeklyPlanner.uncomplete : messages.weeklyPlanner.complete}
          title={isCompleted ? messages.weeklyPlanner.uncomplete : messages.weeklyPlanner.complete}
        >
          <CheckCircle2 className="size-4" />
        </Button>

        <button
          type="button"
          className="grid min-w-0 gap-2 pr-12 text-left transition focus:outline-none focus:ring-2 focus:ring-coral/40"
          onClick={() => onOpen(item)}
        >
          <div className="min-w-0 space-y-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span
                className="inline-flex rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white"
                style={{ backgroundColor: item.color ?? "#0f3d3e" }}
              >
                {itemTypeLabel}
              </span>
              {item.is_recurring ? <Repeat className="size-4 text-slate-400" /> : null}
            </div>
            <div className="min-w-0">
              <div className="overflow-hidden text-sm font-semibold leading-5 text-ink [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                {item.title}
              </div>
              <div className="mt-1 text-xs text-slate-500">{timeValue ? formatTime(timeValue) : messages.common.noTime}</div>
            </div>
          </div>
        </button>
      </div>
    </>
  );
}

function PlannerCard(props: {
  item: PlannerOccurrence;
  onOpenItem: (item: PlannerOccurrence) => void;
  onToggleComplete: (item: PlannerOccurrence) => void;
  onSync: (item: PlannerOccurrence) => void;
  syncEnabled: boolean;
  syncHint: string;
}) {
  if (props.item.item_type === "event") {
    return <EventChip item={props.item} onOpen={props.onOpenItem} onSync={props.onSync} syncEnabled={props.syncEnabled} syncHint={props.syncHint} />;
  }

  return <TaskChip item={props.item} onOpen={props.onOpenItem} onToggleComplete={props.onToggleComplete} />;
}

export function WeeklyPlanner(props: {
  startOfWeek: string;
  items: PlannerOccurrence[];
  onOpenItem: (item: PlannerOccurrence) => void;
  onToggleComplete: (item: PlannerOccurrence) => void;
  onSync: (item: PlannerOccurrence) => void;
  googleSyncEnabled: boolean;
  googleSyncHint: string;
}) {
  const days = groupByDay(props.items, props.startOfWeek);
  const { dateLocale, messages } = useI18n();

  return (
    <>
      <div className="hidden gap-4 lg:grid lg:grid-cols-7">
        {days.map((day) => (
          <section key={day.day.toISOString()} className="grid gap-3 rounded-[2rem] bg-mist/70 p-4">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{format(day.day, "EEEE", { locale: dateLocale })}</div>
              <div className="text-xl font-semibold text-ink">{format(day.day, "d MMM", { locale: dateLocale })}</div>
            </div>
            <div className="grid gap-3">
              {day.items.length ? (
                day.items.map((item) => (
                  <PlannerCard
                    key={`${item.id}-${item.occurrence_date ?? "single"}`}
                    item={item}
                    onOpenItem={props.onOpenItem}
                    onToggleComplete={props.onToggleComplete}
                    onSync={props.onSync}
                    syncEnabled={props.googleSyncEnabled}
                    syncHint={props.googleSyncHint}
                  />
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-400">{messages.weeklyPlanner.nothingPlanned}</div>
              )}
            </div>
          </section>
        ))}
      </div>
      <div className="grid gap-4 lg:hidden">
        {days.map((day) => (
          <section key={day.day.toISOString()} className="grid gap-3 rounded-[2rem] bg-white/80 p-4 shadow-soft">
            <div className="flex items-center justify-between">
              <div className="text-sm uppercase tracking-[0.16em] text-slate-500">{format(day.day, "EEE d", { locale: dateLocale })}</div>
              <div className="text-sm text-slate-400">
                {day.items.length} {messages.common.records}
              </div>
            </div>
            {day.items.length ? (
              day.items.map((item) => (
                <PlannerCard
                  key={`${item.id}-${item.occurrence_date ?? "single"}`}
                  item={item}
                  onOpenItem={props.onOpenItem}
                  onToggleComplete={props.onToggleComplete}
                  onSync={props.onSync}
                  syncEnabled={props.googleSyncEnabled}
                  syncHint={props.googleSyncHint}
                />
              ))
            ) : (
              <div className="text-sm text-slate-400">{messages.weeklyPlanner.pause}</div>
            )}
          </section>
        ))}
      </div>
    </>
  );
}
