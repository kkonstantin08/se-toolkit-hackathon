/* eslint-disable react-refresh/only-export-components */
import { enUS, ru } from "date-fns/locale";
import type { Locale as DateFnsLocale } from "date-fns/locale";
import { createContext, type PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";

export type Language = "en" | "ru";

const STORAGE_KEY = "plansync-language";

const messages = {
  en: {
    common: {
      appName: "PlanSync",
      studentPlanner: "Student Planner",
      task: "Task",
      event: "Event",
      yes: "Yes",
      no: "No",
      noDate: "No date",
      noTime: "No time",
      notSpecified: "Not specified",
      noDescription: "No description provided",
      noReminders: "No reminders configured.",
      edit: "Edit",
      delete: "Delete",
      close: "Close",
      cancel: "Cancel",
      create: "Create",
      saveChanges: "Save changes",
      createRecord: "Create item",
      records: "records",
      browser: "Browser",
      inApp: "In-app",
      active: "Active",
      current: "current",
      itemTypes: {
        task: "Task",
        event: "Event",
      },
      plannerStatus: {
        completed: "Completed",
        pending: "Pending",
        scheduled: "Scheduled",
      },
      syncStatus: {
        pending: "Pending",
        synced: "Synced",
        failed: "Failed",
        deleted: "Deleted",
        not_synced: "Not synced",
      },
      recurrenceWeekdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    },
    languageToggle: {
      label: "Language",
      english: "EN",
      russian: "RU",
    },
    auth: {
      loadingWorkspace: "Loading your PlanSync workspace...",
      profileLoadFailed: "Failed to load your profile.",
    },
    appShell: {
      navPlanner: "Planner",
      navIntegrations: "Integrations",
      logout: "Log out",
      heroTitle: "One week for tasks, events, and fast AI drafts",
      heroSubtitle: "Manual-first planning with confirmation required before any AI result is saved.",
    },
    login: {
      heroTitle: "A weekly planner that keeps your study rhythm intact.",
      heroSubtitle:
        "One surface for tasks, events, recurrence, reminders, and AI drafts with mandatory confirmation before saving.",
      demoLogin: "Demo login",
      signIn: "Sign in",
      signInSubtitle: "Sign in to open your weekly board.",
      quickTest: "For a quick test, you can sign in with the demo account right away.",
      signInDemo: "Sign in with demo account",
      signingIn: "Signing in...",
      password: "Password",
      openPlansync: "Open PlanSync",
      noAccount: "Don't have an account?",
      register: "Register",
      emailError: "Enter a valid email",
      passwordError: "Minimum 8 characters",
    },
    register: {
      title: "Create account",
      subtitle: "After registration, you can sign in right away and start planning your week.",
      demoHint:
        "The demo account already exists: student@example.com / password123. If you want to create a new user, enter a different email.",
      name: "Name",
      password: "Password",
      timezone: "Timezone",
      timezoneHint: "Uses the IANA format, for example Europe/Moscow or America/New_York.",
      create: "Register",
      creating: "Creating...",
      alreadyHaveAccount: "Already have an account?",
      signIn: "Sign in",
      nameError: "Minimum 2 characters",
      emailError: "Enter a valid email",
      passwordError: "Minimum 8 characters",
      timezoneError: "Choose a timezone",
    },
    planner: {
      title: "Weekly planner",
      previousWeek: "Previous week",
      nextWeek: "Next week",
      create: "Create",
      statsTotal: "Total",
      statsTasks: "Tasks",
      statsEvents: "Events",
      statsCompleted: "Completed",
      manualFirstTitle: "Manual-first mode",
      manualFirstDescription:
        "Even if Mistral or Google Calendar is not configured, the core flow remains available: manual creation, recurrence, reminders, and the weekly overview.",
      loadingWeek: "Loading the week...",
      googleMissing:
        "Google Calendar is not configured in `.env`, so automatic event synchronization is disabled.",
      googleDisconnected:
        "Google Calendar is not connected for this account yet. After connection, events will sync automatically.",
      syncErrorSuffix: "You can retry sync from the event card or from the details modal.",
      editItem: "Edit item",
      createItem: "Create item",
    },
    parsePanel: {
      title: "AI input without auto-save",
      subtitle:
        "Paste a task or event in free text. PlanSync will create only a draft for review, not a saved item.",
      placeholder: "For example: Meeting with advisor on 2026-04-10 at 18:00, remind me 1 day and 30 minutes before",
      parsing: "Parsing...",
      createDraft: "Create AI draft",
      confirmationHint: "After sending, a confirmation screen with prefilled fields will open.",
    },
    aiDraft: {
      mistralActive: (modelName: string) => `Mistral active: ${modelName}`,
      fallbackMode: "Fallback mode",
      type: "Type",
      undefined: "not detected",
      title: "Title",
      empty: "empty",
      dateTime: "Date / time",
      notExtracted: "not extracted",
      reminders: "Reminders",
      loading: "Loading AI draft...",
      loadFailed: "Failed to load the draft.",
      heading: "Review the AI draft before saving",
      subtitle:
        "The draft has not saved anything yet. If AI made a mistake, just fix the fields below and confirm only the correct version.",
      reject: "Discard",
      fallbackWarning: "Fallback parsing was used. Review the fields especially carefully.",
      sourceText: "Original text",
      warnings: "Warnings",
    },
    itemModal: {
      subtitle: "Before saving, you can adjust dates, recurrence, and reminders.",
    },
    itemForm: {
      type: "Type",
      color: "Color",
      title: "Title",
      titlePlaceholder: "For example, Prepare the database report",
      description: "Description",
      descriptionPlaceholder: "Context, material links, room, details...",
      start: "Start",
      end: "End",
      due: "Due",
      allDay: "All day",
      reminders: "Reminders",
      remindersDescription: "Use multiple reminders for one task or event.",
      mode: "Mode",
      beforeStart: "Before start",
      exactDate: "Exact date",
      offsetMinutes: "Offset, min",
      triggerMoment: "Trigger time",
      channel: "Channel",
      deleteReminder: "Delete",
      addReminder: "Add reminder",
      recurrence: "Recurrence",
      recurrenceDescription: "Preset rules without a heavy RRULE interface.",
      repeat: "Repeat",
      frequency: "Frequency",
      interval: "Interval",
      untilDate: "Until date",
      limit: "Occurrence limit",
      dayOfMonth: "Day of month",
      daily: "Daily",
      weekly: "Weekly",
      monthly: "Monthly",
      validationTitle: "Enter a title",
      validationEventStart: "Events require `start_at`",
      validationTaskDate: "Tasks require a start date or due date",
    },
    deleteModal: {
      deleteEventOrSeries: (isEvent: boolean) =>
        `Delete only this ${isEvent ? "event" : "task occurrence"} or the whole series?`,
      deleteItem: (entityLabel: string) => `Delete ${entityLabel}?`,
      recurringDescription:
        "You can hide only the selected occurrence in PlanSync or delete the whole series.",
      irreversible: "This action cannot be undone.",
      googleNote: "Deleting one occurrence only affects PlanSync. The Google Calendar series stays unchanged.",
      deleteThisEvent: "Delete this event",
      deleteThisOccurrence: "Delete this occurrence",
      deleteSeries: (label: string) => `Delete ${label}`,
      eventEntity: "event",
      taskEntity: "task",
      wholeSeries: "the whole series",
    },
    eventDetails: {
      noRecurrence: "No recurrence",
      everyDay: "Every day",
      everyNDays: (n: number) => `Every ${n} days`,
      everyWeek: (days: string) => `Every week${days ? `: ${days}` : ""}`,
      everyNWeeks: (n: number, days: string) => `Every ${n} weeks${days ? `: ${days}` : ""}`,
      everyMonth: (day?: number | null) => `Every month${day ? `, day ${day}` : ""}`,
      everyNMonths: (n: number, day?: number | null) => `Every ${n} months${day ? `, day ${day}` : ""}`,
      untilDate: (date: string) => `until ${date}`,
      occurrences: (count: number) => `, ${count} occurrences`,
      exactDate: (date: string) => `Exact date: ${date}`,
      daysBefore: (n: number) => `${n} d before`,
      hoursBefore: (n: number) => `${n} h before`,
      minutesBefore: (n: number) => `${n} min before`,
      detailsEventSubtitle: "Full event information is shown here. Editing and deletion live in this modal.",
      detailsTaskSubtitle: "Full task information is shown here. Editing and deletion live in this modal.",
      dateTime: "Date and time",
      deadline: "Deadline",
      end: "End",
      status: "Status",
      allDay: "All day",
      recurrence: "Recurrence",
      description: "Description",
      reminders: "Reminders",
      recurringEventNote:
        "Deleting one occurrence works only locally in PlanSync and does not change the series in Google Calendar.",
      recurringTaskNote: "For recurring items, you can delete only the selected occurrence or the whole series.",
      sync: "Sync",
    },
    weeklyPlanner: {
      nothingPlanned: "Nothing planned.",
      pause: "A pause without tasks and events.",
      syncEvent: "Sync event",
      complete: "Mark as completed",
      uncomplete: "Mark as not completed",
    },
    reminders: {
      title: "Reminders",
      eventStartsSoon: "Event starts soon",
      taskNeedsAttention: "Task needs attention right now",
    },
    google: {
      subtitle: "Automatic one-way sync of events from PlanSync to Google without two-way merge.",
      envSetup: "Environment setup in `.env`",
      connectionStatus: "Connection status",
      email: "Email",
      defaultCalendar: "Default calendar",
      notConnected: "not connected",
      primarySelected: "primary will be chosen after connection",
      fillEnv: "Fill in `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` in `.env`, then rebuild the backend.",
      disconnect: "Disconnect Google",
      connect: "Connect Google Calendar",
      configured: "configured",
      missingEnv: "missing env",
      connected: "connected",
      notConnectedStatus: "not connected",
    },
    integrations: {
      howItWorks: "How it works",
      steps: [
        "1. You connect Google Calendar only if you need it. Without it, PlanSync still works as a full planner.",
        "2. Sync works only for events and only from PlanSync to Google.",
        "3. After connecting Google, new and updated events sync automatically.",
        "4. If sync fails, the local record stays in the app and the event can be sent again.",
      ],
    },
  },
  ru: {
    common: {
      appName: "PlanSync",
      studentPlanner: "Студенческий планер",
      task: "Задача",
      event: "Событие",
      yes: "Да",
      no: "Нет",
      noDate: "Без даты",
      noTime: "Без времени",
      notSpecified: "Не указано",
      noDescription: "Описание не указано",
      noReminders: "Напоминания не настроены.",
      edit: "Редактировать",
      delete: "Удалить",
      close: "Закрыть",
      cancel: "Отмена",
      create: "Создать",
      saveChanges: "Сохранить изменения",
      createRecord: "Создать запись",
      records: "записей",
      browser: "Browser",
      inApp: "In-app",
      active: "Активно",
      current: "текущий",
      itemTypes: {
        task: "Задача",
        event: "Событие",
      },
      plannerStatus: {
        completed: "Выполнено",
        pending: "В ожидании",
        scheduled: "Запланировано",
      },
      syncStatus: {
        pending: "В ожидании",
        synced: "Синхронизировано",
        failed: "Ошибка",
        deleted: "Удалено",
        not_synced: "Не синхронизировано",
      },
      recurrenceWeekdays: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
    },
    languageToggle: {
      label: "Язык",
      english: "EN",
      russian: "RU",
    },
    auth: {
      loadingWorkspace: "Загружаем пространство PlanSync...",
      profileLoadFailed: "Не удалось загрузить профиль.",
    },
    appShell: {
      navPlanner: "Планер",
      navIntegrations: "Интеграции",
      logout: "Выйти",
      heroTitle: "Единая неделя для задач, событий и быстрых AI-черновиков",
      heroSubtitle: "Manual-first планирование с подтверждением перед сохранением любого AI-разбора.",
    },
    login: {
      heroTitle: "Недельный планер, который не ломает учебный ритм.",
      heroSubtitle:
        "Одна поверхность для задач, событий, повторений, напоминаний и AI-черновиков с обязательным подтверждением перед сохранением.",
      demoLogin: "Demo login",
      signIn: "Вход",
      signInSubtitle: "Войдите, чтобы открыть свою недельную доску.",
      quickTest: "Для быстрого теста можно сразу войти demo-аккаунтом.",
      signInDemo: "Войти в demo-аккаунт",
      signingIn: "Входим...",
      password: "Пароль",
      openPlansync: "Открыть PlanSync",
      noAccount: "Нет аккаунта?",
      register: "Зарегистрироваться",
      emailError: "Введите корректный email",
      passwordError: "Минимум 8 символов",
    },
    register: {
      title: "Создать аккаунт",
      subtitle: "Сразу после регистрации можно войти и начать планировать неделю.",
      demoHint:
        "Demo-аккаунт уже существует: student@example.com / password123. Если хотите создать нового пользователя, введите другой email.",
      name: "Имя",
      password: "Пароль",
      timezone: "Часовой пояс",
      timezoneHint: "Используется IANA-формат, например Europe/Moscow или America/New_York.",
      create: "Зарегистрироваться",
      creating: "Создаём...",
      alreadyHaveAccount: "Уже есть аккаунт?",
      signIn: "Войти",
      nameError: "Минимум 2 символа",
      emailError: "Введите корректный email",
      passwordError: "Минимум 8 символов",
      timezoneError: "Выберите часовой пояс",
    },
    planner: {
      title: "Weekly planner",
      previousWeek: "Предыдущая неделя",
      nextWeek: "Следующая неделя",
      create: "Создать",
      statsTotal: "Всего",
      statsTasks: "Задачи",
      statsEvents: "События",
      statsCompleted: "Выполнено",
      manualFirstTitle: "Manual-first режим",
      manualFirstDescription:
        "Даже если Mistral или Google Calendar не настроены, весь основной flow остаётся доступным: ручное создание, повторения, напоминания и недельный обзор.",
      loadingWeek: "Собираем неделю...",
      googleMissing: "Google Calendar пока не настроен в `.env`, поэтому автоматическая синхронизация событий отключена.",
      googleDisconnected:
        "Google Calendar ещё не подключён для этого аккаунта. После подключения события будут синхронизироваться автоматически.",
      syncErrorSuffix: "Синхронизацию можно повторить прямо на карточке события или в окне деталей.",
      editItem: "Редактировать запись",
      createItem: "Создать запись",
    },
    parsePanel: {
      title: "AI-ввод без автосохранения",
      subtitle:
        "Вставьте задачу или событие свободным текстом. PlanSync создаст только черновик для проверки, а не готовую запись.",
      placeholder: "Например: Встреча с куратором 2026-04-10 18:00, напомнить за 1 день и за 30 минут",
      parsing: "Разбираем...",
      createDraft: "Создать AI-черновик",
      confirmationHint: "После отправки откроется экран подтверждения с предзаполненными полями.",
    },
    aiDraft: {
      mistralActive: (modelName: string) => `Mistral active: ${modelName}`,
      fallbackMode: "Fallback mode",
      type: "Тип",
      undefined: "не определён",
      title: "Заголовок",
      empty: "пусто",
      dateTime: "Дата/время",
      notExtracted: "не извлечено",
      reminders: "Напоминания",
      loading: "Загружаем AI-черновик...",
      loadFailed: "Не удалось загрузить черновик.",
      heading: "Проверьте AI-разбор перед сохранением",
      subtitle:
        "Черновик ещё ничего не сохранил. Если AI ошибся, просто исправьте поля ниже и подтвердите только корректную версию.",
      reject: "Отклонить",
      fallbackWarning: "Использован fallback-разбор, проверьте поля особенно внимательно.",
      sourceText: "Исходный текст",
      warnings: "Предупреждения",
    },
    itemModal: {
      subtitle: "Перед сохранением можно отредактировать даты, повторения и напоминания.",
    },
    itemForm: {
      type: "Тип",
      color: "Цвет",
      title: "Название",
      titlePlaceholder: "Например, Подготовить отчёт по базе данных",
      description: "Описание",
      descriptionPlaceholder: "Контекст, ссылка на материалы, аудитория, детали...",
      start: "Начало",
      end: "Конец",
      due: "Дедлайн",
      allDay: "Весь день",
      reminders: "Напоминания",
      remindersDescription: "Несколько напоминаний на одно событие или задачу.",
      mode: "Режим",
      beforeStart: "До начала",
      exactDate: "Точная дата",
      offsetMinutes: "Смещение, мин",
      triggerMoment: "Момент срабатывания",
      channel: "Канал",
      deleteReminder: "Удалить",
      addReminder: "Добавить напоминание",
      recurrence: "Повторение",
      recurrenceDescription: "Preset-правила без тяжёлого RRULE-интерфейса.",
      repeat: "Повторять",
      frequency: "Частота",
      interval: "Интервал",
      untilDate: "До даты",
      limit: "Лимит повторов",
      dayOfMonth: "День месяца",
      daily: "Ежедневно",
      weekly: "Еженедельно",
      monthly: "Ежемесячно",
      validationTitle: "Введите название",
      validationEventStart: "Для события нужен start_at",
      validationTaskDate: "Для задачи нужна дата начала или дедлайн",
    },
    deleteModal: {
      deleteEventOrSeries: (isEvent: boolean) =>
        `Удалить только это ${isEvent ? "событие" : "вхождение задачи"} или всю серию?`,
      deleteItem: (entityLabel: string) => `Удалить ${entityLabel}?`,
      recurringDescription: "Можно скрыть только выбранное вхождение в PlanSync или удалить всю серию целиком.",
      irreversible: "Это действие нельзя отменить.",
      googleNote: "Удаление одного показа влияет только на PlanSync. Серия в Google Calendar останется без изменений.",
      deleteThisEvent: "Удалить это событие",
      deleteThisOccurrence: "Удалить это вхождение",
      deleteSeries: (label: string) => `Удалить ${label}`,
      eventEntity: "событие",
      taskEntity: "задачу",
      wholeSeries: "всю серию",
    },
    eventDetails: {
      noRecurrence: "Без повторения",
      everyDay: "Каждый день",
      everyNDays: (n: number) => `Каждые ${n} дн.`,
      everyWeek: (days: string) => `Каждую неделю${days ? `: ${days}` : ""}`,
      everyNWeeks: (n: number, days: string) => `Каждые ${n} нед.${days ? `: ${days}` : ""}`,
      everyMonth: (day?: number | null) => `Каждый месяц${day ? `, ${day} числа` : ""}`,
      everyNMonths: (n: number, day?: number | null) => `Каждые ${n} мес.${day ? `, ${day} числа` : ""}`,
      untilDate: (date: string) => `до ${date}`,
      occurrences: (count: number) => `, ${count} повт.`,
      exactDate: (date: string) => `Точная дата: ${date}`,
      daysBefore: (n: number) => `За ${n} дн.`,
      hoursBefore: (n: number) => `За ${n} ч.`,
      minutesBefore: (n: number) => `За ${n} мин.`,
      detailsEventSubtitle: "Здесь показана полная информация о событии. Редактирование и удаление перенесены в это окно.",
      detailsTaskSubtitle: "Здесь показана полная информация о задаче. Редактирование и удаление перенесены в это окно.",
      dateTime: "Дата и время",
      deadline: "Срок",
      end: "Окончание",
      status: "Статус",
      allDay: "Весь день",
      recurrence: "Повторение",
      description: "Описание",
      reminders: "Напоминания",
      recurringEventNote: "Удаление одного показа работает локально в PlanSync и не меняет серию в Google Calendar.",
      recurringTaskNote: "Для повторяющейся записи можно удалить только выбранное вхождение или всю серию целиком.",
      sync: "Синхронизировать",
    },
    weeklyPlanner: {
      nothingPlanned: "Ничего не запланировано.",
      pause: "Пауза без задач и событий.",
      syncEvent: "Синхронизировать событие",
      complete: "Отметить как выполненную",
      uncomplete: "Отметить как невыполненную",
    },
    reminders: {
      title: "Напоминания",
      eventStartsSoon: "Событие скоро начнётся",
      taskNeedsAttention: "Задача требует внимания прямо сейчас",
    },
    google: {
      subtitle: "Автоматическая односторонняя синхронизация событий из PlanSync в Google без двустороннего merge.",
      envSetup: "Настройка в `.env`",
      connectionStatus: "Статус подключения",
      email: "Email",
      defaultCalendar: "Календарь по умолчанию",
      notConnected: "не подключён",
      primarySelected: "primary будет выбран после подключения",
      fillEnv: "Заполните `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` и `GOOGLE_REDIRECT_URI` в `.env`, затем пересоберите backend.",
      disconnect: "Отключить Google",
      connect: "Подключить Google Calendar",
      configured: "configured",
      missingEnv: "missing env",
      connected: "connected",
      notConnectedStatus: "not connected",
    },
    integrations: {
      howItWorks: "Как это работает",
      steps: [
        "1. Вы подключаете Google Calendar только если он нужен. Без него PlanSync остаётся полноценным планером.",
        "2. Синхронизация работает только для событий и только из PlanSync в Google.",
        "3. После подключения Google новые и изменённые события синхронизируются автоматически.",
        "4. Если синк завершится ошибкой, локальная запись останется в приложении, а событие можно будет отправить повторно.",
      ],
    },
  },
} as const;

type I18nContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  messages: (typeof messages)[Language];
  dateLocale: DateFnsLocale;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function getInitialLanguage(): Language {
  if (typeof window === "undefined") return "ru";
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === "en" || saved === "ru") return saved;
  return window.navigator.language.toLowerCase().startsWith("ru") ? "ru" : "en";
}

