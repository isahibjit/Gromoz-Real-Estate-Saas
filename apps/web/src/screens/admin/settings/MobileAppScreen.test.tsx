import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { MobileAppScreen } from './MobileAppScreen';
import { api } from '../../../common/api';
import { useAppSelector } from '../../../store';

jest.mock('../../../common/api', () => ({ api: { get: jest.fn(), post: jest.fn() } }));
jest.mock('../../../store', () => ({ useAppSelector: jest.fn() }));
const get = jest.mocked(api.get);
const selector = jest.mocked(useAppSelector);
function mount(role: string) {
  selector.mockReturnValue({ role });
  return render(<MemoryRouter><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MobileAppScreen /></QueryClientProvider></MemoryRouter>);
}
beforeEach(() => {
  jest.clearAllMocks();
  get.mockResolvedValue({ data: { data: [], currentRelease: null, meta: { total: 0 } } });
});
test('tenant admins cannot see upload controls or fetch release history', () => {
  mount('ADMIN');
  expect(screen.getByRole('alert')).toHaveTextContent('platform super administrators');
  expect(screen.queryByRole('button', { name: 'Upload APK' })).not.toBeInTheDocument();
  expect(get).not.toHaveBeenCalled();
});
test('platform super admins can open the existing release upload form', async () => {
  mount('SUPER_ADMIN');
  expect(await screen.findByRole('button', { name: 'Upload APK' })).toBeEnabled();
  expect(get).toHaveBeenCalledWith('/mobile-app/releases', expect.any(Object));
});
