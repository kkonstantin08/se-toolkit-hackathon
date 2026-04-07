import { AlertTriangle, Trash2, X } from "lucide-react";

import { Button } from "../../components/ui/forms";
import type { PlannerOccurrence } from "../../types/api";

export type DeleteEventScope = "single_item" | "single" | "series";

export function DeleteEventModal({
  open,
  item,
  isDeleting,
  onClose,
  onConfirm,
}: {
  open: boolean;
  item: PlannerOccurrence | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: (scope: DeleteEventScope) => void;
}) {
  if (!open || !item) return null;

  const canDeleteSingleOccurrence = item.is_recurring && Boolean(item.occurrence_date);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[2rem] bg-white p-6 shadow-soft">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-red-50 text-red-500">
              <AlertTriangle className="size-5" />
            </span>
            <div>
              <h2 className="text-xl font-semibold text-ink">
                {canDeleteSingleOccurrence ? "Удалить только это событие или всю серию?" : "Удалить событие?"}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {canDeleteSingleOccurrence
                  ? "Можно скрыть только выбранный показ в PlanSync или удалить всю серию целиком."
                  : "Это действие нельзя отменить."}
              </p>
            </div>
          </div>
          <Button variant="ghost" className="size-10 rounded-full p-0" onClick={onClose} disabled={isDeleting}>
            <X className="size-4" />
          </Button>
        </div>

        {canDeleteSingleOccurrence && item.sync_status ? (
          <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Удаление одного показа влияет только на PlanSync. Серия в Google Calendar останется без изменений.
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" onClick={onClose} disabled={isDeleting}>
            Отмена
          </Button>
          {canDeleteSingleOccurrence ? (
            <Button variant="secondary" className="gap-2" onClick={() => onConfirm("single")} disabled={isDeleting}>
              <Trash2 className="size-4" />
              Удалить это событие
            </Button>
          ) : null}
          <Button variant="danger" className="gap-2" onClick={() => onConfirm(canDeleteSingleOccurrence ? "series" : "single_item")} disabled={isDeleting}>
            <Trash2 className="size-4" />
            {canDeleteSingleOccurrence ? "Удалить всю серию" : "Удалить событие"}
          </Button>
        </div>
      </div>
    </div>
  );
}
