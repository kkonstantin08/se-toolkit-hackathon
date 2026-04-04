import { useMutation, useQuery } from "@tanstack/react-query";
import { CalendarSync, Link2, Unplug } from "lucide-react";

import { queryClient } from "../../../app/query-client";
import { Button } from "../../../components/ui/forms";
import { api } from "../../../lib/api/client";

export function GooglePanel() {
  const statusQuery = useQuery({
    queryKey: ["google-status"],
    queryFn: api.googleStatus,
  });

  const connectMutation = useMutation({
    mutationFn: api.googleConnectUrl,
    onSuccess: ({ url }) => {
      window.location.assign(url);
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: api.googleDisconnect,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["google-status"] }),
  });

  const status = statusQuery.data;

  return (
    <section className="grid gap-5 rounded-[2rem] bg-white/85 p-6 shadow-soft">
      <div className="flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-2xl bg-mist text-tide">
          <CalendarSync className="size-5" />
        </span>
        <div>
          <h2 className="text-xl font-semibold text-ink">Google Calendar</h2>
          <p className="text-sm text-slate-500">Автоматическая синхронизация событий из PlanSync в Google без двустороннего merge.</p>
        </div>
      </div>

      <div className="grid gap-3 rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">
        <div className="flex items-center justify-between">
          <span>Настройка в `.env`</span>
          <span className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.16em] ${status?.configured ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
            {status?.configured ? "configured" : "missing env"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Статус подключения</span>
          <span className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.16em] ${status?.connected ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
            {status?.connected ? "connected" : "not connected"}
          </span>
        </div>
        <div>Email: {status?.provider_email ?? "не подключен"}</div>
        <div>Календарь по умолчанию: {status?.default_calendar_id ?? "primary будет выбран после подключения"}</div>
      </div>

      <div className="flex flex-wrap gap-3">
        {!status?.configured ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Заполните `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` и `GOOGLE_REDIRECT_URI` в `.env`, затем пересоберите backend.
          </div>
        ) : status?.connected ? (
          <Button variant="danger" className="gap-2" onClick={() => disconnectMutation.mutate()}>
            <Unplug className="size-4" />
            Отключить Google
          </Button>
        ) : (
          <Button className="gap-2" onClick={() => connectMutation.mutate()}>
            <Link2 className="size-4" />
            Подключить Google Calendar
          </Button>
        )}
      </div>
    </section>
  );
}
