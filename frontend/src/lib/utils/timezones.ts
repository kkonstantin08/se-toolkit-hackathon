const intlWithSupportedValues = Intl as typeof Intl & {
  supportedValuesOf?: (key: "timeZone") => string[];
};

const fallbackTimezones = [
  "UTC",
  "Europe/Moscow",
  "Europe/Berlin",
  "Europe/London",
  "Asia/Tokyo",
  "Asia/Dubai",
  "Asia/Almaty",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
];

export function getTimezoneOptions(): string[] {
  const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const supportedTimezones = intlWithSupportedValues.supportedValuesOf?.("timeZone") ?? fallbackTimezones;
  const merged = [detectedTimezone, ...supportedTimezones];

  return Array.from(new Set(merged)).sort((left, right) => {
    if (left === detectedTimezone) return -1;
    if (right === detectedTimezone) return 1;
    return left.localeCompare(right);
  });
}

