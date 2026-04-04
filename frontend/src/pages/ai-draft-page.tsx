import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, Sparkles, Trash2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { queryClient } from "../app/query-client";
import { Button } from "../components/ui/forms";
import { formatDisplayDate } from "../lib/utils/datetime";
import { AiConfirmForm } from "../features/ai-parser/confirm-form";
import { api } from "../lib/api/client";

function SourceBadge({ source, modelName }: { source: string; modelName: string }) {
  const isMistral = source === "mistral";
  return (
    <div className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${isMistral ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
      {isMistral ? `Mistral active: ${modelName}` : "Fallback mode"}
    </div>
  );
}

function ExtractedSummary({
  itemType,
  title,
  startAt,
  dueAt,
  remindersCount,
}: {
  itemType?: string;
  title?: string | null;
  startAt?: string | null;
  dueAt?: string | null;
  remindersCount: number;
}) {
  return (
    <div className="grid gap-3 rounded-[1.75rem] bg-mist/70 p-4 text-sm text-slate-700 md:grid-cols-4">
      <div>
        <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Тип</div>
        <div className="mt-1 font-medium">{itemType ?? "не определён"}</div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Заголовок</div>
        <div className="mt-1 font-medium">{title ?? "пусто"}</div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Дата/время</div>
        <div className="mt-1 font-medium">{startAt ? formatDisplayDate(startAt) : dueAt ? formatDisplayDate(dueAt) : "не извлечено"}</div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Напоминания</div>
        <div className="mt-1 font-medium">{remindersCount}</div>
      </div>
    </div>
  );
}

export function AiDraftPage() {
  const { draftId = "" } = useParams();
  const navigate = useNavigate();

  const draftQuery = useQuery({
    queryKey: ["draft", draftId],
    queryFn: () => api.getDraft(draftId),
    enabled: Boolean(draftId),
  });

  const confirmMutation = useMutation({
    mutationFn: (item: Parameters<typeof api.confirmDraft>[1]) => api.confirmDraft(draftId, item),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["week"] });
      navigate("/planner");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteDraft(draftId),
    onSuccess: () => navigate("/planner"),
  });

  if (draftQuery.isLoading) {
    return <div className="rounded-[2rem] bg-white/80 p-10 text-center text-slate-500 shadow-soft">Загружаем AI-черновик...</div>;
  }

  if (draftQuery.isError || !draftQuery.data) {
    return <div className="rounded-[2rem] bg-white/80 p-10 text-center text-red-500 shadow-soft">Не удалось загрузить черновик.</div>;
  }

  const draft = draftQuery.data;
  const extractedItem = draft.parsed_payload_json.item;

  return (
    <div className="grid gap-6">
      <section className="rounded-[2rem] bg-white/85 p-6 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span className="grid size-12 place-items-center rounded-2xl bg-coral/15 text-coral">
              <Sparkles className="size-5" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold text-ink">Проверьте AI-разбор перед сохранением</h1>
              <p className="mt-2 text-sm text-slate-500">Черновик ещё ничего не сохранил. Если AI ошибся, просто исправьте поля ниже и подтвердите только корректную версию.</p>
            </div>
          </div>
          <Button variant="ghost" className="gap-2 text-red-500" onClick={() => deleteMutation.mutate()}>
            <Trash2 className="size-4" />
            Отклонить
          </Button>
        </div>

        <div className="mt-5 grid gap-4 rounded-[1.75rem] bg-slate-50 p-4 text-sm text-slate-600">
          <div className="flex flex-wrap items-center gap-3">
            <SourceBadge source={draft.parse_source} modelName={draft.model_name} />
            {draft.parse_source !== "mistral" ? (
              <div className="inline-flex items-center gap-2 text-amber-700">
                <AlertTriangle className="size-4" />
                Использован fallback-разбор, проверьте поля особенно внимательно.
              </div>
            ) : null}
          </div>

          <div>
            <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Исходный текст</div>
            <p className="mt-2">{draft.raw_text}</p>
          </div>

          <ExtractedSummary
            itemType={extractedItem.item_type}
            title={extractedItem.title}
            startAt={extractedItem.start_at}
            dueAt={extractedItem.due_at}
            remindersCount={extractedItem.reminders?.length ?? 0}
          />

          {draft.warnings_json.length ? (
            <div>
              <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Warnings</div>
              <ul className="mt-2 grid gap-1">
                {draft.warnings_json.map((warning) => (
                  <li key={warning}>• {warning}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-[2rem] bg-white/85 p-6 shadow-soft">
        <AiConfirmForm
          key={`${draft.id}:${extractedItem.item_type}:${extractedItem.title ?? ""}:${extractedItem.start_at ?? extractedItem.due_at ?? ""}`}
          initialItem={structuredClone(draft.parsed_payload_json.item)}
          onSubmit={async (payload) => {
            await confirmMutation.mutateAsync(payload);
          }}
          onCancel={() => navigate("/planner")}
        />
        {confirmMutation.isError ? <p className="mt-4 text-sm text-red-500">{confirmMutation.error.message}</p> : null}
      </section>
    </div>
  );
}
