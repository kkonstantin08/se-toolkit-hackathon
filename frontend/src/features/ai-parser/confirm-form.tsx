import { useState } from "react";

import { Button, Field, Input, Select, Textarea } from "../../components/ui/forms";
import { fromDateTimeLocal, toDateTimeLocal } from "../../lib/utils/datetime";
import type { ItemPayload, Recurrence, Reminder } from "../../types/api";

type ReminderDraft = {
  trigger_mode: "relative" | "absolute";
  offset_minutes: number;
  absolute_trigger_at: string;
  channel: "in_app" | "browser";
  is_enabled: boolean;
};

type ConfirmFormState = {
  item_type: "task" | "event";
  title: string;
  description: string;
  start_at: string;
  end_at: string;
  due_at: string;
  all_day: boolean;
  color: string;
  reminders: ReminderDraft[];
  recurrence_enabled: boolean;
  recurrence_frequency: "daily" | "weekly" | "monthly";
  recurrence_interval: number;
  recurrence_ends_on: string;
};

function toState(item: ItemPayload): ConfirmFormState {
  return {
    item_type: item.item_type,
    title: item.title ?? "",
    description: item.description ?? "",
    start_at: toDateTimeLocal(item.start_at),
    end_at: toDateTimeLocal(item.end_at),
    due_at: toDateTimeLocal(item.due_at),
    all_day: item.all_day ?? false,
    color: item.color ?? "#10B981",
    reminders:
      item.reminders?.map((reminder) => ({
        trigger_mode: reminder.trigger_mode,
        offset_minutes: reminder.offset_minutes ?? -30,
        absolute_trigger_at: toDateTimeLocal(reminder.absolute_trigger_at),
        channel: reminder.channel,
        is_enabled: reminder.is_enabled,
      })) ?? [],
    recurrence_enabled: Boolean(item.recurrence),
    recurrence_frequency: item.recurrence?.frequency ?? "weekly",
    recurrence_interval: item.recurrence?.interval ?? 1,
    recurrence_ends_on: item.recurrence?.ends_on ?? "",
  };
}

function toReminderPayload(reminder: ReminderDraft): Reminder {
  return {
    trigger_mode: reminder.trigger_mode,
    offset_minutes: reminder.trigger_mode === "relative" ? reminder.offset_minutes : null,
    absolute_trigger_at: reminder.trigger_mode === "absolute" ? fromDateTimeLocal(reminder.absolute_trigger_at) : null,
    channel: reminder.channel,
    is_enabled: reminder.is_enabled,
  };
}

