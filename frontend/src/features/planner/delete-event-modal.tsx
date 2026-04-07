import { AlertTriangle, Trash2, X } from "lucide-react";

import { Button } from "../../components/ui/forms";
import { useI18n } from "../../lib/i18n";
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
  const { messages } = useI18n();

  if (!open || !item) return null;

  const canDeleteSingleOccurrence = item.is_recurring && Boolean(item.occurrence_date);
  const isEvent = item.item_type === "event";
  const entityLabel = isEvent ? messages.deleteModal.eventEntity : messages.deleteModal.taskEntity;
  const seriesLabel = messages.deleteModal.wholeSeries;

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
                {canDeleteSingleOccurrence ? messages.deleteModal.deleteEventOrSeries(isEvent) : messages.deleteModal.deleteItem(entityLabel)}
              </h2>
              <p className="mt-2 text-sm text-slate-500">{canDeleteSingleOccurrence ? messages.deleteModal.recurringDescription : messages.deleteModal.irreversible}</p>
            </div>
          </div>
          <Button variant="ghost" className="size-10 rounded-full p-0" onClick={onClose} disabled={isDeleting}>
            <X className="size-4" />
          </Button>
        </div>

        {canDeleteSingleOccurrence && isEvent && item.sync_status ? (
          <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">{messages.deleteModal.googleNote}</div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" onClick={onClose} disabled={isDeleting}>
            {messages.common.cancel}
          </Button>
          {canDeleteSingleOccurrence ? (
            <Button variant="secondary" className="gap-2" onClick={() => onConfirm("single")} disabled={isDeleting}>
              <Trash2 className="size-4" />
              {isEvent ? messages.deleteModal.deleteThisEvent : messages.deleteModal.deleteThisOccurrence}
            </Button>
          ) : null}
          <Button variant="danger" className="gap-2" onClick={() => onConfirm(canDeleteSingleOccurrence ? "series" : "single_item")} disabled={isDeleting}>
            <Trash2 className="size-4" />
            {canDeleteSingleOccurrence ? messages.deleteModal.deleteSeries(seriesLabel) : messages.deleteModal.deleteItem(entityLabel)}
          </Button>
        </div>
      </div>
    </div>
  );
}
