import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BlockUserButton from './BlockUserButton';

const stub = (initial) => {
  let blocked = initial;
  const fetchMock = vi.fn(async (url, options) => {
    if (options?.method === 'PUT') blocked = true;
    if (options?.method === 'DELETE') blocked = false;
    return new Response(JSON.stringify({ blocked }));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

describe('BlockUserButton', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('blocks after confirming and reports the change', async () => {
    const fetchMock = stub(false);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const onChange = vi.fn();
    render(<BlockUserButton userId='u9' username='pest_user' onChange={onChange} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Block' }));

    expect(window.confirm).toHaveBeenCalledWith('Block pest_user? Neither of you will be able to message the other.');
    expect(fetchMock).toHaveBeenCalledWith('/api/user/blocks/u9', { method: 'PUT' });
    expect(await screen.findByRole('button', { name: 'Unblock' })).toBeInTheDocument();
    expect(onChange).toHaveBeenLastCalledWith(true);
  });

  it('does nothing if the user cancels', async () => {
    const fetchMock = stub(false);
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<BlockUserButton userId='u9' username='pest_user' />);

    await userEvent.click(await screen.findByRole('button', { name: 'Block' }));

    expect(fetchMock).not.toHaveBeenCalledWith('/api/user/blocks/u9', { method: 'PUT' });
  });

  it('unblocks without asking', async () => {
    const fetchMock = stub(true);
    render(<BlockUserButton userId='u9' username='pest_user' />);

    await userEvent.click(await screen.findByRole('button', { name: 'Unblock' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/user/blocks/u9', { method: 'DELETE' }));
  });
});
