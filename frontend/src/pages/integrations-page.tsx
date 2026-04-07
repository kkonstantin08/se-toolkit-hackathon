import { GooglePanel } from "../features/integrations/google/google-panel";
import { useI18n } from "../lib/i18n";

export function IntegrationsPage() {
  const { messages } = useI18n();

  return (
    <div className="grid gap-6">
      <GooglePanel />
      <section className="rounded-[2rem] bg-white/85 p-6 shadow-soft">
        <h2 className="text-xl font-semibold text-ink">{messages.integrations.howItWorks}</h2>
        <div className="mt-4 grid gap-3 text-sm text-slate-600">
          {messages.integrations.steps.map((step) => (
            <p key={step}>{step}</p>
          ))}
        </div>
      </section>
    </div>
  );
}
