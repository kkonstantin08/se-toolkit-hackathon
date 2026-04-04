import { useMutation } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button, Textarea } from "../../components/ui/forms";
import { api } from "../../lib/api/client";

export function ParsePanel() {
  const [rawText, setRawText] = useState("");
  const navigate = useNavigate();
  const parseMutation = useMutation({
    mutationFn: api.parseText,
    onSuccess: (draft) => {
      setRawText("");
      navigate(`/ai/drafts/${draft.id}`);
    },
  });

  return (
    <section className="grid gap-4 rounded-[2rem] bg-tide p-5 text-white shadow-soft">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-white/10">
          <Sparkles className="size-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold">AI-ввод без автосохранения</h2>
          <p className="text-sm text-white/70">Вставьте задачу или событие свободным текстом. PlanSync создаст только черновик для проверки, а не готовую запись.</p>
        </div>
      </div>

      <Textarea
        value={rawText}
        onChange={(event) => setRawText(event.target.value)}
        className="border-white/10 bg-white/10 text-white placeholder:text-white/50"
        placeholder="Например: Встреча с куратором 2026-04-10 18:00, напомнить за 1 день и за 30 минут"
      />

      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={() =>
            parseMutation.mutate({
              raw_text: rawText,
              client_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            })
          }
          disabled={!rawText.trim() || parseMutation.isPending}
          className="w-fit bg-coral hover:bg-coral/90"
        >
          {parseMutation.isPending ? "Разбираем..." : "Создать AI-черновик"}
        </Button>
        <div className="text-xs text-white/70">После отправки откроется экран подтверждения с предзаполненными полями.</div>
      </div>

      {parseMutation.isError ? <p className="text-sm text-rose-200">{parseMutation.error.message}</p> : null}
    </section>
  );
}
