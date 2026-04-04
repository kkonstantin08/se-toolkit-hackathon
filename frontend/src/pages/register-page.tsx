import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";

import { Button, Field, Input, Select } from "../components/ui/forms";
import { useRegister } from "../features/auth/use-auth";
import { getTimezoneOptions } from "../lib/utils/timezones";

const registerSchema = z.object({
  full_name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  timezone: z.string().min(2),
});

export function RegisterPage() {
  const navigate = useNavigate();
  const register = useRegister();
  const timezoneOptions = getTimezoneOptions();
  const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      full_name: "",
      email: "",
      password: "",
      timezone: detectedTimezone,
    },
  });

  return (
    <div className="grid min-h-screen place-items-center bg-[linear-gradient(180deg,_#eff6ff_0%,_#fefcf8_100%)] p-6">
      <div className="w-full max-w-lg rounded-[2rem] bg-white/92 p-8 shadow-soft">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-ink">Создать аккаунт</h1>
          <p className="mt-2 text-sm text-slate-500">Сразу после регистрации можно войти и начать планировать неделю.</p>
        </div>
        <div className="mb-6 rounded-2xl bg-mist/70 px-4 py-3 text-sm text-slate-600">
          Demo-аккаунт уже существует: <span className="font-medium text-ink">student@example.com / password123</span>.
          Если хотите создать нового пользователя, введите другой email.
        </div>
        <form
          className="grid gap-4"
          onSubmit={form.handleSubmit(async (values) => {
            await register.mutateAsync(values);
            navigate("/login");
          })}
        >
          <Field label="Имя">
            <Input {...form.register("full_name")} />
          </Field>
          <Field label="Email">
            <Input {...form.register("email")} />
          </Field>
          <Field label="Пароль">
            <Input type="password" {...form.register("password")} />
          </Field>
          <Field label="Часовой пояс" hint="Используется IANA-формат, например Europe/Moscow или America/New_York.">
            <Select {...form.register("timezone")}>
              {timezoneOptions.map((timezone) => (
                <option key={timezone} value={timezone}>
                  {timezone === detectedTimezone ? `${timezone} (текущий)` : timezone}
                </option>
              ))}
            </Select>
          </Field>
          {register.isError ? <p className="text-sm text-red-500">{register.error.message}</p> : null}
          <Button type="submit" disabled={register.isPending}>
            {register.isPending ? "Создаём..." : "Зарегистрироваться"}
          </Button>
        </form>
        <p className="mt-6 text-sm text-slate-500">
          Уже есть аккаунт?{" "}
          <Link to="/login" className="font-medium text-tide">
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
}