export function getDateFnsLocale(language: Language): DateFnsLocale {
  return language === "ru" ? ru : enUS;
}

export function LanguageProvider({ children }: PropsWithChildren) {
  const [language, setLanguage] = useState<Language>(getInitialLanguage);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage,
      toggleLanguage: () => setLanguage((current) => (current === "ru" ? "en" : "ru")),
      messages: messages[language],
      dateLocale: getDateFnsLocale(language),
    }),
    [language],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within LanguageProvider");
  }
  return context;
}

export function getItemTypeLabel(language: Language, itemType: "task" | "event") {
  return messages[language].common.itemTypes[itemType];
}

export function getPlannerStatusLabel(language: Language, status?: string | null, completedForOccurrence?: boolean) {
  if (completedForOccurrence || status === "completed") return messages[language].common.plannerStatus.completed;
  if (status === "scheduled") return messages[language].common.plannerStatus.scheduled;
  return messages[language].common.plannerStatus.pending;
}

export function getSyncStatusLabel(language: Language, status?: string | null) {
  if (!status) return messages[language].common.syncStatus.not_synced;
  return messages[language].common.syncStatus[status as keyof (typeof messages.en.common.syncStatus)] ?? status;
}

export function getReminderChannelLabel(language: Language, channel: "in_app" | "browser") {
  return channel === "browser" ? messages[language].common.browser : messages[language].common.inApp;
}
