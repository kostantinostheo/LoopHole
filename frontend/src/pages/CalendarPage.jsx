import { useMemo, useState } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import PageHeader from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import { useSubscriptions } from '../hooks/useSubscriptions';
import { CATEGORIES, categoryColor } from '../utils/categories';
import {
  addCycles,
  monthGrid,
  occurrencesInRange,
  parseDate,
  toDateKey,
  WEEKDAY_LABELS,
  weekDays,
} from '../utils/dates';
import { formatPrice } from '../utils/money';

const MONTH_FORMAT = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });
const DAY_HEADER_FORMAT = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric' });
const WEEK_RANGE_FORMAT = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const FULL_DATE_FORMAT = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
});

// Map of date key -> renewals that day, sorted by name.
function renewalsByDay(subscriptions, days) {
  const map = new Map();
  for (const sub of subscriptions) {
    for (const date of occurrencesInRange(sub, days[0], days.at(-1))) {
      const key = toDateKey(date);
      map.set(key, [...(map.get(key) ?? []), sub]);
    }
  }
  for (const subs of map.values()) subs.sort((a, b) => a.name.localeCompare(b.name));
  return map;
}

// Categories present in view: known ones in canonical order, then unknown alphabetically.
function legendCategories(renewals) {
  const present = new Set([...renewals.values()].flat().map((sub) => sub.category || 'Other'));
  const unknown = [...present].filter((c) => !CATEGORIES.includes(c)).sort();
  return [...CATEGORIES.filter((c) => present.has(c)), ...unknown];
}

export default function CalendarPage() {
  const { subscriptions, loading } = useSubscriptions();
  const { user } = useAuth();
  const [view, setView] = useState('month');
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedKey, setSelectedKey] = useState(null);

  const todayKey = toDateKey(new Date());
  const days = useMemo(() => (view === 'month' ? monthGrid(cursor) : weekDays(cursor)), [view, cursor]);
  const renewals = useMemo(() => renewalsByDay(subscriptions, days), [subscriptions, days]);
  const legend = legendCategories(renewals);
  const selectedDate = parseDate(selectedKey);

  function move(step) {
    setCursor((prev) =>
      view === 'month'
        ? addCycles(prev, 'monthly', step)
        : new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 7 * step)
    );
  }

  // Month cells show a compact chip; week columns a block with the price.
  function eventChip(sub, key, withPrice) {
    const Tag = withPrice ? 'div' : 'span';
    const classes = [
      'calendar-event',
      withPrice && 'calendar-event--block',
      key < todayKey && 'calendar-event--past',
    ];

    return (
      <Tag
        key={sub.id}
        className={classes.filter(Boolean).join(' ')}
        style={{ '--event-color': categoryColor(sub.category) }}
      >
        {withPrice ? <span className="calendar-event__name">{sub.name}</span> : sub.name}
        {withPrice && <span className="calendar-event__price">{formatPrice(sub, user?.currency)}</span>}
      </Tag>
    );
  }

  return (
    <div className="subs-dashboard">
      <PageHeader title="Calendar" />

      <div className="calendar-toolbar">
        <div className="calendar-toolbar__nav">
          <button type="button" className="calendar-nav-btn" onClick={() => move(-1)} aria-label="Previous">
            <FiChevronLeft />
          </button>
          <button type="button" className="calendar-today-btn" onClick={() => setCursor(new Date())}>
            Today
          </button>
          <button type="button" className="calendar-nav-btn" onClick={() => move(1)} aria-label="Next">
            <FiChevronRight />
          </button>
        </div>

        <p className="calendar-toolbar__label">
          {view === 'month'
            ? MONTH_FORMAT.format(cursor)
            : WEEK_RANGE_FORMAT.formatRange(days[0], days[6])}
        </p>

        <div className="calendar-view-toggle">
          {['month', 'week'].map((option) => (
            <button
              key={option}
              type="button"
              className={`calendar-view-toggle__btn${view === option ? ' calendar-view-toggle__btn--active' : ''}`}
              onClick={() => setView(option)}
            >
              {option === 'month' ? 'Month' : 'Week'}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="subs-dashboard__empty">Loading calendar…</p>}

      {!loading && view === 'month' && (
        <div className="calendar-grid">
          {WEEKDAY_LABELS.map((label) => (
            <div className="calendar-grid__weekday" key={label}>
              {label}
            </div>
          ))}

          {days.map((day) => {
            const key = toDateKey(day);
            const subs = renewals.get(key) ?? [];
            const classes = [
              'calendar-day',
              day.getMonth() !== cursor.getMonth() && 'calendar-day--outside',
              key === todayKey && 'calendar-day--today',
              key === selectedKey && 'calendar-day--selected',
            ];

            return (
              <button
                type="button"
                key={key}
                className={classes.filter(Boolean).join(' ')}
                onClick={() => setSelectedKey(key === selectedKey ? null : key)}
              >
                <span className="calendar-day__number">{day.getDate()}</span>
                <div className="calendar-day__events">
                  {subs.slice(0, 2).map((sub) => eventChip(sub, key, false))}
                  {subs.length > 2 && <span className="calendar-day__more">+{subs.length - 2} more</span>}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {!loading && view === 'week' && (
        <div className="calendar-week">
          {days.map((day) => {
            const key = toDateKey(day);
            const subs = renewals.get(key) ?? [];

            return (
              <div
                key={key}
                className={`calendar-week__col${key === todayKey ? ' calendar-week__col--today' : ''}`}
              >
                <div className="calendar-week__header">{DAY_HEADER_FORMAT.format(day)}</div>
                <div className="calendar-week__events">
                  {subs.length === 0 && <span className="calendar-week__empty">—</span>}
                  {subs.map((sub) => eventChip(sub, key, true))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedDate && (
        <div className="calendar-detail">
          <h2 className="calendar-detail__heading">{FULL_DATE_FORMAT.format(selectedDate)}</h2>
          {!renewals.has(selectedKey) ? (
            <p className="subs-dashboard__empty">No renewals on this day.</p>
          ) : (
            <ul className="calendar-detail__list">
              {renewals.get(selectedKey).map((sub) => (
                <li className="calendar-detail__item" key={sub.id}>
                  <span className="calendar-detail__dot" style={{ background: categoryColor(sub.category) }} />
                  <span className="calendar-detail__name">{sub.name}</span>
                  <span className="calendar-detail__price">{formatPrice(sub, user?.currency)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {legend.length > 0 && (
        <div className="calendar-legend">
          {legend.map((label) => (
            <span className="calendar-legend__item" key={label}>
              <span className="calendar-legend__dot" style={{ background: categoryColor(label) }} />
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
