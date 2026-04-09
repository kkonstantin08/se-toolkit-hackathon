import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";

import { LanguageToggle } from "../components/ui/language-toggle";
import { Button, Field, Input, PasswordInput, Select } from "../components/ui/forms";
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
      z
        .object({
          full_name: z.string().min(2, messages.register.nameError),
          email: z.string().email(messages.register.emailError),
          password: z.string().min(8, messages.register.passwordError),
          confirm_password: z.string().min(1, messages.register.confirmPasswordError),
          timezone: z.string().min(2, messages.register.timezoneError),
        })
        .superRefine((values, context) => {
          if (values.confirm_password !== values.password) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              message: messages.register.passwordMismatch,
              path: ["confirm_password"],
            });
          }
        }),
    [messages.register],
  );

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      full_name: "",
      email: "",
      password: "",
      confirm_password: "",
      timezone: detectedTimezone,
    },
  });
  const confirmPasswordValue = form.watch("confirm_password");
  const passwordValue = form.watch("password");
  const showConfirmMismatch =
    (form.formState.touchedFields.confirm_password || confirmPasswordValue.length > 0) &&
    confirmPasswordValue.length > 0 &&
    confirmPasswordValue !== passwordValue &&
    !form.formState.errors.confirm_password;

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
          onSubmit={form.handleSubmit(
            async (values) => {
              const payload = {
                email: values.email,
                password: values.password,
                full_name: values.full_name,
                timezone: values.timezone,
              };
              await register.mutateAsync(payload);
              navigate("/planner", { replace: true });
            },
            (errors) => {
              console.error("[auth] register validation failed", errors);
            },
          )}
        >
          <Field label={messages.register.name}>
            <Input {...form.register("full_name")} />
            {form.formState.errors.full_name ? <span className="text-sm text-red-500">{form.formState.errors.full_name.message}</span> : null}
          </Field>
          <Field label="Email">
            <Input {...form.register("email")} />
            {form.formState.errors.email ? <span className="text-sm text-red-500">{form.formState.errors.email.message}</span> : null}
          </Field>
          <Field label={messages.register.password}>
            <PasswordInput
              {...form.register("password")}
              hidePasswordLabel={messages.common.hidePassword}
              showPasswordLabel={messages.common.showPassword}
            />
            {form.formState.errors.password ? <span className="text-sm text-red-500">{form.formState.errors.password.message}</span> : null}
          </Field>
          <Field label={messages.register.confirmPassword}>
            <PasswordInput
              {...form.register("confirm_password")}
              hidePasswordLabel={messages.common.hidePassword}
              showPasswordLabel={messages.common.showPassword}
            />
            {form.formState.errors.confirm_password ? (
              <span className="text-sm text-red-500">{form.formState.errors.confirm_password.message}</span>
            ) : null}
            {showConfirmMismatch ? <span className="text-sm text-red-500">{messages.register.passwordMismatch}</span> : null}
          </Field>
          <Field label={messages.register.timezone} hint={messages.register.timezoneHint}>
            <Select {...form.register("timezone")}>
              {timezoneOptions.map((timezone) => (
                <option key={timezone} value={timezone}>
                  {timezone === detectedTimezone ? `${timezone} (${messages.common.current})` : timezone}
                </option>
              ))}
            </Select>
            {form.formState.errors.timezone ? <span className="text-sm text-red-500">{form.formState.errors.timezone.message}</span> : null}
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
