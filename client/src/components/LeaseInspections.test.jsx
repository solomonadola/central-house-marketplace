import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useParams } from 'react-router-dom';
import LeaseInspections from './LeaseInspections';
import { renderWithProviders } from '../test/utils';

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), { status });

const Inspection = () => <p>Inspection {useParams().inspectionId}</p>;

const renderSection = (isOwner) =>
  renderWithProviders(
    <Routes>
      <Route path='/' element={<LeaseInspections leaseId='lease1' isOwner={isOwner} />} />
      <Route path='/inspections/:inspectionId' element={<Inspection />} />
    </Routes>,
    { currentUser: { _id: 'me' } }
  );

describe('LeaseInspections', () => {
  let fetchMock;
  let list;
  let created;

  beforeEach(() => {
    list = [];
    created = { inspection: { _id: 'new-insp' } };
    fetchMock = vi.fn(async (url, options) => jsonResponse(options?.method === 'POST' ? created : list));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('lists the reports with their status', async () => {
    list = [
      { _id: 'i1', kind: 'move_in', status: 'signed', signedAt: '2026-07-02T00:00:00.000Z' },
      { _id: 'i2', kind: 'move_out', status: 'disputed' },
    ];
    renderSection(false);

    const moveIn = await screen.findByRole('link', { name: /Move-in report/ });
    expect(moveIn).toHaveAttribute('href', '/inspections/i1');
    expect(within(moveIn).getByText('Signed Jul 2, 2026')).toBeInTheDocument();
    expect(within(screen.getByRole('link', { name: /Move-out report/ })).getByText('Disputed')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/inspections?leaseId=lease1', undefined);
  });

  it('tells tenants when there is nothing yet', async () => {
    renderSection(false);

    expect(await screen.findByText("Your landlord hasn't sent you a report yet.")).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('lets owners start the reports that are missing', async () => {
    list = [{ _id: 'i1', kind: 'move_in', status: 'signed' }];
    renderSection(true);

    await userEvent.click(await screen.findByRole('button', { name: 'Start move-out report' }));

    expect(screen.queryByRole('button', { name: 'Start move-in report' })).not.toBeInTheDocument();
    expect(await screen.findByText('Inspection new-insp')).toBeInTheDocument();
    const [, options] = fetchMock.mock.calls.find(([, o]) => o?.method === 'POST');
    expect(JSON.parse(options.body)).toEqual({ leaseId: 'lease1', kind: 'move_out' });
  });

  it('shows why a report could not be started', async () => {
    created = { success: false, message: 'This lease already has a move-in report.' };
    renderSection(true);

    await userEvent.click(await screen.findByRole('button', { name: 'Start move-in report' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('This lease already has a move-in report.');
  });
});
