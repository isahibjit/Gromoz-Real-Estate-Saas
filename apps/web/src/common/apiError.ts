import { displayText } from "./displayReference";
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function formatMeters(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? `${Math.max(0, Math.round(value))}m`
    : null;
}

function rawApiErrorMessage(error: unknown, fallback: string) {
  if (isRecord(error)) {
    const response = error.response;
    if (isRecord(response)) {
      const data = response.data;
      if (typeof data === "string" && data.trim()) {
        return data;
      }

      if (isRecord(data)) {
        const message = data.message;
        if (Array.isArray(message)) {
          const messages = message.filter(
            (item): item is string => typeof item === "string" && item.trim().length > 0,
          );
          if (messages.length) return messages.join(", ");
        }

        if (typeof message === "string" && message.trim()) {
          if (message === "You are outside the project geofence") {
            const remaining = formatMeters(data.remainingM);
            const radius = formatMeters(data.radiusM);
            if (remaining && radius) {
              return `${message}. Move ${remaining} closer. Allowed radius: ${radius}.`;
            }
          }
          return message;
        }

        if (isRecord(message) && typeof message.message === "string" && message.message.trim()) {
          return message.message;
        }

        if (typeof data.error === "string" && data.error.trim()) {
          return data.error;
        }
      }
    }

    if (typeof error.message === "string" && error.message.trim()) {
      return error.message;
    }
  }

  return fallback;
}

export function getApiErrorMessage(error: unknown, fallback: string) {
  return displayText(rawApiErrorMessage(error, fallback));
}
