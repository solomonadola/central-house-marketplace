import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminAuditLog from './AdminAuditLog';
import { renderWithProviders } from '../../test/utils';

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const entry = (overrides = {}) => ({
  _id: 'e1',
  action: 'hide_listing',
  targetType: 'listing',
  targetId: 'l1',
  targetLabel: 'Sunny Loft',
  reason: 'Inaccurate address',
  actor: { _id: 'a1', username: 'admin-jane' },
  createdAt: new Date().toISOString(),
  ...overrides,
});

describe('AdminAuditLog', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn(async (url) => {
      if (url.startsWith('/api/admin/audit')) return jsonResponse([entry()]);
      return jsonResponse({ success: false }, 404);
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('lists audit entries with the actor and reason', async () => {
    renderWithProviders(<AdminAuditLog />, { currentUser: { _id: 'a1', role: 'admin' } });

    expect(await screen.findByText('Hid listing')).toBeInTheDocument();
    expect(screen.getByText('Sunny Loft')).toBeInTheDocument();
    expect(screen.getByText(/admin-jane/)).toBeInTheDocument();
    expect(screen.getByText(/Inaccurate address/)).toBeInTheDocument();
  });

  it('links a listing target to its page', async () => {
    renderWithProviders(<AdminAuditLog />, { currentUser: { _id: 'a1', role: 'admin' } });

    expect(await screen.findByRole('link', { name: 'Sunny Loft' })).toHaveAttribute('href', '/listing/l1');
  });

  it('refetches when the action filter changes', async () => {
    renderWithProviders(<AdminAuditLog />, { currentUser: { _id: 'a1', role: 'admin' } });
    await screen.findByText('Hid listing');

    await userEvent.selectOptions(screen.getByLabelText(/Action/), 'suspend_user');

    expect(fetchMock.mock.calls.map(([url]) => url)).toContain('/api/admin/audit?action=suspend_user');
  });

  it('shows an empty state', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));
    renderWithProviders(<AdminAuditLog />, { currentUser: { _id: 'a1', role: 'admin' } });

    expect(await screen.findByText('No admin actions recorded yet.')).toBeInTheDocument();
  });
});
