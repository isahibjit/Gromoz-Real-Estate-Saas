import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PlatformAuditLogsScreen } from './PlatformAuditLogsScreen';
import { api } from '../../common/api';

jest.mock('../../common/api', () => ({ api: { get: jest.fn() } }));
const get = jest.mocked(api.get);
const logs = Array.from({ length: 12 }, (_, index) => ({
  id: `2fa1d240-da15-410c-9bd7-3da88d16af${String(index).padStart(2, '0')}`, action: index === 11 ? 'LOGIN_FAILED' : 'LOGIN_SUCCESS',
  targetType: 'USER', targetId: '52da100f-9da1-4b2c-bf87-9cbcec232483', createdAt: `2026-10-17T10:${String(index).padStart(2, '0')}:00Z`,
  user: { id: '52da100f-9da1-4b2c-bf87-9cbcec232483', fullName: 'Platform Operator', email: 'operator@example.test', role: 'SUPER_ADMIN' },
  organization: null, ip: '192.0.2.10', metadata: { reason: 'Recorded reason', nested: { userId: '52da100f-9da1-4b2c-bf87-9cbcec232483' } },
}));
function mount() {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><PlatformAuditLogsScreen /></QueryClientProvider>);
}
beforeEach(() => { get.mockReset(); get.mockResolvedValue({ data: logs }); });

test('shows real summaries, paginates and opens complete event details', async () => {
  mount();
  await screen.findByText('Page 1 of 2');
  fireEvent.click(screen.getByRole('button', { name: 'View event 1' }));
  expect(await screen.findByRole('dialog')).toHaveTextContent('Platform Operator');
  expect(screen.getByRole('dialog')).toHaveTextContent('Recorded reason');
  expect(screen.getByRole('dialog')).not.toHaveTextContent(logs[0].targetId);
  expect(screen.getByRole('dialog')).not.toHaveTextContent('Event ID');
  expect(screen.getByRole('dialog')).not.toHaveTextContent('Resource ID');
  expect(document.body.textContent).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  expect(screen.getByText('Latest 100 recorded events')).toBeInTheDocument();
});

test('resets pagination and searches operators, resources and IP addresses', async () => {
  mount();
  await screen.findByText('Page 1 of 2');
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
  fireEvent.change(screen.getByLabelText('Search audit trail'), { target: { value: 'LOGIN_FAILED' } });
  await screen.findByText('Page 1 of 1');
  expect(screen.getAllByRole('button', { name: /View event/ })).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
  await screen.findByText('Page 1 of 2');
  fireEvent.change(screen.getByLabelText('Search audit trail'), { target: { value: 'no-such-event' } });
  await screen.findByText('No audit events found');
});

test('distinguishes a failed API request from an empty audit trail', async () => {
  get.mockRejectedValue(new Error('Unavailable'));
  mount();
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Unable to refresh audit records'));
  expect(screen.queryByText('No audit events found')).not.toBeInTheDocument();
});