function toRecurrencePayload(state: ConfirmFormState): Recurrence | null {
  if (!state.recurrence_enabled) return null;
  return {
    frequency: state.recurrence_frequency,
    interval: state.recurrence_interval,
    by_weekdays: null,
    day_of_month: null,
    ends_on: state.recurrence_ends_on || null,
    occurrence_count: null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

function toPayload(state: ConfirmFormState): ItemPayload {
  return {
    item_type: state.item_type,
    title: state.title.trim(),
    description: state.description.trim() || null,
    start_at: fromDateTimeLocal(state.start_at),
    end_at: fromDateTimeLocal(state.end_at),
    due_at: fromDateTimeLocal(state.due_at),
    all_day: state.all_day,
    status: state.item_type === "event" ? "scheduled" : "pending",
    source: "ai",
    color: state.color,
    reminders: state.reminders.map(toReminderPayload),
    recurrence: toRecurrencePayload(state),
  };
}

export function AiConfirmForm({
  initialItem,
  onSubmit,
  onCancel,
}: {
  initialItem: ItemPayload;
  onSubmit: (payload: ItemPayload) => Promise<void>;
  onCancel: () => void;
}) {
  const [state, setState] = useState<ConfirmFormState>(() => toState(initialItem));

  return (
    <form
      className="grid gap-6"
      onSubmit={async (event) => {
        event.preventDefault();
        await onSubmit(toPayload(state));
      }}
    >
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-800">
        Форма загружена из AI-черновика: {state.item_type}, {state.title || "без названия"}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Тип">
          <Select value={state.item_type} onChange={(event) => setState((current) => ({ ...current, item_type: event.target.value as "task" | "event" }))}>
            <option value="task">Задача</option>
            <option value="event">Событие</option>
          </Select>
        </Field>
        <Field label="Цвет">
          <Input type="color" value={state.color} onChange={(event) => setState((current) => ({ ...current, color: event.target.value }))} className="h-11 p-2" />
        </Field>
      </div>

      <Field label="Название">
        <Input value={state.title} onChange={(event) => setState((current) => ({ ...current, title: event.target.value }))} />
      </Field>

      <Field label="Описание">
        <Textarea value={state.description} onChange={(event) => setState((current) => ({ ...current, description: event.target.value }))} />
      </Field>

      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Начало">
          <Input type="datetime-local" value={state.start_at} onChange={(event) => setState((current) => ({ ...current, start_at: event.target.value }))} />
        </Field>
        <Field label="Конец">
          <Input type="datetime-local" value={state.end_at} onChange={(event) => setState((current) => ({ ...current, end_at: event.target.value }))} />
        </Field>
        <Field label="Дедлайн">
          <Input type="datetime-local" value={state.due_at} onChange={(event) => setState((current) => ({ ...current, due_at: event.target.value }))} />
        </Field>
      </div>

      <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <input type="checkbox" checked={state.all_day} onChange={(event) => setState((current) => ({ ...current, all_day: event.target.checked }))} />
        Весь день
      </label>

      <div className="grid gap-4 rounded-[1.75rem] border border-slate-200 bg-white p-4">
        <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Напоминания</div>
        {state.reminders.length ? (
          state.reminders.map((reminder, index) => (
            <div key={`${index}-${reminder.trigger_mode}`} className="grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 md:grid-cols-4">
              <Field label="Режим">
                <Select
                  value={reminder.trigger_mode}
                  onChange={(event) =>
                    setState((current) => ({
                      ...current,
                      reminders: current.reminders.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, trigger_mode: event.target.value as "relative" | "absolute" } : entry,
                      ),
                    }))
                  }
                >
                  <option value="relative">До начала</option>
                  <option value="absolute">Точная дата</option>
                </Select>
              </Field>
              {reminder.trigger_mode === "relative" ? (
                <Field label="Смещение, мин">
                  <Input
                    type="number"
                    value={reminder.offset_minutes}
                    onChange={(event) =>
                      setState((current) => ({
                        ...current,
                        reminders: current.reminders.map((entry, entryIndex) =>
                          entryIndex === index ? { ...entry, offset_minutes: Number(event.target.value) } : entry,
                        ),
                      }))
                    }
                  />
                </Field>
              ) : (
                <Field label="Момент срабатывания">
                  <Input
                    type="datetime-local"
                    value={reminder.absolute_trigger_at}
                    onChange={(event) =>
                      setState((current) => ({
                        ...current,
                        reminders: current.reminders.map((entry, entryIndex) =>
                          entryIndex === index ? { ...entry, absolute_trigger_at: event.target.value } : entry,
                        ),
                      }))
                    }
                  />
                </Field>
              )}
              <Field label="Канал">
                <Select
                  value={reminder.channel}
                  onChange={(event) =>
                    setState((current) => ({
                      ...current,
                      reminders: current.reminders.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, channel: event.target.value as "in_app" | "browser" } : entry,
                      ),
                    }))
                  }
                >
                  <option value="in_app">In-app</option>
                  <option value="browser">Browser</option>
                </Select>
              </Field>
              <div className="flex items-end justify-between gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={reminder.is_enabled}
                    onChange={(event) =>
                      setState((current) => ({
                        ...current,
                        reminders: current.reminders.map((entry, entryIndex) =>
                          entryIndex === index ? { ...entry, is_enabled: event.target.checked } : entry,
                        ),
                      }))
                    }
                  />
                  Активно
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    setState((current) => ({
                      ...current,
                      reminders: current.reminders.filter((_, entryIndex) => entryIndex !== index),
                    }))
                  }
                >
                  Удалить
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-sm text-slate-400">AI не извлёк напоминания.</div>
        )}
        <Button
          type="button"
          variant="secondary"
          className="w-fit"
          onClick={() =>
            setState((current) => ({
              ...current,
              reminders: [
                ...current.reminders,
                {
                  trigger_mode: "relative",
                  offset_minutes: -30,
                  absolute_trigger_at: "",
                  channel: "in_app",
                  is_enabled: true,
                },
              ],
            }))
          }
        >
          Добавить напоминание
        </Button>
      </div>

      <div className="grid gap-4 rounded-[1.75rem] border border-slate-200 bg-white p-4">
        <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Повторение</div>
        <label className="flex items-center gap-3 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={state.recurrence_enabled}
            onChange={(event) => setState((current) => ({ ...current, recurrence_enabled: event.target.checked }))}
          />
          Повторять
        </label>
        {state.recurrence_enabled ? (
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Частота">
              <Select
                value={state.recurrence_frequency}
                onChange={(event) =>
                  setState((current) => ({
                    ...current,
                    recurrence_frequency: event.target.value as "daily" | "weekly" | "monthly",
                  }))
                }
              >
                <option value="daily">Ежедневно</option>
                <option value="weekly">Еженедельно</option>
                <option value="monthly">Ежемесячно</option>
              </Select>
            </Field>
            <Field label="Интервал">
              <Input
                type="number"
                min={1}
                value={state.recurrence_interval}
                onChange={(event) => setState((current) => ({ ...current, recurrence_interval: Number(event.target.value) }))}
              />
            </Field>
            <Field label="До даты">
              <Input type="date" value={state.recurrence_ends_on} onChange={(event) => setState((current) => ({ ...current, recurrence_ends_on: event.target.value }))} />
            </Field>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit">Подтвердить и сохранить</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Отмена
        </Button>
      </div>
    </form>
  );
}
