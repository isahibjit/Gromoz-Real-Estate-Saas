import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LeadCell } from './DataTableCells';

const id = '2fa1d240-da15-410c-9bd7-3da88d16afe1';
test('hides a raw lead identifier while preserving the detail link', () => {
  render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><LeadCell id={id} name="Buyer" phone="1234567890" /></MemoryRouter>);
  expect(screen.getByRole('link', { name: 'Buyer' })).toHaveAttribute('href', `/leads/${id}`);
  expect(document.body.textContent).not.toContain(id.slice(0, 8));
});

test('shows an existing business reference code', () => {
  render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><LeadCell id={id} displayId="TR-1042" name="Buyer" /></MemoryRouter>);
  expect(screen.getByText('#TR-1042')).toBeInTheDocument();
});
