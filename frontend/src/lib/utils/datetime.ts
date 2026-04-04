import { addDays, format, parseISO, startOfWeek } from "date-fns";

export function getWeekStart(date: Date) {
  return startOfWeek(date, { weekStartsOn: 1 });
}

export function toApiDate(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export function formatWeekRange(date: Date) {
  const weekStart = getWeekStart(date);
  const weekEnd = addDays(weekStart, 6);
  return `${format(weekStart, "d MMM")} - ${format(weekEnd, "d MMM")}`;
}

export function formatDisplayDate(value?: string | null) {
  if (!value) return "Без даты";
  return format(parseISO(value), "EEE, d MMM HH:mm");
}

export function formatTime(value?: string | null) {
  if (!value) return "";
  return format(parseISO(value), "HH:mm");
}

export function toDateTimeLocal(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 16);
}

export function fromDateTimeLocal(value?: string | null) {
  if (!value) return null;
  return new Date(value).toISOString();
}

