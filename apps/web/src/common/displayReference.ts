// Internal identifiers remain in API requests and links, never in presentation copy.
const uuidSource =
  "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const uuid = new RegExp(`\\b${uuidSource}\\b`, "i");
const compactUuid = /^[0-9a-f]{32}$/i;
const exactUuid = new RegExp(`^${uuidSource}$`, "i");

export function displayReference(
  value: string | null | undefined,
  fallback: string,
) {
  return value?.trim() && !uuid.test(value) && !compactUuid.test(value.trim())
    ? value
    : fallback;
}

export function displayText(value: string) {
  return value.replace(
    new RegExp(`\\b${uuidSource}\\b`, "gi"),
    "internal reference",
  );
}

/** Produce a display-only copy; preserve the original API data for application logic. */
export function presentRecordDetails(value: unknown): unknown {
  if (typeof value === "string") {
    return exactUuid.test(value.trim()) || compactUuid.test(value.trim())
      ? undefined
      : displayText(value);
  }
  if (Array.isArray(value)) {
    return value.map(presentRecordDetails).filter((item) => item !== undefined);
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).flatMap(([key, item]) => {
        if (!displayReference(key, "")) return [];
        const detail = presentRecordDetails(item);
        return detail === undefined ? [] : [[key, detail]];
      }),
    );
  }
  return value;
}
