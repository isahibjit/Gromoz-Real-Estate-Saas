import { getApiErrorMessage } from './apiError';

test('keeps the useful server error without exposing its internal UUID', () => {
  expect(getApiErrorMessage({ response: { data: { message: 'Lead 2fa1d240-da15-410c-9bd7-3da88d16afe1 was not found' } } }, 'Unable to load lead')).toBe('Lead internal reference was not found');
});

test('preserves geofence guidance and fallback errors', () => {
  expect(getApiErrorMessage({ response: { data: { message: 'You are outside the project geofence', remainingM: 32, radiusM: 100 } } }, 'Unable to check in')).toContain('Move 32m closer. Allowed radius: 100m.');
  expect(getApiErrorMessage(null, 'Unable to load lead')).toBe('Unable to load lead');
});
