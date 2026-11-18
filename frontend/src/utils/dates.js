const MAX_STEPS = 240;
const DAY_MS = 24 * 60 * 60 * 1000;

export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// 'YYYY-MM-DD' -> local midnight, or null.
export function parseDate(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toDateKey(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function daysUntil(value) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((parseDate(value) - today) / DAY_MS);
}

// Adds billing cycles, clamping to the month's last day (Jan 31 + 1 month = Feb 28).
export function addCycles(date, cycle, count) {
  const target = new Date(date.getFullYear(), date.getMonth() + (cycle === 'yearly' ? 12 : 1) * count, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(date.getDate(), lastDay));
  return target;
}

// Only the next renewal is stored, so walk outward from it in both directions.
export function occurrencesInRange(sub, start, end) {
  const anchor = parseDate(sub.nextDate);
  if (!anchor) return [];

  const until = parseDate(sub.untilDate);
  const last = until && until < end ? until : end;
  const dates = [];

  let date = anchor;
  for (let i = 0; i < MAX_STEPS && date <= last; i++) {
    if (date >= start) dates.push(date);
    date = addCycles(date, sub.cycle, 1);
  }

  date = addCycles(anchor, sub.cycle, -1);
  for (let i = 0; i < MAX_STEPS && date >= start; i++) {
    if (date <= end) dates.push(date);
    date = addCycles(date, sub.cycle, -1);
  }

  return dates;
}

function daysFrom(start, count) {
  return Array.from(
    { length: count },
    (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
  );
}

const mondayOffset = (date) => (date.getDay() + 6) % 7;

// Six Monday-first weeks covering the month of `date`.
export function monthGrid(date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  return daysFrom(new Date(first.getFullYear(), first.getMonth(), 1 - mondayOffset(first)), 42);
}

export function weekDays(date) {
  return daysFrom(new Date(date.getFullYear(), date.getMonth(), date.getDate() - mondayOffset(date)), 7);
}

export function formatReminderSendTime(nextDate, daysBefore, time = '09:00') {
  if (!nextDate) return 'Set a renewal date to see when this sends';

  const fireDate = new Date(`${nextDate}T${time}:00`);
  fireDate.setDate(fireDate.getDate() - daysBefore);

  const formatted = fireDate.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  return fireDate <= Date.now() ? `Missed · was due ${formatted}` : `Sends ${formatted}`;
}
