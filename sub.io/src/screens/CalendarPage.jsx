import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { useSubscriptions } from '../hooks/useSubscriptions';
import { useAuth } from '../context/AuthContext';
import { categoryColor, CATEGORY_COLORS } from '../lib/categories';
import { formatMoney } from '../lib/currency';
import {
  dateKey,
  getMonthGrid,
  getWeekDays,
  occurrencesInRange,
  WEEKDAY_LABELS,
} from '../logic/calendar';

const MONTH_FORMATTER = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });
const DAY_HEADER_FORMATTER = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric' });
const FULL_DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
});

function formatPrice(price, cycle, currency) {
  return `${formatMoney(price, currency)}${cycle === 'yearly' ? '/yr' : '/mo'}`;
}

function weekRangeLabel(days) {
  const start = days[0];
  const end = days[6];
  const startLabel = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const endLabel =
    start.getMonth() === end.getMonth()
      ? end.toLocaleDateString(undefined, { day: 'numeric', year: 'numeric' })
      : end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return `${startLabel} – ${endLabel}`;
}

export default function CalendarPage() {
  const { subscriptions, loading } = useSubscriptions();
  const { user } = useAuth();
  const [view, setView] = useState('month');
  const [cursorDate, setCursorDate] = useState(new Date());
  const [selectedKey, setSelectedKey] = useState(null);

  const today = new Date();
  const todayKey = dateKey(today);

  const monthDays = useMemo(
    () => (view === 'month' ? getMonthGrid(cursorDate.getFullYear(), cursorDate.getMonth()) : []),
    [view, cursorDate]
  );
  const weekDays = useMemo(() => (view === 'week' ? getWeekDays(cursorDate) : []), [view, cursorDate]);
  const visibleDays = view === 'month' ? monthDays : weekDays;

  const eventsByDay = useMemo(() => {
    if (visibleDays.length === 0) return new Map();
    const rangeStart = visibleDays[0];
    const rangeEnd = visibleDays[visibleDays.length - 1];
    const map = new Map();

    for (const sub of subscriptions) {
      const occurrences = occurrencesInRange(sub, rangeStart, rangeEnd);
      for (const occurrence of occurrences) {
        const key = dateKey(occurrence);
        if (!map.has(key)) map.set(key, []);
        map.get(key).push({ sub, date: occurrence });
      }
    }

    for (const events of map.values()) {
      events.sort((a, b) => a.sub.name.localeCompare(b.sub.name));
    }

    return map;
  }, [subscriptions, visibleDays]);

  function goToday() {
    setCursorDate(new Date());
  }

  function goPrev() {
    setCursorDate((prev) => {
      const next = new Date(prev);
      if (view === 'month') next.setMonth(next.getMonth() - 1);
      else next.setDate(next.getDate() - 7);
      return next;
    });
  }

  function goNext() {
    setCursorDate((prev) => {
      const next = new Date(prev);
      if (view === 'month') next.setMonth(next.getMonth() + 1);
      else next.setDate(next.getDate() + 7);
      return next;
    });
  }

  const selectedEvents = selectedKey ? eventsByDay.get(selectedKey) || [] : [];
  const selectedDate = selectedKey ? new Date(`${selectedKey}T00:00:00`) : null;

  return (
    <div className="subs-dashboard">
      <header className="subs-dashboard__header">
        <div>
          <h1>Calendar</h1>
        </div>
        <Link to="/" className="link">
          Back to dashboard
        </Link>
      </header>

      <div className="calendar-toolbar">
        <div className="calendar-toolbar__nav">
          <button type="button" className="calendar-nav-btn" onClick={goPrev} aria-label="Previous">
            <FiChevronLeft />
          </button>
          <button type="button" className="calendar-today-btn" onClick={goToday}>
            Today
          </button>
          <button type="button" className="calendar-nav-btn" onClick={goNext} aria-label="Next">
            <FiChevronRight />
          </button>
        </div>
        <p className="calendar-toolbar__label">
          {view === 'month' ? MONTH_FORMATTER.format(cursorDate) : weekRangeLabel(weekDays)}
        </p>
        <div className="calendar-view-toggle">
          <button
            type="button"
            className={`calendar-view-toggle__btn${view === 'month' ? ' calendar-view-toggle__btn--active' : ''}`}
            onClick={() => setView('month')}
          >
            Month
          </button>
          <button
            type="button"
            className={`calendar-view-toggle__btn${view === 'week' ? ' calendar-view-toggle__btn--active' : ''}`}
            onClick={() => setView('week')}
          >
            Week
          </button>
        </div>
      </div>

      {loading ? (
        <p className="subs-dashboard__empty">Loading calendar…</p>
      ) : view === 'month' ? (
        <div className="calendar-grid">
          {WEEKDAY_LABELS.map((label) => (
            <div className="calendar-grid__weekday" key={label}>
              {label}
            </div>
          ))}
          {monthDays.map((day) => {
            const key = dateKey(day);
            const dayEvents = eventsByDay.get(key) || [];
            const inMonth = day.getMonth() === cursorDate.getMonth();
            const isToday = key === todayKey;
            const isPast = day.getTime() < new Date(todayKey).getTime();
            const isSelected = key === selectedKey;

            return (
              <button
                type="button"
                key={key}
                className={[
                  'calendar-day',
                  !inMonth && 'calendar-day--outside',
                  isToday && 'calendar-day--today',
                  isSelected && 'calendar-day--selected',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => setSelectedKey(key === selectedKey ? null : key)}
              >
                <span className="calendar-day__number">{day.getDate()}</span>
                <div className="calendar-day__events">
                  {dayEvents.slice(0, 2).map((event, i) => (
                    <span
                      className={`calendar-event${isPast ? ' calendar-event--past' : ''}`}
                      style={{ '--event-color': categoryColor(event.sub.category) }}
                      key={`${event.sub.id}-${i}`}
                    >
                      {event.sub.name}
                    </span>
                  ))}
                  {dayEvents.length > 2 && (
                    <span className="calendar-day__more">+{dayEvents.length - 2} more</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="calendar-week">
          {weekDays.map((day) => {
            const key = dateKey(day);
            const dayEvents = eventsByDay.get(key) || [];
            const isToday = key === todayKey;
            const isPast = day.getTime() < new Date(todayKey).getTime();

            return (
              <div
                className={`calendar-week__col${isToday ? ' calendar-week__col--today' : ''}`}
                key={key}
              >
                <div className="calendar-week__header">{DAY_HEADER_FORMATTER.format(day)}</div>
                <div className="calendar-week__events">
                  {dayEvents.length === 0 && <span className="calendar-week__empty">—</span>}
                  {dayEvents.map((event, i) => (
                    <div
                      className={`calendar-event calendar-event--block${isPast ? ' calendar-event--past' : ''}`}
                      style={{ '--event-color': categoryColor(event.sub.category) }}
                      key={`${event.sub.id}-${i}`}
                    >
                      <span className="calendar-event__name">{event.sub.name}</span>
                      <span className="calendar-event__price">
                        {formatPrice(event.sub.price, event.sub.cycle, user?.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedDate && (
        <div className="calendar-detail">
          <h2 className="calendar-detail__heading">{FULL_DATE_FORMATTER.format(selectedDate)}</h2>
          {selectedEvents.length === 0 ? (
            <p className="subs-dashboard__empty">No renewals on this day.</p>
          ) : (
            <ul className="calendar-detail__list">
              {selectedEvents.map((event, i) => (
                <li className="calendar-detail__item" key={`${event.sub.id}-${i}`}>
                  <span
                    className="calendar-detail__dot"
                    style={{ background: categoryColor(event.sub.category) }}
                  />
                  <span className="calendar-detail__name">{event.sub.name}</span>
                  <span className="calendar-detail__price">
                    {formatPrice(event.sub.price, event.sub.cycle, user?.currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="calendar-legend">
        {Object.entries(CATEGORY_COLORS).map(([label, color]) => (
          <span className="calendar-legend__item" key={label}>
            <span className="calendar-legend__dot" style={{ background: color }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
