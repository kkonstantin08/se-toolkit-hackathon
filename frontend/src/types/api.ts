export type User = {
  id: string;
  email: string;
  full_name: string;
  timezone: string;
  is_active: boolean;
  created_at: string;
};

export type Reminder = {
  id?: string | null;
  trigger_mode: "relative" | "absolute";
  offset_minutes?: number | null;
  absolute_trigger_at?: string | null;
  channel: "in_app" | "browser";
  is_enabled: boolean;
  last_fired_at?: string | null;
};

export type Recurrence = {
  id?: string | null;
  frequency: "daily" | "weekly" | "monthly";
  interval: number;
  by_weekdays?: number[] | null;
  day_of_month?: number | null;
  ends_on?: string | null;
  occurrence_count?: number | null;
  timezone: string;
};

export type PlannerItem = {
  id: string;
  user_id: string;
  item_type: "task" | "event";
  title: string;
  description?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  due_at?: string | null;
  all_day: boolean;
  status: string;
  source: string;
  color?: string | null;
  is_recurring: boolean;
  created_at: string;
  updated_at: string;
  reminders: Reminder[];
  recurrence?: Recurrence | null;
};

export type PlannerOccurrence = PlannerItem & {
  occurrence_date?: string | null;
  display_start_at?: string | null;
  display_end_at?: string | null;
  display_due_at?: string | null;
  completed_for_occurrence: boolean;
  sync_status?: string | null;
};

export type PlannerWeek = {
  start_of_week: string;
  end_of_week: string;
  items: PlannerOccurrence[];
};

export type ParsedDraft = {
  id: string;
  raw_text: string;
  parsed_payload_json: { item: ItemPayload };
  warnings_json: string[];
  parse_status: string;
  parse_source: "mistral" | "fallback" | string;
  model_name: string;
  confirmed_at?: string | null;
  expires_at: string;
  created_at: string;
};

export type GoogleStatus = {
  configured: boolean;
  connected: boolean;
  provider_email?: string | null;
  default_calendar_id?: string | null;
  connected_at?: string | null;
};

export type SyncResponse = {
  sync_status: string;
  external_object_id?: string | null;
  last_error?: string | null;
  last_synced_at?: string | null;
};

export type DueReminder = {
  item_id: string;
  title: string;
  item_type: "task" | "event";
  trigger_at: string;
  channel: "in_app" | "browser";
  occurrence_date?: string | null;
};

export type ItemPayload = {
  item_type: "task" | "event";
  title: string;
  description?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  due_at?: string | null;
  all_day: boolean;
  status?: string | null;
  source: string;
  color?: string | null;
  reminders: Reminder[];
  recurrence?: Recurrence | null;
};
