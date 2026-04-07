import { useMutation, useQuery } from "@tanstack/react-query";
import { CalendarSync, Link2, Unplug } from "lucide-react";

import { queryClient } from "../../../app/query-client";
import { Button } from "../../../components/ui/forms";
import { useI18n } from "../../../lib/i18n";
import { api } from "../../../lib/api/client";

export function GooglePanel() {
  const { messages } = useI18n();
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
          <p className="text-sm text-slate-500">{messages.google.subtitle}</p>
        </div>
      </div>

      <div className="grid gap-3 rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">
        <div className="flex items-center justify-between">
          <span>{messages.google.envSetup}</span>
          <span className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.16em] ${status?.configured ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
            {status?.configured ? messages.google.configured : messages.google.missingEnv}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>{messages.google.connectionStatus}</span>
          <span className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.16em] ${status?.connected ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
            {status?.connected ? messages.google.connected : messages.google.notConnectedStatus}
          </span>
        </div>
        <div>
          {messages.google.email}: {status?.provider_email ?? messages.google.notConnected}
        </div>
        <div>
          {messages.google.defaultCalendar}: {status?.default_calendar_id ?? messages.google.primarySelected}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {!status?.configured ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{messages.google.fillEnv}</div>
        ) : status?.connected ? (
          <Button variant="danger" className="gap-2" onClick={() => disconnectMutation.mutate()}>
            <Unplug className="size-4" />
            {messages.google.disconnect}
          </Button>
        ) : (
          <Button className="gap-2" onClick={() => connectMutation.mutate()}>
            <Link2 className="size-4" />
            {messages.google.connect}
          </Button>
        )}
      </div>
    </section>
  );
}
