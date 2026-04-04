import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";

import { Button, Field, Input } from "../components/ui/forms";
import { useLogin } from "../features/auth/use-auth";

const DEMO_EMAIL = "student@example.com";
const DEMO_PASSWORD = "password123";

const loginSchema = z.object({
  email: z.string().email("Введите корректный email"),
  password: z.string().min(8, "Минимум 8 символов"),
});

export function LoginPage() {
  const navigate = useNavigate();
  const login = useLogin();
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
    <div className="grid min-h-screen bg-[linear-gradient(135deg,_#f8f3e8_0%,_#eef6ff_55%,_#dff6ea_100%)] lg:grid-cols-[1.05fr_0.95fr]">
      <section className="hidden flex-col justify-between p-10 lg:flex">
        <div className="max-w-xl">
          <div className="text-sm uppercase tracking-[0.24em] text-tide">PlanSync</div>
          <h1 className="mt-6 text-5xl font-semibold leading-tight text-ink">Недельный планер, который не ломает учебный ритм.</h1>
          <p className="mt-5 max-w-lg text-lg text-slate-600">Одна поверхность для задач, событий, повторений, напоминаний и AI-черновиков с обязательным подтверждением перед сохранением.</p>
        </div>
        <div className="max-w-md rounded-[2rem] bg-white/70 p-6 shadow-soft backdrop-blur">
          <div className="text-sm text-slate-500">Demo login</div>
          <div className="mt-2 font-medium text-ink">
            {DEMO_EMAIL} / {DEMO_PASSWORD}
          </div>
        </div>
      </section>

      <section className="grid place-items-center p-6">
        <div className="w-full max-w-md rounded-[2rem] bg-white/92 p-8 shadow-soft">
          <div className="mb-8">
            <h2 className="text-3xl font-semibold text-ink">Вход</h2>
            <p className="mt-2 text-sm text-slate-500">Войдите, чтобы открыть свою недельную доску.</p>
          </div>

          <div className="mb-5 rounded-2xl bg-mist/70 px-4 py-3 text-sm text-slate-600">
            Для быстрого теста можно сразу войти demo-аккаунтом.
          </div>

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
              {login.isPending ? "Входим..." : "Войти в demo-аккаунт"}
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

            <Field label="Пароль">
              <Input type="password" {...form.register("password")} />
              {form.formState.errors.password ? <span className="text-sm text-red-500">{form.formState.errors.password.message}</span> : null}
            </Field>

            {login.isError ? <p className="text-sm text-red-500">{login.error.message}</p> : null}

            <Button type="submit" disabled={login.isPending}>
              {login.isPending ? "Входим..." : "Открыть PlanSync"}
            </Button>
          </form>

          <p className="mt-6 text-sm text-slate-500">
            Нет аккаунта?{" "}
            <Link to="/register" className="font-medium text-tide">
              Зарегистрироваться
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
