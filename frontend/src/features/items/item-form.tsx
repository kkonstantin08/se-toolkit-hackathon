import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { Button, Field, Input, SectionTitle, Select, Textarea } from "../../components/ui/forms";
import { fromDateTimeLocal, toDateTimeLocal } from "../../lib/utils/datetime";
import type { ItemPayload, PlannerItem } from "../../types/api";

const recurrenceSchema = z.object({
  enabled: z.boolean().default(false),
  frequency: z.enum(["daily", "weekly", "monthly"]).default("weekly"),
  interval: z.coerce.number().min(1).default(1),
  by_weekdays: z.array(z.number()).default([]),
  day_of_month: z.coerce.number().optional(),
  ends_on: z.string().optional(),
  occurrence_count: z.coerce.number().optional(),
});

const reminderSchema = z.object({
  trigger_mode: z.enum(["relative", "absolute"]).default("relative"),
  offset_minutes: z.coerce.number().default(-30),
  absolute_trigger_at: z.string().optional(),
  channel: z.enum(["in_app", "browser"]).default("in_app"),
  is_enabled: z.boolean().default(true),
});

const itemSchema = z
  .object({
    item_type: z.enum(["task", "event"]),
    title: z.string().min(1, "Введите название"),
    description: z.string().optional(),
    start_at: z.string().optional(),
    end_at: z.string().optional(),
    due_at: z.string().optional(),
    all_day: z.boolean().default(false),
    color: z.string().default("#0f3d3e"),
    reminders: z.array(reminderSchema).default([]),
    recurrence: recurrenceSchema.default({
      enabled: false,
      frequency: "weekly",
      interval: 1,
      by_weekdays: [],
    }),
  })
  .superRefine((value, ctx) => {
    if (value.item_type === "event" && !value.start_at) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Для события нужен start_at", path: ["start_at"] });
    }
    if (value.item_type === "task" && !value.due_at && !value.start_at) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Для задачи нужна дата начала или дедлайн", path: ["due_at"] });
    }
  });

type ItemFormValues = z.output<typeof itemSchema>;

const weekdayOptions = [
  { label: "Пн", value: 0 },
  { label: "Вт", value: 1 },
  { label: "Ср", value: 2 },
  { label: "Чт", value: 3 },
  { label: "Пт", value: 4 },
  { label: "Сб", value: 5 },
  { label: "Вс", value: 6 },
];

function defaultsFromItem(item?: Partial<ItemPayload | PlannerItem>): ItemFormValues {
  return {
    item_type: item?.item_type ?? "task",
    title: item?.title ?? "",
    description: item?.description ?? "",
    start_at: toDateTimeLocal(item?.start_at),
    end_at: toDateTimeLocal(item?.end_at),
    due_at: toDateTimeLocal(item?.due_at),
    all_day: item?.all_day ?? false,
    color: item?.color ?? "#0f3d3e",
    reminders:
      item?.reminders?.map((reminder) => ({
        trigger_mode: reminder.trigger_mode,
        offset_minutes: reminder.offset_minutes ?? -30,
        absolute_trigger_at: toDateTimeLocal(reminder.absolute_trigger_at),
        channel: reminder.channel,
        is_enabled: reminder.is_enabled,
      })) ?? [],
    recurrence: {
      enabled: Boolean(item?.recurrence),
      frequency: item?.recurrence?.frequency ?? "weekly",
      interval: item?.recurrence?.interval ?? 1,
      by_weekdays: item?.recurrence?.by_weekdays ?? [],
      day_of_month: item?.recurrence?.day_of_month ?? undefined,
      ends_on: item?.recurrence?.ends_on ?? undefined,
      occurrence_count: item?.recurrence?.occurrence_count ?? undefined,
    },
  };
}

function toPayload(values: ItemFormValues, source: "manual" | "ai"): ItemPayload {
  return {
    item_type: values.item_type,
    title: values.title,
    description: values.description || null,
    start_at: fromDateTimeLocal(values.start_at),
    end_at: fromDateTimeLocal(values.end_at),
    due_at: fromDateTimeLocal(values.due_at),
    all_day: values.all_day,
    color: values.color,
    source,
    reminders: values.reminders.map((reminder) => ({
      trigger_mode: reminder.trigger_mode,
      offset_minutes: reminder.trigger_mode === "relative" ? reminder.offset_minutes : null,
      absolute_trigger_at: reminder.trigger_mode === "absolute" ? fromDateTimeLocal(reminder.absolute_trigger_at) : null,
      channel: reminder.channel,
      is_enabled: reminder.is_enabled,
    })),
    recurrence: values.recurrence.enabled
      ? {
          frequency: values.recurrence.frequency,
          interval: values.recurrence.interval,
          by_weekdays: values.recurrence.frequency === "weekly" ? values.recurrence.by_weekdays : null,
          day_of_month: values.recurrence.frequency === "monthly" ? values.recurrence.day_of_month ?? null : null,
          ends_on: values.recurrence.ends_on || null,
          occurrence_count: values.recurrence.occurrence_count ?? null,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }
      : null,
  };
}

