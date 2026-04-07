import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";

import { LanguageToggle } from "../components/ui/language-toggle";
import { Button, Field, Input, Select } from "../components/ui/forms";
import { useRegister } from "../features/auth/use-auth";
import { useI18n } from "../lib/i18n";
import { getTimezoneOptions } from "../lib/utils/timezones";

export function RegisterPage() {
  const navigate = useNavigate();
  const register = useRegister();
  const timezoneOptions = getTimezoneOptions();
  const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const { messages } = useI18n();

  const registerSchema = useMemo(
    () =>
      z.object({
        full_name: z.string().min(2, messages.register.nameError),
        email: z.string().email(messages.register.emailError),
        password: z.string().min(8, messages.register.passwordError),
        timezone: z.string().min(2, messages.register.timezoneError),
      }),
    [messages.register],
  );

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
    <div className="relative grid min-h-screen place-items-center bg-[linear-gradient(180deg,_#eff6ff_0%,_#fefcf8_100%)] p-6">
      <div className="absolute right-6 top-6">
        <LanguageToggle />
      </div>

      <div className="w-full max-w-lg rounded-[2rem] bg-white/92 p-8 shadow-soft">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-ink">{messages.register.title}</h1>
          <p className="mt-2 text-sm text-slate-500">{messages.register.subtitle}</p>
        </div>
        <div className="mb-6 rounded-2xl bg-mist/70 px-4 py-3 text-sm text-slate-600">{messages.register.demoHint}</div>
        <form
          className="grid gap-4"
          onSubmit={form.handleSubmit(async (values) => {
            await register.mutateAsync(values);
            navigate("/login");
          })}
        >
          <Field label={messages.register.name}>
            <Input {...form.register("full_name")} />
          </Field>
          <Field label="Email">
            <Input {...form.register("email")} />
          </Field>
          <Field label={messages.register.password}>
            <Input type="password" {...form.register("password")} />
          </Field>
          <Field label={messages.register.timezone} hint={messages.register.timezoneHint}>
            <Select {...form.register("timezone")}>
              {timezoneOptions.map((timezone) => (
                <option key={timezone} value={timezone}>
                  {timezone === detectedTimezone ? `${timezone} (${messages.common.current})` : timezone}
                </option>
              ))}
            </Select>
          </Field>
          {register.isError ? <p className="text-sm text-red-500">{register.error.message}</p> : null}
          <Button type="submit" disabled={register.isPending}>
            {register.isPending ? messages.register.creating : messages.register.create}
          </Button>
        </form>
        <p className="mt-6 text-sm text-slate-500">
          {messages.register.alreadyHaveAccount}{" "}
          <Link to="/login" className="font-medium text-tide">
            {messages.register.signIn}
          </Link>
        </p>
      </div>
    </div>
  );
}
