// "Sat, Oct 18 · 10:00 AM – 12:00 PM" in the viewer's local time. Spans
// across midnight show both dates.
export const formatOpenHouseTime = (startsAt, endsAt) => {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const day = (d) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const time = (d) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (start.toDateString() === end.toDateString()) return `${day(start)} · ${time(start)} – ${time(end)}`;
  return `${day(start)} ${time(start)} – ${day(end)} ${time(end)}`;
};

// "3 going", "3 of 10 going" or "Full".
export const describeAttendance = ({ rsvpCount, capacity, isFull }) => {
  if (isFull) return 'Full';
  return capacity > 0 ? `${rsvpCount} of ${capacity} going` : `${rsvpCount} going`;
};

// Value for a datetime-local input, in local time.
export const toLocalInputValue = (date) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
