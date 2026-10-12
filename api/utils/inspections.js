// Condition reports for the start and end of a lease, and the comparison
// between them that settles what a tenant is responsible for.

// Best to worst. 'na' (not applicable) is left out of comparisons.
export const CONDITIONS = ['good', 'fair', 'poor', 'damaged'];
export const CONDITION_VALUES = [...CONDITIONS, 'na'];

// The rooms and items a new report starts with; the owner can rename,
// remove and add to them.
export const DEFAULT_ROOMS = [
  { name: 'Entrance & hallway', items: ['Walls', 'Floor', 'Doors & locks', 'Lighting'] },
  { name: 'Living room', items: ['Walls', 'Floor', 'Windows', 'Lighting', 'Heating'] },
  { name: 'Kitchen', items: ['Walls', 'Floor', 'Cabinets', 'Countertops', 'Sink & taps', 'Appliances'] },
  { name: 'Bathroom', items: ['Walls', 'Floor', 'Toilet', 'Shower or bath', 'Sink & taps', 'Ventilation'] },
  { name: 'Bedroom', items: ['Walls', 'Floor', 'Windows', 'Closet', 'Lighting'] },
];

export const defaultRooms = () =>
  DEFAULT_ROOMS.map((room) => ({
    name: room.name,
    items: room.items.map((name) => ({ name, condition: 'good', note: '' })),
  }));

const rank = (condition) => CONDITIONS.indexOf(condition);

// Rooms and items are matched by name, ignoring case and surrounding spaces,
// so a re-typed "kitchen " still lines up with "Kitchen".
const key = (text) => String(text).trim().toLowerCase();

// Every item in the move-out report next to the same item at move-in.
// change is 'worse', 'better' or 'same', 'new' for items that weren't in the
// move-in report, and 'unrated' when either side is 'na'.
export const compareInspections = (moveIn, moveOut) => {
  const before = new Map();
  moveIn.rooms.forEach((room) =>
    room.items.forEach((item) => before.set(`${key(room.name)}::${key(item.name)}`, item))
  );

  const rows = [];
  moveOut.rooms.forEach((room) =>
    room.items.forEach((item) => {
      const earlier = before.get(`${key(room.name)}::${key(item.name)}`);
      let change;
      if (!earlier) change = 'new';
      else if (earlier.condition === 'na' || item.condition === 'na') change = 'unrated';
      else if (rank(item.condition) > rank(earlier.condition)) change = 'worse';
      else if (rank(item.condition) < rank(earlier.condition)) change = 'better';
      else change = 'same';
      rows.push({
        room: room.name,
        item: item.name,
        before: earlier?.condition ?? null,
        after: item.condition,
        note: item.note,
        change,
      });
    })
  );

  const count = (change) => rows.filter((r) => r.change === change).length;
  return {
    rows,
    totals: { worse: count('worse'), better: count('better'), same: count('same'), new: count('new'), unrated: count('unrated') },
  };
};
