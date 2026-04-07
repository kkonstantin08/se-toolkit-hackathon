import { Languages } from "lucide-react";

import { useI18n } from "../../lib/i18n";
import { Button } from "./forms";

export function LanguageToggle() {
  const { language, toggleLanguage, messages } = useI18n();

  return (
    <Button variant="ghost" className="gap-2 px-3" onClick={toggleLanguage} title={messages.languageToggle.label}>
      <Languages className="size-4" />
      <span className={language === "ru" ? "font-semibold text-ink" : "text-slate-500"}>{messages.languageToggle.russian}</span>
      <span className="text-slate-300">/</span>
      <span className={language === "en" ? "font-semibold text-ink" : "text-slate-500"}>{messages.languageToggle.english}</span>
    </Button>
  );
}
