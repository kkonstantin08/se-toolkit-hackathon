import { GooglePanel } from "../features/integrations/google/google-panel";

export function IntegrationsPage() {
  return (
    <div className="grid gap-6">
      <GooglePanel />
      <section className="rounded-[2rem] bg-white/85 p-6 shadow-soft">
        <h2 className="text-xl font-semibold text-ink">Как это работает</h2>
        <div className="mt-4 grid gap-3 text-sm text-slate-600">
          <p>1. Вы подключаете Google Calendar только если он нужен. Без него PlanSync остаётся полноценным планером.</p>
          <p>2. Синхронизация работает только для событий и только из PlanSync в Google.</p>
          <p>3. После подключения Google новые и изменённые события синхронизируются автоматически.</p>
          <p>4. Если синк завершится ошибкой, локальная запись останется в приложении, а событие можно будет отправить повторно.</p>
        </div>
      </section>
    </div>
  );
}
