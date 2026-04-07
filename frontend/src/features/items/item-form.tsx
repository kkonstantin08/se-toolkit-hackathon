import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { Button, Field, Input, SectionTitle, Select, Textarea } from "../../components/ui/forms";
import { useI18n } from "../../lib/i18n";
import { fromDateTimeLocal, toDateTimeLocal } from "../../lib/utils/datetime";
import type { ItemPayload, PlannerItem } from "../../types/api";

type ItemFormValues = {
  item_type: "task" | "event";
  title: string;
  description?: string;
  start_at?: string;
  end_at?: string;
  due_at?: string;
  all_day: boolean;
  color: string;
  reminders: Array<{
    trigger_mode: "relative" | "absolute";
    offset_minutes?: number;
    absolute_trigger_at?: string;
    channel: "in_app" | "browser";
    is_enabled: boolean;
  }>;
  recurrence: {
    enabled: boolean;
    frequency: "daily" | "weekly" | "monthly";
    interval: number;
    by_weekdays: number[];
    day_of_month?: number;
    ends_on?: string;
    occurrence_count?: number;
  };
};

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
      offset_minutes: reminder.trigger_mode === "relative" ? reminder.offset_minutes ?? -30 : null,
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
  const { messages } = useI18n();
  const weekdayOptions = useMemo(
    () => messages.common.recurrenceWeekdays.map((label, index) => ({ label, value: index })),
    [messages.common.recurrenceWeekdays],
  );

  const itemSchema = useMemo(
    () =>
      z
        .object({
          item_type: z.enum(["task", "event"]),
          title: z.string().min(1, messages.itemForm.validationTitle),
          description: z.string().optional(),
          start_at: z.string().optional(),
          end_at: z.string().optional(),
          due_at: z.string().optional(),
          all_day: z.boolean().default(false),
          color: z.string().default("#0f3d3e"),
          reminders: z
            .array(
              z.object({
                trigger_mode: z.enum(["relative", "absolute"]).default("relative"),
                offset_minutes: z.coerce.number().optional(),
                absolute_trigger_at: z.string().optional(),
                channel: z.enum(["in_app", "browser"]).default("in_app"),
                is_enabled: z.boolean().default(true),
              }),
            )
            .default([]),
          recurrence: z.object({
            enabled: z.boolean().default(false),
            frequency: z.enum(["daily", "weekly", "monthly"]).default("weekly"),
            interval: z.coerce.number().min(1).default(1),
            by_weekdays: z.array(z.number()).default([]),
            day_of_month: z.coerce.number().optional(),
            ends_on: z.string().optional(),
            occurrence_count: z.coerce.number().optional(),
          }),
        })
        .superRefine((value, ctx) => {
          if (value.item_type === "event" && !value.start_at) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: messages.itemForm.validationEventStart, path: ["start_at"] });
          }
          if (value.item_type === "task" && !value.due_at && !value.start_at) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: messages.itemForm.validationTaskDate, path: ["due_at"] });
          }
        }),
    [messages.itemForm],
  );

  const initialValues = useMemo(() => defaultsFromItem(initialItem), [initialItem]);

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
        <Field label={messages.itemForm.type}>
          <Select {...form.register("item_type")}>
            <option value="task">{messages.common.task}</option>
            <option value="event">{messages.common.event}</option>
          </Select>
        </Field>
        <Field label={messages.itemForm.color}>
          <Input type="color" {...form.register("color")} className="h-11 p-2" />
        </Field>
      </div>

      <Field label={messages.itemForm.title}>
        <Input placeholder={messages.itemForm.titlePlaceholder} {...form.register("title")} />
      </Field>

      <Field label={messages.itemForm.description}>
        <Textarea placeholder={messages.itemForm.descriptionPlaceholder} {...form.register("description")} />
      </Field>

      <div className="grid gap-4 md:grid-cols-3">
        <Field label={messages.itemForm.start}>
          <Input type="datetime-local" {...form.register("start_at")} />
        </Field>
        <Field label={messages.itemForm.end}>
          <Input type="datetime-local" {...form.register("end_at")} />
        </Field>
        <Field label={messages.itemForm.due}>
          <Input type="datetime-local" {...form.register("due_at")} />
        </Field>
      </div>

      <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <input type="checkbox" {...form.register("all_day")} />
        {messages.itemForm.allDay}
      </label>

      <div className="grid gap-4 rounded-[1.75rem] border border-slate-200 bg-white p-4">
        <SectionTitle title={messages.itemForm.reminders} description={messages.itemForm.remindersDescription} />
        {remindersFieldArray.fields.map((field, index) => {
          const mode = reminderValues[index]?.trigger_mode ?? "relative";
          return (
            <div key={field.id} className="grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 md:grid-cols-4">
              <Field label={messages.itemForm.mode}>
                <Select {...form.register(`reminders.${index}.trigger_mode`)}>
                  <option value="relative">{messages.itemForm.beforeStart}</option>
                  <option value="absolute">{messages.itemForm.exactDate}</option>
                </Select>
              </Field>
              {mode === "relative" ? (
                <Field label={messages.itemForm.offsetMinutes}>
                  <Input type="number" {...form.register(`reminders.${index}.offset_minutes`)} />
                </Field>
              ) : (
                <Field label={messages.itemForm.triggerMoment}>
                  <Input type="datetime-local" {...form.register(`reminders.${index}.absolute_trigger_at`)} />
                </Field>
              )}
              <Field label={messages.itemForm.channel}>
                <Select {...form.register(`reminders.${index}.channel`)}>
                  <option value="in_app">{messages.common.inApp}</option>
                  <option value="browser">{messages.common.browser}</option>
                </Select>
              </Field>
              <div className="flex items-end justify-between gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" {...form.register(`reminders.${index}.is_enabled`)} />
                  {messages.common.active}
                </label>
                <Button type="button" variant="ghost" onClick={() => remindersFieldArray.remove(index)}>
                  {messages.itemForm.deleteReminder}
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
          {messages.itemForm.addReminder}
        </Button>
      </div>

      <div className="grid gap-4 rounded-[1.75rem] border border-slate-200 bg-white p-4">
        <SectionTitle title={messages.itemForm.recurrence} description={messages.itemForm.recurrenceDescription} />
        <label className="flex items-center gap-3 text-sm text-slate-600">
          <input type="checkbox" {...form.register("recurrence.enabled")} />
          {messages.itemForm.repeat}
        </label>
        {recurrenceEnabled ? (
          <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-4">
              <Field label={messages.itemForm.frequency}>
                <Select {...form.register("recurrence.frequency")}>
                  <option value="daily">{messages.itemForm.daily}</option>
                  <option value="weekly">{messages.itemForm.weekly}</option>
                  <option value="monthly">{messages.itemForm.monthly}</option>
                </Select>
              </Field>
              <Field label={messages.itemForm.interval}>
                <Input type="number" min={1} {...form.register("recurrence.interval")} />
              </Field>
              <Field label={messages.itemForm.untilDate}>
                <Input type="date" {...form.register("recurrence.ends_on")} />
              </Field>
              <Field label={messages.itemForm.limit}>
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
              <Field label={messages.itemForm.dayOfMonth}>
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
            {messages.common.cancel}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
