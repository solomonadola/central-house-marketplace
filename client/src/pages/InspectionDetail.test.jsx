import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useParams } from 'react-router-dom';
import InspectionDetail from './InspectionDetail';
import { renderWithProviders } from '../test/utils';

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), { status });

const inspection = (overrides = {}) => ({
  _id: 'insp1',
  lease: 'lease1',
  kind: 'move_in',
  status: 'draft',
  updatedAt: '2026-10-01T10:00:00.000Z',
  summary: '',
  dispute: '',
  signedAt: null,
  listing: { name: 'Harbour Loft' },
  owner: { username: 'owner_olga' },
  tenant: { username: 'tenant_tim' },
  rooms: [
    {
      name: 'Kitchen',
      items: [
        { name: 'Floor', condition: 'good', note: '' },
        { name: 'Oven', condition: 'poor', note: 'Door hinge loose' },
      ],
    },
  ],
  ...overrides,
});

const view = (role, overrides, extra = {}) => ({ inspection: inspection(overrides), comparison: null, viewer: { role }, ...extra });

const Lease = () => <p>Lease {useParams().leaseId}</p>;

const renderPage = () =>
  renderWithProviders(
    <Routes>
      <Route path='/inspections/:inspectionId' element={<InspectionDetail />} />
      <Route path='/leases/:leaseId' element={<Lease />} />
    </Routes>,
    { route: '/inspections/insp1', currentUser: { _id: 'me' } }
  );

const lastWrite = (fetchMock) => fetchMock.mock.calls.filter(([, o]) => o?.method).at(-1);

