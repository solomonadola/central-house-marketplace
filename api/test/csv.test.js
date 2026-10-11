import { describe, expect, it } from 'vitest';
import { toCsv } from '../utils/csv.js';

const columns = [
  { label: 'Name', value: (r) => r.name },
  { label: 'Note', value: (r) => r.note },
];

describe('toCsv', () => {
  it('writes a header row and one row per record', () => {
    const csv = toCsv(columns, [
      { name: 'Ada', note: 'hi' },
      { name: 'Bob', note: 'yo' },
    ]);
    expect(csv).toBe('Name,Note\nAda,hi\nBob,yo\n');
  });

  it('quotes and escapes values containing commas, quotes or newlines', () => {
    const csv = toCsv(columns, [{ name: 'Smith, John', note: 'He said "hi"\nand left' }]);
    expect(csv).toContain('"Smith, John"');
    expect(csv).toContain('"He said ""hi""\nand left"');
  });

  it('renders missing values as empty', () => {
    expect(toCsv(columns, [{ name: 'Ada' }])).toBe('Name,Note\nAda,\n');
  });
});
