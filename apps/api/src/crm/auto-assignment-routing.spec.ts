import { BadRequestException } from '@nestjs/common';
import {
  normalizeAutoAssignmentRoute,
  validateRotationCount,
  nextAutoAssignmentPosition,
  readAutoAssignmentSnapshot,
} from './auto-assignment-routing';

describe('Auto assignment rotation', () => {
  it.each([1, 2, 3, 2147483647])('accepts integer count %s', (value) =>
    expect(validateRotationCount(value)).toBe(value),
  );
  it.each([null, 0, -1, 1.5, '2', NaN, Infinity, 2147483648])(
    'rejects invalid count %s',
    (value) =>
      expect(() => validateRotationCount(value)).toThrow(BadRequestException),
  );
  it('keeps the initial user once and preserves distinct-user order', () =>
    expect(
      normalizeAutoAssignmentRoute('u1', ['u1', 'u2', 'u2', 'u3']),
    ).toEqual(['u1', 'u2', 'u3']));
  it.each([1, 2, 3])('runs exactly %s complete passes', (rotationCount) => {
    const snapshot = {
      userIds: ['u1', 'u2', 'u3'],
      rotationCount,
      transferTimeMinutes: 1,
    };
    let position = { currentCycle: 1, currentStep: 0 };
    const visited = ['u1'];
    for (;;) {
      const next = nextAutoAssignmentPosition(
        snapshot,
        position.currentStep,
        position.currentCycle,
      );
      if (!next) break;
      position = next;
      visited.push(snapshot.userIds[position.currentStep]);
    }
    expect(visited).toEqual(
      Array.from({ length: rotationCount }).flatMap(() => snapshot.userIds),
    );
    expect(position).toEqual({ currentCycle: rotationCount, currentStep: 2 });
  });
  it('safely reads persisted snapshots and rejects malformed settings', () => {
    expect(
      readAutoAssignmentSnapshot({
        userIds: ['u1'],
        rotationCount: 1,
        transferTimeMinutes: 2,
      }),
    ).not.toBeNull();
    expect(
      readAutoAssignmentSnapshot({
        userIds: [],
        rotationCount: 1,
        transferTimeMinutes: 2,
      }),
    ).toBeNull();
    expect(readAutoAssignmentSnapshot(null)).toBeNull();
  });
});
