const MAX_STEPS = 240;

export function parseLocalDate(dateStr) {
  if (!dateStr) return null;
  const date = new Date(`${dateStr}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

export function isSameDay(a, b) {
  return dateKey(a) === dateKey(b);
}

function addMonths(date, amount) {
  const day = date.getDate();
  const result = new Date(date.getFullYear(), date.getMonth() + amount, 1);
  const lastDayOfTargetMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDayOfTargetMonth));
  return result;
}

function addYears(date, amount) {
  const targetYear = date.getFullYear() + amount;
  const lastDayOfTargetMonth = new Date(targetYear, date.getMonth() + 1, 0).getDate();
  return new Date(targetYear, date.getMonth(), Math.min(date.getDate(), lastDayOfTargetMonth));
}

function step(date, cycle, amount) {
  return cycle === 'yearly' ? addYears(date, amount) : addMonths(date, amount);
}

// Recurring subscriptions only store their next unpaid renewal date. To render past and
// future occurrences on the calendar we walk outward from that anchor in both directions.
export function occurrencesInRange(sub, rangeStart, rangeEnd) {
  const anchor = parseLocalDate(sub.nextDate);
  if (!anchor) return [];

  const until = parseLocalDate(sub.untilDate);
  const forwardEnd = until && until.getTime() < rangeEnd.getTime() ? until : rangeEnd;

  const results = [];

  let cursor = anchor;
  for (let i = 0; i < MAX_STEPS && cursor.getTime() <= forwardEnd.getTime(); i++) {
    if (cursor.getTime() >= rangeStart.getTime()) results.push(new Date(cursor));
    cursor = step(cursor, sub.cycle, 1);
  }

  cursor = step(anchor, sub.cycle, -1);
  for (let i = 0; i < MAX_STEPS && cursor.getTime() >= rangeStart.getTime(); i++) {
    if (cursor.getTime() <= rangeEnd.getTime()) results.push(new Date(cursor));
    cursor = step(cursor, sub.cycle, -1);
  }

  return results;
}

const MONDAY_START_OFFSET = (day) => (day + 6) % 7;

export function getMonthGrid(year, month) {
  const firstOfMonth = new Date(year, month, 1);
  const leadingDays = MONDAY_START_OFFSET(firstOfMonth.getDay());
  const start = new Date(year, month, 1 - leadingDays);
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

export function getWeekDays(date) {
  const offset = MONDAY_START_OFFSET(date.getDay());
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - offset);
  return Array.from({ length: 7 }, (_, i) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i));
}

export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
