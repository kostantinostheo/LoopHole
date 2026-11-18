import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import { daysUntil, formatReminderSendTime, parseDate } from '../../utils/dates';
import { cycleSuffix, formatMoney } from '../../utils/money';

function dueLabel(days) {
  if (days < 0) return `${-days}d overdue`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `Due in ${days}d`;
}

export default function SubscriptionCard({ sub, currency, onEdit, onDelete }) {
  const days = daysUntil(sub.nextDate);
  const endsOn = parseDate(sub.untilDate)?.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });

  return (
    <li className="subs-card">
      <div className="subs-card__top">
        <div className="subs-card__name-row">
          <span className="subs-card__name">{sub.name}</span>
          {sub.category && <span className="subs-card__category">{sub.category}</span>}
        </div>
        <span className="subs-card__price">
          {formatMoney(sub.price, currency)}
          <span className="subs-card__cycle">{cycleSuffix(sub.cycle)}</span>
        </span>
      </div>

      <div className="subs-card__info">
        <span className={`subs-card__due${days <= 3 ? ' subs-card__due--soon' : ''}`}>{dueLabel(days)}</span>
        {endsOn && <span className="subs-card__until">Ends {endsOn}</span>}

        {sub.reminders?.length > 0 && (
          <div className="subs-card__reminders">
            {sub.reminders.map((r, i) => (
              <span className="subs-card__reminder" key={i}>
                Reminder {r.daysBefore}d before &middot;{' '}
                {formatReminderSendTime(sub.nextDate, r.daysBefore, r.time)}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="subs-card__actions">
        <button className="subs-card__action-btn" aria-label={`Edit ${sub.name}`} onClick={onEdit}>
          <FiEdit2 size={15} />
        </button>
        <button
          className="subs-card__action-btn subs-card__action-btn--danger"
          aria-label={`Remove ${sub.name}`}
          onClick={onDelete}
        >
          <FiTrash2 size={15} />
        </button>
      </div>
    </li>
  );
}
