import type {
  DueReminder,
  GoogleStatus,
  ItemPayload,
  ParsedDraft,
  PlannerItem,
  PlannerWeek,
  SyncResponse,
  User,
} from "../../types/api";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";
const AUTH_RETRY_EXCLUDED_PATHS = new Set([
  "/auth/login",
  "/auth/register",
  "/auth/logout",
  "/auth/refresh",
]);

let refreshPromise: Promise<boolean> | null = null;

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

function buildRequestInit(options: RequestInit = {}): RequestInit {
  return {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    ...options,
  };
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    console.error("[api] request failed", {
      url: response.url,
      status: response.status,
      detail: body.detail ?? "Unexpected API error",
    });
    throw new ApiError(response.status, body.detail ?? "Unexpected API error");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        console.warn("[api] refresh failed", {
          url: response.url,
          status: response.status,
          detail: body.detail ?? "Unexpected API error",
        });
        return false;
      }

      await response.json().catch(() => undefined);
      return true;
    })();
  }

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

async function request<T>(path: string, options: RequestInit = {}, allowAuthRetry = true): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, buildRequestInit(options));

  if (response.status === 401 && allowAuthRetry && !AUTH_RETRY_EXCLUDED_PATHS.has(path)) {
    const refreshed = await refreshSession();
    if (refreshed) {
      const retryResponse = await fetch(`${API_BASE_URL}${path}`, buildRequestInit(options));
      return parseResponse<T>(retryResponse);
    }
  }

  return parseResponse<T>(response);
}

export const api = {
  register: (payload: { email: string; password: string; full_name: string; timezone: string }) =>
    request<User>("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload: { email: string; password: string }) =>
    request<User>("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  me: () => request<User>("/auth/me"),
  logout: () => request<{ message: string }>("/auth/logout", { method: "POST" }),
  refresh: () => request<User>("/auth/refresh", { method: "POST" }),

  week: (start: string) => request<PlannerWeek>(`/planner/week?start=${start}`),
  listItems: () => request<PlannerItem[]>("/items"),
  createItem: (payload: ItemPayload) => request<PlannerItem>("/items", { method: "POST", body: JSON.stringify(payload) }),
  updateItem: (itemId: string, payload: Partial<ItemPayload>) =>
    request<PlannerItem>(`/items/${itemId}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteItem: (itemId: string) => request<{ message: string }>(`/items/${itemId}`, { method: "DELETE" }),
  deleteItemOccurrence: (itemId: string, occurrenceDate: string) =>
    request<PlannerItem>(`/items/${itemId}/delete-occurrence`, {
      method: "POST",
      body: JSON.stringify({ occurrence_date: occurrenceDate }),
    }),
  completeItem: (itemId: string, occurrenceDate?: string | null) =>
    request<PlannerItem>(`/items/${itemId}/complete`, {
      method: "POST",
      body: JSON.stringify({ occurrence_date: occurrenceDate ?? null }),
    }),
  uncompleteItem: (itemId: string, occurrenceDate?: string | null) =>
    request<PlannerItem>(`/items/${itemId}/uncomplete`, {
      method: "POST",
      body: JSON.stringify({ occurrence_date: occurrenceDate ?? null }),
    }),

  dueReminders: () => request<DueReminder[]>("/reminders/due"),

  parseText: (payload: { raw_text: string; client_timezone?: string | null }) =>
    request<ParsedDraft>("/ai/parse", { method: "POST", body: JSON.stringify(payload) }),
  getDraft: (draftId: string) => request<ParsedDraft>(`/ai/drafts/${draftId}`),
  confirmDraft: (draftId: string, item: ItemPayload) =>
    request<PlannerItem>(`/ai/drafts/${draftId}/confirm`, { method: "POST", body: JSON.stringify({ item }) }),
  deleteDraft: (draftId: string) => request<{ message: string }>(`/ai/drafts/${draftId}`, { method: "DELETE" }),

  googleStatus: () => request<GoogleStatus>("/integrations/google/status"),
  googleConnectUrl: () => request<{ url: string }>("/integrations/google/connect-url"),
  googleDisconnect: () => request<{ message: string }>("/integrations/google", { method: "DELETE" }),
  googleSyncItem: (itemId: string) => request<SyncResponse>(`/integrations/google/sync/items/${itemId}`, { method: "POST" }),
};
