import { addDays, format, parseISO } from "date-fns";
import { CheckCircle2, Pencil, Repeat, Trash2 } from "lucide-react";

import { Button } from "../../components/ui/forms";
import { formatTime } from "../../lib/utils/datetime";
import type { PlannerOccurrence } from "../../types/api";

function groupByDay(items: PlannerOccurrence[], startOfWeek: string) {
  const start = parseISO(startOfWeek);
  return Array.from({ length: 7 }).map((_, index) => {
    const day = addDays(start, index);
    const dayLabel = format(day, "EEE d");
    const dayKey = format(day, "yyyy-MM-dd");
    return {
      day,
      dayLabel,
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

function EventChip({ item, onOpen }: { item: PlannerOccurrence; onOpen: (item: PlannerOccurrence) => void }) {
  const timeValue = item.display_start_at ?? item.display_due_at;

  return (
    <button
      type="button"
      className="grid min-w-0 gap-3 rounded-3xl border border-white/70 bg-white/90 p-4 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-tide/20 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-coral/40"
      onClick={() => onOpen(item)}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span
          className="inline-flex rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white"
          style={{ backgroundColor: item.color ?? "#0f3d3e" }}
        >
          {item.item_type}
        </span>
        {item.is_recurring ? <Repeat className="size-4 text-slate-400" /> : null}
        {item.sync_status ? <span className="min-w-0 break-words text-[11px] uppercase tracking-[0.16em] text-slate-400">{item.sync_status}</span> : null}
      </div>
      <div className="min-w-0">
        <div className="break-words text-sm font-semibold text-ink">{item.title}</div>
        <div className="text-xs text-slate-500">{timeValue ? formatTime(timeValue) : "Без времени"}</div>
      </div>
    </button>
  );
}

function TaskChip({
  item,
  onEdit,
  onDelete,
  onToggleComplete,
}: {
  item: PlannerOccurrence;
  onEdit: (item: PlannerOccurrence) => void;
  onDelete: (item: PlannerOccurrence) => void;
  onToggleComplete: (item: PlannerOccurrence) => void;
}) {
  const timeValue = item.display_start_at ?? item.display_due_at;

  return (
    <div className="min-w-0 overflow-hidden rounded-3xl border border-white/70 bg-white/90 p-4 shadow-soft">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0 space-y-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span
              className="inline-flex rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white"
              style={{ backgroundColor: item.color ?? "#0f3d3e" }}
            >
              {item.item_type}
            </span>
            {item.is_recurring ? <Repeat className="size-4 text-slate-400" /> : null}
          </div>
          <div className="min-w-0">
            <div className="break-words text-sm font-semibold text-ink">{item.title}</div>
            <div className="text-xs text-slate-500">{timeValue ? formatTime(timeValue) : "Без времени"}</div>
          </div>
          {item.description ? <p className="break-words text-sm text-slate-500">{item.description}</p> : null}
        </div>
        <div className="flex shrink-0 flex-col gap-2 self-start">
          <Button variant={item.completed_for_occurrence ? "secondary" : "ghost"} className="h-9 w-9 p-0" onClick={() => onToggleComplete(item)}>
            <CheckCircle2 className="size-4" />
          </Button>
          <Button variant="ghost" className="h-9 w-9 p-0" onClick={() => onEdit(item)}>
            <Pencil className="size-4" />
          </Button>
          <Button variant="ghost" className="h-9 w-9 p-0 text-red-500" onClick={() => onDelete(item)}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function PlannerCard(props: {
  item: PlannerOccurrence;
  onOpenEvent: (item: PlannerOccurrence) => void;
  onEdit: (item: PlannerOccurrence) => void;
  onDelete: (item: PlannerOccurrence) => void;
  onToggleComplete: (item: PlannerOccurrence) => void;
}) {
  if (props.item.item_type === "event") {
    return <EventChip item={props.item} onOpen={props.onOpenEvent} />;
  }

  return <TaskChip item={props.item} onEdit={props.onEdit} onDelete={props.onDelete} onToggleComplete={props.onToggleComplete} />;
}

export function WeeklyPlanner(props: {
  startOfWeek: string;
  items: PlannerOccurrence[];
  onOpenEvent: (item: PlannerOccurrence) => void;
  onEdit: (item: PlannerOccurrence) => void;
  onDelete: (item: PlannerOccurrence) => void;
  onToggleComplete: (item: PlannerOccurrence) => void;
}) {
  const days = groupByDay(props.items, props.startOfWeek);

  return (
    <>
      <div className="hidden gap-4 lg:grid lg:grid-cols-7">
        {days.map((day) => (
          <section key={day.dayLabel} className="grid gap-3 rounded-[2rem] bg-mist/70 p-4">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{format(day.day, "EEEE")}</div>
              <div className="text-xl font-semibold text-ink">{format(day.day, "d MMM")}</div>
            </div>
            <div className="grid gap-3">
              {day.items.length ? (
                day.items.map((item) => (
                  <PlannerCard
                    key={`${item.id}-${item.occurrence_date ?? "single"}`}
                    item={item}
                    onOpenEvent={props.onOpenEvent}
                    onEdit={props.onEdit}
                    onDelete={props.onDelete}
                    onToggleComplete={props.onToggleComplete}
                  />
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-400">Ничего не запланировано.</div>
              )}
            </div>
          </section>
        ))}
      </div>
      <div className="grid gap-4 lg:hidden">
        {days.map((day) => (
          <section key={day.dayLabel} className="grid gap-3 rounded-[2rem] bg-white/80 p-4 shadow-soft">
            <div className="flex items-center justify-between">
              <div className="text-sm uppercase tracking-[0.16em] text-slate-500">{day.dayLabel}</div>
              <div className="text-sm text-slate-400">{day.items.length} записей</div>
            </div>
            {day.items.length ? (
              day.items.map((item) => (
                <PlannerCard
                  key={`${item.id}-${item.occurrence_date ?? "single"}`}
                  item={item}
                  onOpenEvent={props.onOpenEvent}
                  onEdit={props.onEdit}
                  onDelete={props.onDelete}
                  onToggleComplete={props.onToggleComplete}
                />
              ))
            ) : (
              <div className="text-sm text-slate-400">Пауза без задач и событий.</div>
            )}
          </section>
        ))}
      </div>
    </>
  );
}
