import { describe, expect, it } from 'vitest';
import { compareInspections, defaultRooms, DEFAULT_ROOMS } from '../utils/inspections.js';

const report = (rooms) => ({
  rooms: Object.entries(rooms).map(([name, items]) => ({
    name,
    items: Object.entries(items).map(([item, condition]) => ({ name: item, condition, note: '' })),
  })),
});

describe('defaultRooms', () => {
  it('starts every item in good condition', () => {
    const rooms = defaultRooms();
    expect(rooms.map((r) => r.name)).toEqual(DEFAULT_ROOMS.map((r) => r.name));
    expect(rooms.flatMap((r) => r.items).every((i) => i.condition === 'good' && i.note === '')).toBe(true);
  });

  it('returns a fresh copy each time', () => {
    const first = defaultRooms();
    first[0].items[0].condition = 'damaged';
    expect(defaultRooms()[0].items[0].condition).toBe('good');
  });
});

describe('compareInspections', () => {
  it('flags items that got worse or better', () => {
    const moveIn = report({ Kitchen: { Floor: 'good', Sink: 'poor', Oven: 'fair' } });
    const moveOut = report({ Kitchen: { Floor: 'damaged', Sink: 'good', Oven: 'fair' } });

    const { rows, totals } = compareInspections(moveIn, moveOut);

    expect(rows).toEqual([
      { room: 'Kitchen', item: 'Floor', before: 'good', after: 'damaged', note: '', change: 'worse' },
      { room: 'Kitchen', item: 'Sink', before: 'poor', after: 'good', note: '', change: 'better' },
      { room: 'Kitchen', item: 'Oven', before: 'fair', after: 'fair', note: '', change: 'same' },
    ]);
    expect(totals).toEqual({ worse: 1, better: 1, same: 1, new: 0, unrated: 0 });
  });

  it('matches rooms and items regardless of case and spacing', () => {
    const moveIn = report({ Kitchen: { Floor: 'good' } });
    const moveOut = report({ ' kitchen ': { 'FLOOR ': 'poor' } });

    expect(compareInspections(moveIn, moveOut).rows[0]).toMatchObject({ before: 'good', change: 'worse' });
  });

  it('marks items missing from the move-in report as new', () => {
    const moveIn = report({ Kitchen: { Floor: 'good' } });
    const moveOut = report({ Garden: { Fence: 'poor' } });

    expect(compareInspections(moveIn, moveOut).rows[0]).toMatchObject({ before: null, change: 'new' });
  });

  it("doesn't compare items rated not applicable", () => {
    const moveIn = report({ Bathroom: { Bath: 'na' } });
    const moveOut = report({ Bathroom: { Bath: 'damaged' } });

    expect(compareInspections(moveIn, moveOut).totals.unrated).toBe(1);
  });
});
