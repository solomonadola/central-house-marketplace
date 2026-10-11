import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadCsv } from './downloadCsv';

describe('downloadCsv', () => {
  let clickSpy;

  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:mock');
    URL.revokeObjectURL = vi.fn();
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('downloads using the filename from the response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        return new Response('a,b\n1,2\n', {
          headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="report.csv"' },
        });
      })
    );

    const name = await downloadCsv('/api/thing/export');

    expect(name).toBe('report.csv');
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock');
  });

  it('falls back to a default filename', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('a,b\n', { headers: { 'Content-Type': 'text/csv' } }))
    );

    expect(await downloadCsv('/api/thing/export', 'fallback.csv')).toBe('fallback.csv');
  });

  it('throws when the export fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 500 })));

    await expect(downloadCsv('/api/thing/export')).rejects.toThrow('Export failed');
  });
});
