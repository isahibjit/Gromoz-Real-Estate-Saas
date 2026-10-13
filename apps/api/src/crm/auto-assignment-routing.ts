import { BadRequestException } from '@nestjs/common';

export interface AutoAssignmentSnapshot {
  userIds: string[];
  rotationCount: number;
  transferTimeMinutes: number;
}

export function validateRotationCount(value: unknown): number {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > 2147483647
  ) {
    throw new BadRequestException(
      'Lead rotation count must be a positive whole number between 1 and 2147483647',
    );
  }
  return value;
}

export function normalizeAutoAssignmentRoute(
  initialUserId: unknown,
  sequence: readonly string[],
): string[] {
  const initial = typeof initialUserId === 'string' ? initialUserId.trim() : '';
  return [
    ...new Set([initial, ...sequence.map((id) => id.trim())].filter(Boolean)),
  ];
}

export function readAutoAssignmentSnapshot(
  value: unknown,
): AutoAssignmentSnapshot | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const snapshot = value as Record<string, unknown>;
  if (
    !Array.isArray(snapshot.userIds) ||
    !snapshot.userIds.length ||
    !snapshot.userIds.every(
      (id): id is string => typeof id === 'string' && Boolean(id),
    ) ||
    typeof snapshot.rotationCount !== 'number' ||
    !Number.isInteger(snapshot.rotationCount) ||
    snapshot.rotationCount < 1 ||
    typeof snapshot.transferTimeMinutes !== 'number' ||
    !Number.isInteger(snapshot.transferTimeMinutes) ||
    snapshot.transferTimeMinutes < 1
  )
    return null;
  return {
    userIds: snapshot.userIds,
    rotationCount: snapshot.rotationCount,
    transferTimeMinutes: snapshot.transferTimeMinutes,
  };
}

export function nextAutoAssignmentPosition(
  snapshot: AutoAssignmentSnapshot,
  currentStep: number,
  currentCycle: number,
) {
  if (currentStep + 1 < snapshot.userIds.length)
    return { currentStep: currentStep + 1, currentCycle };
  if (currentCycle < snapshot.rotationCount)
    return { currentStep: 0, currentCycle: currentCycle + 1 };
  return null;
}
