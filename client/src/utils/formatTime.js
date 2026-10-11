const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// Short timestamp for message lists: "just now", "5m", "3h", "Mon",
// "Oct 3", or "Oct 3, 2025" for older years.
export const formatShortTime = (date, now = new Date()) => {
  const then = new Date(date);
  const diff = now - then;

  if (diff < MINUTE) return 'just now';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h`;
  if (diff < 7 * DAY) return then.toLocaleDateString('en-US', { weekday: 'short' });
  if (then.getFullYear() === now.getFullYear()) {
    return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Time of day for messages in a thread, e.g. "3:05 PM".
export const formatTimeOfDay = (date) =>
  new Date(date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
