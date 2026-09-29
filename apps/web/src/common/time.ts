export const formatDateInputValue = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const wallClockPattern =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?$/;

const parseValidDate = (value?: string | Date | null) => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const parseScheduledDateTime = (value?: string | Date | null) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const matched = String(value).match(wallClockPattern);
  if (matched) {
    return new Date(
      Number(matched[1]),
      Number(matched[2]) - 1,
      Number(matched[3]),
      Number(matched[4] ?? "0"),
      Number(matched[5] ?? "0"),
      Number(matched[6] ?? "0"),
    );
  }

  return parseValidDate(value);
};

export const minutesToPickerTime = (totalMinutes: number) => {
  const normalizedMinutes = ((Math.trunc(totalMinutes) % 1440) + 1440) % 1440;
  const rawHour = Math.floor(normalizedMinutes / 60);
  const minute = normalizedMinutes % 60;
  const period = rawHour >= 12 ? "PM" : "AM";
  const hour12 = rawHour % 12 === 0 ? 12 : rawHour % 12;
  return `${String(hour12).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${period}`;
};

export const pickerTimeToMinutes = (value: string) => {
  const match = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match) {
    let hour = Number(match[1]) % 12;
    const minute = Number(match[2]);
    if (match[3].toUpperCase() === "PM") {
      hour += 12;
    }
    return hour * 60 + minute;
  }

  const [hour, minute] = value.split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return 0;
  }
  return hour * 60 + minute;
};

export const pickerTimeToTwentyFourHour = (
  value: string,
  fallback = "10:00",
) => {
  const match = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) {
    return value || fallback;
  }

  const hour = Number(match[1]);
  const minute = match[2];
  const period = match[3].toUpperCase();
  const normalizedHour =
    period === "AM" ? (hour === 12 ? 0 : hour) : hour === 12 ? 12 : hour + 12;

  return `${normalizedHour.toString().padStart(2, "0")}:${minute}`;
};

export const scheduledValueToDateInput = (value?: string | Date | null) => {
  const date = parseScheduledDateTime(value);
  return date ? formatDateInputValue(date) : "";
};

// Send an instant, not a wall-clock string that the API interprets in its own timezone.
export const scheduledInputToIso = (dateValue: string, timeValue: string) => {
  const time = pickerTimeToTwentyFourHour(timeValue, "");
  const date = parseScheduledDateTime(`${dateValue}T${time}`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(dateValue) ||
    !/^\d{2}:\d{2}$/.test(time) ||
    !date ||
    formatDateInputValue(date) !== dateValue ||
    date.getHours() !== Number(time.slice(0, 2)) ||
    date.getMinutes() !== Number(time.slice(3, 5))
  ) {
    throw new Error("Select a valid follow-up date and time");
  }
  return date.toISOString();
};

export const scheduledValueToPickerTime = (value?: string | Date | null) => {
  const date = parseScheduledDateTime(value);
  return date ? minutesToPickerTime(date.getHours() * 60 + date.getMinutes()) : "";
};

export const formatDateForDisplay = (
  value?: string | Date | null,
  locale = "en-IN",
) => {
  const date = parseScheduledDateTime(value);
  if (!date) {
    return "-";
  }
  return date.toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const formatTimeForDisplay = (value?: string | Date | null) => {
  const date = parseScheduledDateTime(value);
  if (!date) {
    return "-";
  }
  return minutesToPickerTime(date.getHours() * 60 + date.getMinutes());
};
