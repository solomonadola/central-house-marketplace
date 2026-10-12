import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DownloadMyData from './DownloadMyData';
import { downloadCsv } from '../utils/downloadCsv';

vi.mock('../utils/downloadCsv', () => ({ downloadCsv: vi.fn() }));

describe('DownloadMyData', () => {
  afterEach(() => vi.mocked(downloadCsv).mockReset());

  it('downloads the export', async () => {
    vi.mocked(downloadCsv).mockResolvedValue('central-house-data-2026-10-12.json');
    render(<DownloadMyData />);

    await userEvent.click(screen.getByRole('button', { name: /Download my data/ }));

    expect(downloadCsv).toHaveBeenCalledWith('/api/user/export', 'central-house-data.json');
    expect(screen.queryByText(/Could not prepare/)).not.toBeInTheDocument();
  });

  it('shows an error when the export fails', async () => {
    vi.mocked(downloadCsv).mockRejectedValue(new Error('Export failed'));
    render(<DownloadMyData />);

    await userEvent.click(screen.getByRole('button', { name: /Download my data/ }));

    expect(await screen.findByText(/Could not prepare your data/)).toBeInTheDocument();
  });
});
