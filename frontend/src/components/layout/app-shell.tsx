import type { ReactNode } from "react";
import { CalendarDays, LogOut, Sparkles } from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";

import { useCurrentUser, useLogout } from "../../features/auth/use-auth";
import { useI18n } from "../../lib/i18n";
import { LanguageToggle } from "../ui/language-toggle";
import { Button } from "../ui/forms";

export function AppShell({ children }: { children: ReactNode }) {
  const { data: user } = useCurrentUser();
  const logout = useLogout();
  const navigate = useNavigate();
  const { messages } = useI18n();

  const navItems = [
    { to: "/planner", label: messages.appShell.navPlanner },
    { to: "/settings/integrations", label: messages.appShell.navIntegrations },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(15,61,62,0.12),_transparent_36%),linear-gradient(180deg,_#f8f3e8_0%,_#fefcf8_52%,_#eef6ff_100%)]">
      <header className="sticky top-0 z-30 border-b border-white/60 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-6">
          <Link to="/planner" className="flex items-center gap-3 text-ink">
            <span className="grid size-10 place-items-center rounded-2xl bg-tide text-white shadow-soft">
              <CalendarDays className="size-5" />
            </span>
            <div>
              <div className="text-lg font-semibold">{messages.common.appName}</div>
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{messages.common.studentPlanner}</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-full px-4 py-2 text-sm transition ${isActive ? "bg-tide text-white" : "text-slate-600 hover:bg-white"}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <LanguageToggle />
            <div className="hidden text-right md:block">
              <div className="text-sm font-medium text-ink">{user?.full_name}</div>
              <div className="text-xs text-slate-500">{user?.email}</div>
            </div>
            <Button
              variant="ghost"
              className="gap-2"
              onClick={async () => {
                await logout.mutateAsync();
                navigate("/login");
              }}
            >
              <LogOut className="size-4" />
              {messages.appShell.logout}
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <div className="mb-6 flex items-center gap-3 rounded-[2rem] bg-white/70 px-4 py-4 shadow-soft backdrop-blur">
          <span className="grid size-11 place-items-center rounded-2xl bg-coral/15 text-coral">
            <Sparkles className="size-5" />
          </span>
          <div>
            <h1 className="text-lg font-semibold text-ink">{messages.appShell.heroTitle}</h1>
            <p className="text-sm text-slate-500">{messages.appShell.heroSubtitle}</p>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
