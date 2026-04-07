import { useMutation, useQuery } from "@tanstack/react-query";
import { addDays, subDays } from "date-fns";
import { Plus, Wand2 } from "lucide-react";
import { startTransition, useMemo, useState } from "react";

import { queryClient } from "../app/query-client";
import { Button } from "../components/ui/forms";
import { ParsePanel } from "../features/ai-parser/parse-panel";
import { ItemModal } from "../features/items/item-modal";
import { DeleteEventModal, type DeleteEventScope } from "../features/planner/delete-event-modal";
import { EventDetailsModal } from "../features/planner/event-details-modal";
import { WeeklyPlanner } from "../features/planner/weekly-planner";
import { ReminderCenter } from "../features/reminders/reminder-center";
import { api } from "../lib/api/client";
import { formatWeekRange, getWeekStart, toApiDate } from "../lib/utils/datetime";
import type { ItemPayload, PlannerOccurrence } from "../types/api";

type ItemModalState = { mode: "create" | "edit"; item?: PlannerOccurrence } | null;

export function PlannerPage() {
  const [weekDate, setWeekDate] = useState(() => getWeekStart(new Date()));
  const [itemModalState, setItemModalState] = useState<ItemModalState>(null);
  const [selectedItem, setSelectedItem] = useState<PlannerOccurrence | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PlannerOccurrence | null>(null);
  const weekKey = toApiDate(weekDate);

  const googleStatusQuery = useQuery({
    queryKey: ["google-status"],
    queryFn: api.googleStatus,
  });

  const weekQuery = useQuery({
    queryKey: ["week", weekKey],
    queryFn: () => api.week(weekKey),
  });

  const invalidatePlanner = async () => {
    await queryClient.invalidateQueries({ queryKey: ["week"] });
    await queryClient.invalidateQueries({ queryKey: ["due-reminders"] });
  };

  const createMutation = useMutation({
    mutationFn: api.createItem,
    onSuccess: async () => {
      setItemModalState(null);
      await invalidatePlanner();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ itemId, payload }: { itemId: string; payload: Partial<ItemPayload> }) => api.updateItem(itemId, payload),
    onSuccess: async () => {
      setItemModalState(null);
      await invalidatePlanner();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteItem,
    onSuccess: async () => {
      setDeleteTarget(null);
      setSelectedItem(null);
      await invalidatePlanner();
    },
  });

  const deleteOccurrenceMutation = useMutation({
    mutationFn: ({ itemId, occurrenceDate }: { itemId: string; occurrenceDate: string }) => api.deleteItemOccurrence(itemId, occurrenceDate),
    onSuccess: async () => {
      setDeleteTarget(null);
      setSelectedItem(null);
      await invalidatePlanner();
    },
  });

  const syncMutation = useMutation({
    mutationFn: api.googleSyncItem,
    onSuccess: async () => {
      setSelectedItem(null);
      await invalidatePlanner();
    },
  });

  const googleSyncEnabled = Boolean(googleStatusQuery.data?.configured && googleStatusQuery.data?.connected);
  const googleSyncHint = !googleStatusQuery.data?.configured
    ? "Google Calendar не настроен в .env"
    : !googleStatusQuery.data?.connected
      ? "Сначала подключите Google Calendar на странице интеграций"
      : "Синхронизировать событие с Google Calendar";

  const toggleCompleteMutation = useMutation({
    mutationFn: (item: PlannerOccurrence) =>
      item.completed_for_occurrence ? api.uncompleteItem(item.id, item.occurrence_date) : api.completeItem(item.id, item.occurrence_date),
    onSuccess: invalidatePlanner,
  });

  const stats = useMemo(() => {
    const items = weekQuery.data?.items ?? [];
    return {
      total: items.length,
      tasks: items.filter((item) => item.item_type === "task").length,
      events: items.filter((item) => item.item_type === "event").length,
      completed: items.filter((item) => item.completed_for_occurrence).length,
    };
  }, [weekQuery.data]);

  const weekData = weekQuery.data;
  const isDeletingEvent = deleteMutation.isPending || deleteOccurrenceMutation.isPending;

  const handleDeleteEvent = (scope: DeleteEventScope) => {
    if (!deleteTarget) return;

    if (scope === "single" && deleteTarget.occurrence_date) {
      deleteOccurrenceMutation.mutate({ itemId: deleteTarget.id, occurrenceDate: deleteTarget.occurrence_date });
      return;
    }

    deleteMutation.mutate(deleteTarget.id);
  };

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 rounded-[2rem] bg-white/80 p-5 shadow-soft lg:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-sm uppercase tracking-[0.2em] text-slate-500">Weekly planner</div>
              <h2 className="text-3xl font-semibold text-ink">{formatWeekRange(weekDate)}</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={() => startTransition(() => setWeekDate((current) => subDays(current, 7)))}>
                Предыдущая неделя
              </Button>
              <Button variant="secondary" onClick={() => startTransition(() => setWeekDate((current) => addDays(current, 7)))}>
                Следующая неделя
              </Button>
              <Button className="gap-2" onClick={() => setItemModalState({ mode: "create" })}>
                <Plus className="size-4" />
                Создать
              </Button>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-3xl bg-sand px-4 py-3">
              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Всего</div>
              <div className="mt-2 text-2xl font-semibold text-ink">{stats.total}</div>
            </div>
            <div className="rounded-3xl bg-sand px-4 py-3">
              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Задачи</div>
              <div className="mt-2 text-2xl font-semibold text-ink">{stats.tasks}</div>
            </div>
            <div className="rounded-3xl bg-sand px-4 py-3">
              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">События</div>
              <div className="mt-2 text-2xl font-semibold text-ink">{stats.events}</div>
            </div>
            <div className="rounded-3xl bg-sand px-4 py-3">
              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Выполнено</div>
              <div className="mt-2 text-2xl font-semibold text-ink">{stats.completed}</div>
            </div>
          </div>
        </div>
        <div className="grid gap-4">
          <ParsePanel />
          <div className="rounded-[2rem] bg-mist/80 p-5">
            <div className="flex items-center gap-3 text-ink">
              <Wand2 className="size-5 text-coral" />
              <div className="font-semibold">Manual-first режим</div>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              Даже если Mistral или Google Calendar не настроены, весь основной flow остаётся доступным: ручное создание, повторения,
              напоминания и недельный обзор.
            </p>
          </div>
        </div>
      </section>

      {weekQuery.isLoading ? (
        <div className="rounded-[2rem] bg-white/80 p-10 text-center text-slate-500 shadow-soft">Собираем неделю...</div>
      ) : weekQuery.isError ? (
        <div className="rounded-[2rem] bg-white/80 p-10 text-center text-red-500 shadow-soft">{weekQuery.error.message}</div>
      ) : weekData ? (
        <div className="grid gap-4">
          {!googleStatusQuery.data?.configured ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Google Calendar пока не настроен в `.env`, поэтому автоматическая синхронизация событий отключена.
            </div>
          ) : !googleStatusQuery.data?.connected ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              Google Calendar ещё не подключён для этого аккаунта. После подключения события будут синхронизироваться автоматически.
            </div>
          ) : null}

          {syncMutation.isError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {syncMutation.error.message}. Синхронизацию можно повторить прямо на карточке события или в окне деталей.
            </div>
          ) : null}

          <WeeklyPlanner
            startOfWeek={weekData.start_of_week}
            items={weekData.items}
            onOpenItem={setSelectedItem}
            onToggleComplete={(item) => toggleCompleteMutation.mutate(item)}
            onSync={(item) => syncMutation.mutate(item.id)}
            googleSyncEnabled={googleSyncEnabled}
            googleSyncHint={googleSyncHint}
          />
        </div>
      ) : null}

      <EventDetailsModal
        open={Boolean(selectedItem)}
        item={selectedItem}
        syncEnabled={googleSyncEnabled}
        syncHint={googleSyncHint}
        onClose={() => setSelectedItem(null)}
        onEdit={(item) => {
          setSelectedItem(null);
          setItemModalState({ mode: "edit", item });
        }}
        onDelete={(item) => {
          setSelectedItem(null);
          setDeleteTarget(item);
        }}
        onRetrySync={(item) => {
          if (item.item_type === "event") {
            syncMutation.mutate(item.id);
          }
        }}
      />

      <DeleteEventModal
        open={Boolean(deleteTarget)}
        item={deleteTarget}
        isDeleting={isDeletingEvent}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteEvent}
      />

      <ItemModal
        open={Boolean(itemModalState)}
        title={itemModalState?.mode === "edit" ? "Редактировать запись" : "Создать запись"}
        initialItem={itemModalState?.item}
        submitLabel={itemModalState?.mode === "edit" ? "Сохранить изменения" : "Создать"}
        onClose={() => setItemModalState(null)}
        onSubmit={async (payload) => {
          if (itemModalState?.mode === "edit" && itemModalState.item) {
            await updateMutation.mutateAsync({ itemId: itemModalState.item.id, payload });
            return;
          }
          await createMutation.mutateAsync(payload);
        }}
      />

      <ReminderCenter />
    </div>
  );
}
