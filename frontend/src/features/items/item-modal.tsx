import { X } from "lucide-react";

import { useI18n } from "../../lib/i18n";
import { Button } from "../../components/ui/forms";
import type { ItemPayload, PlannerItem } from "../../types/api";
import { ItemForm } from "./item-form";

export function ItemModal({
  open,
  title,
  initialItem,
  submitLabel,
  onSubmit,
  onClose,
}: {
  open: boolean;
  title: string;
  initialItem?: Partial<ItemPayload | PlannerItem>;
  submitLabel: string;
  onSubmit: (payload: ItemPayload) => Promise<void>;
  onClose: () => void;
}) {
  const { messages } = useI18n();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] bg-sand p-6 shadow-soft">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-ink">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{messages.itemModal.subtitle}</p>
          </div>
          <Button variant="ghost" className="size-10 rounded-full p-0" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
        <ItemForm initialItem={initialItem} submitLabel={submitLabel} onSubmit={onSubmit} onCancel={onClose} />
      </div>
    </div>
  );
}
