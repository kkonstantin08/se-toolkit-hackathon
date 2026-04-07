import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, Sparkles, Trash2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { queryClient } from "../app/query-client";
import { Button } from "../components/ui/forms";
import { AiConfirmForm } from "../features/ai-parser/confirm-form";
import { useI18n } from "../lib/i18n";
import { api } from "../lib/api/client";
import { formatDisplayDate } from "../lib/utils/datetime";

function SourceBadge({ source, modelName }: { source: string; modelName: string }) {
  const { messages } = useI18n();
  const isMistral = source === "mistral";
  return (
    <div className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${isMistral ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
      {isMistral ? messages.aiDraft.mistralActive(modelName) : messages.aiDraft.fallbackMode}
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
  const { language, messages } = useI18n();

  return (
    <div className="grid gap-3 rounded-[1.75rem] bg-mist/70 p-4 text-sm text-slate-700 md:grid-cols-4">
      <div>
        <div className="text-xs uppercase tracking-[0.16em] text-slate-400">{messages.aiDraft.type}</div>
        <div className="mt-1 font-medium">{itemType === "event" ? messages.common.event : itemType === "task" ? messages.common.task : messages.aiDraft.undefined}</div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-[0.16em] text-slate-400">{messages.aiDraft.title}</div>
        <div className="mt-1 font-medium">{title ?? messages.aiDraft.empty}</div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-[0.16em] text-slate-400">{messages.aiDraft.dateTime}</div>
        <div className="mt-1 font-medium">
          {startAt ? formatDisplayDate(startAt, language) : dueAt ? formatDisplayDate(dueAt, language) : messages.aiDraft.notExtracted}
        </div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-[0.16em] text-slate-400">{messages.aiDraft.reminders}</div>
        <div className="mt-1 font-medium">{remindersCount}</div>
      </div>
    </div>
  );
}

export function AiDraftPage() {
  const { draftId = "" } = useParams();
  const navigate = useNavigate();
  const { messages } = useI18n();

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
    return <div className="rounded-[2rem] bg-white/80 p-10 text-center text-slate-500 shadow-soft">{messages.aiDraft.loading}</div>;
  }

  if (draftQuery.isError || !draftQuery.data) {
    return <div className="rounded-[2rem] bg-white/80 p-10 text-center text-red-500 shadow-soft">{messages.aiDraft.loadFailed}</div>;
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
              <h1 className="text-2xl font-semibold text-ink">{messages.aiDraft.heading}</h1>
              <p className="mt-2 text-sm text-slate-500">{messages.aiDraft.subtitle}</p>
            </div>
          </div>
          <Button variant="ghost" className="gap-2 text-red-500" onClick={() => deleteMutation.mutate()}>
            <Trash2 className="size-4" />
            {messages.aiDraft.reject}
          </Button>
        </div>

        <div className="mt-5 grid gap-4 rounded-[1.75rem] bg-slate-50 p-4 text-sm text-slate-600">
          <div className="flex flex-wrap items-center gap-3">
            <SourceBadge source={draft.parse_source} modelName={draft.model_name} />
            {draft.parse_source !== "mistral" ? (
              <div className="inline-flex items-center gap-2 text-amber-700">
                <AlertTriangle className="size-4" />
                {messages.aiDraft.fallbackWarning}
              </div>
            ) : null}
          </div>

          <div>
            <div className="text-xs uppercase tracking-[0.16em] text-slate-400">{messages.aiDraft.sourceText}</div>
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
              <div className="text-xs uppercase tracking-[0.16em] text-slate-400">{messages.aiDraft.warnings}</div>
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
