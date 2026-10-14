export const HIDDEN_LEAD_SOURCE = 'Source Unknown';

/** Presentation-only fields. Never apply these to the stored lead or routing input. */
export function leadSourceVisibilityFields(canViewSource: boolean) {
  return {
    canViewSource,
    ...(!canViewSource
      ? {
          sourceId: null,
          sourceName: HIDDEN_LEAD_SOURCE,
          integrationConnectionId: null,
          integrationConnection: null,
          integrationAccountName: HIDDEN_LEAD_SOURCE,
          integrationProvider: null,
        }
      : {}),
  };
}

const sourceMetadataKeys = new Set([
  'source',
  'sourceId',
  'sourceName',
  'leadSource',
  'leadSourceId',
  'statusScoreSourceId',
  'integrationConnection',
  'integrationConnectionId',
  'integrationAccountName',
  'integrationProvider',
]);

function redactSourceMetadata(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSourceMetadata);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !sourceMetadataKeys.has(key))
        .map(([key, item]) => [key, redactSourceMetadata(item)]),
    );
  }
  return value;
}

export function leadActivitySourceVisibility<
  T extends { type?: unknown; metadata?: unknown },
>(activity: T, canViewSource: boolean) {
  if (canViewSource) return activity;
  return {
    ...activity,
    metadata: redactSourceMetadata(activity.metadata),
    ...(activity.type === 'LEAD_SOURCE_UPDATED'
      ? { description: 'Lead source updated' }
      : {}),
  };
}