export function ItemForm({
  initialItem,
  source = "manual",
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initialItem?: Partial<ItemPayload | PlannerItem>;
  source?: "manual" | "ai";
  submitLabel: string;
  onSubmit: (payload: ItemPayload) => Promise<void>;
  onCancel?: () => void;
}) {
  const initialValues = useMemo(() => defaultsFromItem(initialItem) as ItemFormValues, [initialItem]);

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema) as never,
    values: initialValues,
  });

  const remindersFieldArray = useFieldArray({ control: form.control, name: "reminders" });
  const recurrenceEnabled = useWatch({ control: form.control, name: "recurrence.enabled" });
  const recurrenceFrequency = useWatch({ control: form.control, name: "recurrence.frequency" });
  const reminderValues = useWatch({ control: form.control, name: "reminders" }) ?? [];
  const recurrenceWeekdays = useWatch({ control: form.control, name: "recurrence.by_weekdays" }) ?? [];

  return (
    <form
      className="grid gap-6"
      onSubmit={form.handleSubmit(async (values) => {
        await onSubmit(toPayload(values as ItemFormValues, source));
      })}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Тип">
          <Select {...form.register("item_type")}>
            <option value="task">Задача</option>
            <option value="event">Событие</option>
          </Select>
        </Field>
        <Field label="Цвет">
          <Input type="color" {...form.register("color")} className="h-11 p-2" />
        </Field>
      </div>

      <Field label="Название">
        <Input placeholder="Например, Подготовить отчёт по базе данных" {...form.register("title")} />
      </Field>

      <Field label="Описание">
        <Textarea placeholder="Контекст, ссылка на материалы, аудитория, детали..." {...form.register("description")} />
      </Field>

      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Начало">
          <Input type="datetime-local" {...form.register("start_at")} />
        </Field>
        <Field label="Конец">
          <Input type="datetime-local" {...form.register("end_at")} />
        </Field>
        <Field label="Дедлайн">
          <Input type="datetime-local" {...form.register("due_at")} />
        </Field>
      </div>

      <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <input type="checkbox" {...form.register("all_day")} />
        Весь день
      </label>

      <div className="grid gap-4 rounded-[1.75rem] border border-slate-200 bg-white p-4">
        <SectionTitle title="Напоминания" description="Несколько напоминаний на одно событие или задачу." />
        {remindersFieldArray.fields.map((field, index) => {
          const mode = reminderValues[index]?.trigger_mode ?? "relative";
          return (
            <div key={field.id} className="grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 md:grid-cols-4">
              <Field label="Режим">
                <Select {...form.register(`reminders.${index}.trigger_mode`)}>
                  <option value="relative">До начала</option>
                  <option value="absolute">Точная дата</option>
                </Select>
              </Field>
              {mode === "relative" ? (
                <Field label="Смещение, мин">
                  <Input type="number" {...form.register(`reminders.${index}.offset_minutes`)} />
                </Field>
              ) : (
                <Field label="Момент срабатывания">
                  <Input type="datetime-local" {...form.register(`reminders.${index}.absolute_trigger_at`)} />
                </Field>
              )}
              <Field label="Канал">
                <Select {...form.register(`reminders.${index}.channel`)}>
                  <option value="in_app">In-app</option>
                  <option value="browser">Browser</option>
                </Select>
              </Field>
              <div className="flex items-end justify-between gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" {...form.register(`reminders.${index}.is_enabled`)} />
                  Активно
                </label>
                <Button type="button" variant="ghost" onClick={() => remindersFieldArray.remove(index)}>
                  Удалить
                </Button>
              </div>
            </div>
          );
        })}
        <Button
          type="button"
          variant="secondary"
          className="w-fit"
          onClick={() =>
            remindersFieldArray.append({
              trigger_mode: "relative",
              offset_minutes: -30,
              channel: "in_app",
              is_enabled: true,
            })
          }
        >
          Добавить напоминание
        </Button>
      </div>

      <div className="grid gap-4 rounded-[1.75rem] border border-slate-200 bg-white p-4">
        <SectionTitle title="Повторение" description="Preset-правила без тяжёлого RRULE-интерфейса." />
        <label className="flex items-center gap-3 text-sm text-slate-600">
          <input type="checkbox" {...form.register("recurrence.enabled")} />
          Повторять
        </label>
        {recurrenceEnabled ? (
          <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-4">
              <Field label="Частота">
                <Select {...form.register("recurrence.frequency")}>
                  <option value="daily">Ежедневно</option>
                  <option value="weekly">Еженедельно</option>
                  <option value="monthly">Ежемесячно</option>
                </Select>
              </Field>
              <Field label="Интервал">
                <Input type="number" min={1} {...form.register("recurrence.interval")} />
              </Field>
              <Field label="До даты">
                <Input type="date" {...form.register("recurrence.ends_on")} />
              </Field>
              <Field label="Лимит повторов">
                <Input type="number" min={1} {...form.register("recurrence.occurrence_count")} />
              </Field>
            </div>
            {recurrenceFrequency === "weekly" ? (
              <div className="flex flex-wrap gap-2">
                {weekdayOptions.map((weekday) => {
                  const selected = recurrenceWeekdays.includes(weekday.value);
                  return (
                    <button
                      key={weekday.value}
                      type="button"
                      className={`rounded-full px-3 py-2 text-sm ${selected ? "bg-tide text-white" : "bg-slate-100 text-slate-600"}`}
                      onClick={() => {
                        const current = form.getValues("recurrence.by_weekdays");
                        const next = current.includes(weekday.value)
                          ? current.filter((value) => value !== weekday.value)
                          : [...current, weekday.value].sort((a, b) => a - b);
                        form.setValue("recurrence.by_weekdays", next);
                      }}
                    >
                      {weekday.label}
                    </button>
                  );
                })}
              </div>
            ) : null}
            {recurrenceFrequency === "monthly" ? (
              <Field label="День месяца">
                <Input type="number" min={1} max={31} {...form.register("recurrence.day_of_month")} />
              </Field>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit">{submitLabel}</Button>
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Отмена
          </Button>
        ) : null}
      </div>
    </form>
  );
}