describe('Inspection page', () => {
  let fetchMock;
  let current;
  let afterWrite;

  beforeEach(() => {
    current = view('owner');
    afterWrite = null;
    fetchMock = vi.fn(async (url, options) => jsonResponse(options?.method ? afterWrite ?? current : current));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('lets the owner edit conditions and notes and save the draft', async () => {
    renderPage();

    const condition = await screen.findByLabelText('Kitchen: Floor condition');
    expect(screen.getByText('1 good · 0 fair · 1 poor · 0 damaged')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Saved' })).toBeDisabled();

    await userEvent.selectOptions(condition, 'damaged');
    await userEvent.type(screen.getByLabelText('Kitchen: Floor note'), 'Scratched');
    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    const [url, options] = lastWrite(fetchMock);
    expect(url).toBe('/api/inspections/insp1');
    expect(options.method).toBe('PATCH');
    expect(JSON.parse(options.body).rooms[0].items[0]).toEqual({ name: 'Floor', condition: 'damaged', note: 'Scratched' });
  });

  it('adds and removes rooms and items', async () => {
    renderPage();
    await screen.findByLabelText('Room 1 name');

    await userEvent.click(screen.getByRole('button', { name: 'Add item' }));
    await userEvent.type(screen.getByLabelText('Kitchen item 3'), 'Fridge');
    await userEvent.click(screen.getByRole('button', { name: 'Remove Oven from Kitchen' }));
    await userEvent.click(screen.getByRole('button', { name: 'Add room' }));
    await userEvent.type(screen.getByLabelText('Room 2 name'), 'Garden');
    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    const rooms = JSON.parse(lastWrite(fetchMock)[1].body).rooms;
    expect(rooms).toEqual([
      {
        name: 'Kitchen',
        items: [
          { name: 'Floor', condition: 'good', note: '' },
          { name: 'Fridge', condition: 'good', note: '' },
        ],
      },
      { name: 'Garden', items: [] },
    ]);

    await userEvent.click(screen.getByRole('button', { name: 'Remove Garden' }));
    expect(screen.queryByLabelText('Room 2 name')).not.toBeInTheDocument();
  });

  it('saves unsaved changes before sending to the tenant', async () => {
    afterWrite = view('owner', { status: 'submitted' });
    renderPage();

    await userEvent.type(await screen.findByLabelText('Kitchen: Oven note'), ', replaced');
    await userEvent.click(screen.getByRole('button', { name: 'Send to tenant' }));

    const writes = fetchMock.mock.calls.filter(([, o]) => o?.method);
    expect(writes.map(([url, o]) => `${o.method} ${url}`)).toEqual([
      'PATCH /api/inspections/insp1',
      'POST /api/inspections/insp1/submit',
    ]);
    expect(await screen.findByText('Waiting for tenant')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send to tenant' })).not.toBeInTheDocument();
  });

  it('deletes a draft and goes back to the lease', async () => {
    afterWrite = { deleted: true };
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Delete draft' }));

    expect(await screen.findByText('Lease lease1')).toBeInTheDocument();
    expect(lastWrite(fetchMock)[1].method).toBe('DELETE');
  });

  it('shows the tenant a read-only report to sign', async () => {
    current = view('tenant', { status: 'submitted' });
    afterWrite = view('tenant', { status: 'signed', signedAt: '2026-10-02T00:00:00.000Z' });
    renderPage();

    const kitchen = await screen.findByRole('region', { name: 'Kitchen' });
    expect(within(kitchen).getByText('Poor')).toBeInTheDocument();
    expect(within(kitchen).getByText('Door hinge loose')).toBeInTheDocument();
    expect(screen.queryByLabelText('Room 1 name')).not.toBeInTheDocument();
    expect(screen.getByText(/Owner: owner_olga/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Sign report' }));

    expect(lastWrite(fetchMock)[0]).toBe('/api/inspections/insp1/sign');
    expect(await screen.findByText('Signed')).toBeInTheDocument();
    expect(screen.getByText(/Signed Oct 2, 2026/)).toBeInTheDocument();
  });

  it('lets the tenant dispute with a reason', async () => {
    current = view('tenant', { status: 'submitted' });
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Dispute' }));
    const send = screen.getByRole('button', { name: 'Send dispute' });
    expect(send).toBeDisabled();
    await userEvent.type(screen.getByLabelText('What is wrong with the report?'), 'The oven was already broken.');
    await userEvent.click(send);

    const [url, options] = lastWrite(fetchMock);
    expect(url).toBe('/api/inspections/insp1/dispute');
    expect(JSON.parse(options.body)).toEqual({ reason: 'The oven was already broken.' });
  });

  it("shows the owner the tenant's dispute next to the editor", async () => {
    current = view('owner', { status: 'disputed', dispute: 'The oven was already broken.' });
    renderPage();

    expect(await screen.findByText('The oven was already broken.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send to tenant' })).toBeInTheDocument();
  });

  it('compares a move-out report with move-in', async () => {
    current = view(
      'tenant',
      { kind: 'move_out', status: 'submitted' },
      {
        comparison: {
          totals: { worse: 1, better: 0, same: 1, new: 1, unrated: 0 },
          rows: [
            { room: 'Kitchen', item: 'Floor', before: 'good', after: 'damaged', change: 'worse' },
            { room: 'Kitchen', item: 'Oven', before: 'poor', after: 'poor', change: 'same' },
            { room: 'Garden', item: 'Fence', before: null, after: 'fair', change: 'new' },
          ],
        },
      }
    );
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Move-out report' })).toBeInTheDocument();
    expect(screen.getByText('1 worse · 0 better · 1 unchanged · 1 not in the move-in report')).toBeInTheDocument();
    expect(screen.getByText('Good → Damaged (Worse)')).toBeInTheDocument();
    expect(screen.getByText('Fair (Not in move-in report)')).toBeInTheDocument();
    expect(screen.queryByText('Kitchen: Oven')).not.toBeInTheDocument();
  });

  it('shows errors from the server', async () => {
    afterWrite = { success: false, message: 'Add at least one item before sending the report.' };
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Send to tenant' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Add at least one item before sending the report.');
  });

  it('shows a not-found message', async () => {
    current = { success: false, message: 'Inspection not found!' };
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Report not found' })).toBeInTheDocument();
  });
});
