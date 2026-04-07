import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";

import { LanguageToggle } from "../components/ui/language-toggle";
import { Button, Field, Input } from "../components/ui/forms";
import { useLogin } from "../features/auth/use-auth";
import { useI18n } from "../lib/i18n";

const DEMO_EMAIL = "student@example.com";
const DEMO_PASSWORD = "password123";

export function LoginPage() {
  const navigate = useNavigate();
  const login = useLogin();
  const { messages } = useI18n();

  const loginSchema = useMemo(
    () =>
      z.object({
        email: z.string().email(messages.login.emailError),
        password: z.string().min(8, messages.login.passwordError),
      }),
    [messages.login.emailError, messages.login.passwordError],
  );

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    },
  });

  const submitLogin = async (values: z.infer<typeof loginSchema>) => {
    await login.mutateAsync(values);
    navigate("/planner");
  };

  return (
    <div className="relative grid min-h-screen bg-[linear-gradient(135deg,_#f8f3e8_0%,_#eef6ff_55%,_#dff6ea_100%)] lg:grid-cols-[1.05fr_0.95fr]">
      <div className="absolute right-6 top-6 z-10">
        <LanguageToggle />
      </div>

      <section className="hidden flex-col justify-between p-10 lg:flex">
        <div className="max-w-xl">
          <div className="text-sm uppercase tracking-[0.24em] text-tide">{messages.common.appName}</div>
          <h1 className="mt-6 text-5xl font-semibold leading-tight text-ink">{messages.login.heroTitle}</h1>
          <p className="mt-5 max-w-lg text-lg text-slate-600">{messages.login.heroSubtitle}</p>
        </div>
        <div className="max-w-md rounded-[2rem] bg-white/70 p-6 shadow-soft backdrop-blur">
          <div className="text-sm text-slate-500">{messages.login.demoLogin}</div>
          <div className="mt-2 font-medium text-ink">
            {DEMO_EMAIL} / {DEMO_PASSWORD}
          </div>
        </div>
      </section>

      <section className="grid place-items-center p-6">
        <div className="w-full max-w-md rounded-[2rem] bg-white/92 p-8 shadow-soft">
          <div className="mb-8">
            <h2 className="text-3xl font-semibold text-ink">{messages.login.signIn}</h2>
            <p className="mt-2 text-sm text-slate-500">{messages.login.signInSubtitle}</p>
          </div>

          <div className="mb-5 rounded-2xl bg-mist/70 px-4 py-3 text-sm text-slate-600">{messages.login.quickTest}</div>

          <div className="mb-5 grid gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={async () => {
                form.setValue("email", DEMO_EMAIL);
                form.setValue("password", DEMO_PASSWORD);
                await submitLogin({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
              }}
              disabled={login.isPending}
            >
              {login.isPending ? messages.login.signingIn : messages.login.signInDemo}
            </Button>
          </div>

          <form
            className="grid gap-4"
            onSubmit={form.handleSubmit(async (values) => {
              await submitLogin(values);
            })}
          >
            <Field label="Email">
              <Input placeholder={DEMO_EMAIL} {...form.register("email")} />
              {form.formState.errors.email ? <span className="text-sm text-red-500">{form.formState.errors.email.message}</span> : null}
            </Field>

            <Field label={messages.login.password}>
              <Input type="password" {...form.register("password")} />
              {form.formState.errors.password ? <span className="text-sm text-red-500">{form.formState.errors.password.message}</span> : null}
            </Field>

            {login.isError ? <p className="text-sm text-red-500">{login.error.message}</p> : null}

            <Button type="submit" disabled={login.isPending}>
              {login.isPending ? messages.login.signingIn : messages.login.openPlansync}
            </Button>
          </form>

          <p className="mt-6 text-sm text-slate-500">
            {messages.login.noAccount}{" "}
            <Link to="/register" className="font-medium text-tide">
              {messages.login.register}
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
