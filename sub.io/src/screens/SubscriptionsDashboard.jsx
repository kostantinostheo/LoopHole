import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiEdit2,
  FiTrash2,
  FiSettings,
  FiLogOut,
  FiCalendar,
  FiBarChart2,
  FiChevronDown,
  FiPlus,
  FiX,
} from 'react-icons/fi';
import { useSubscriptions } from '../hooks/useSubscriptions';
import { useAuth } from '../context/AuthContext';
import { CATEGORIES } from '../lib/categories';
import { formatMoney } from '../lib/currency';

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function monthlyCost(sub) {
  return sub.cycle === 'yearly' ? sub.price / 12 : sub.price;
}

function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr);
  due.setHours(0, 0, 0, 0);
  return Math.round((due - today) / (1000 * 60 * 60 * 24));
}

function formatUntilLabel(untilDate) {
  if (!untilDate) return null;
  const date = new Date(`${untilDate}T00:00:00`);
  return `Ends ${date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}`;
}

function formatDueLabel(days) {
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `Due in ${days}d`;
}

function computeFireDate(nextDate, daysBefore) {
  if (!nextDate) return null;
  const fireDate = new Date(`${nextDate}T09:00:00`);
  fireDate.setDate(fireDate.getDate() - daysBefore);
  return fireDate;
}

function formatSendLabel(nextDate, daysBefore) {
  const fireDate = computeFireDate(nextDate, daysBefore);
  if (!fireDate) return 'Set a renewal date to see when this sends';
  const formatted = fireDate.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  return fireDate.getTime() <= Date.now() ? `Missed · was due ${formatted}` : `Sends ${formatted}`;
}

export default function SubscriptionsDashboard() {
  const { subscriptions, loading, addSubscription, updateSubscription, removeSubscription } =
    useSubscriptions();
  const { user, logout } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [cycle, setCycle] = useState('monthly');
  const [nextDate, setNextDate] = useState('');
  const [untilDate, setUntilDate] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [reminders, setReminders] = useState([]);
  const [alertMessage, setAlertMessage] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  function confirmDelete() {
    if (pendingDelete) removeSubscription(pendingDelete.id);
    setPendingDelete(null);
  }

  const totalMonthly = subscriptions.reduce((sum, sub) => sum + monthlyCost(sub), 0);
  const sorted = [...subscriptions].sort(
    (a, b) => new Date(a.nextDate) - new Date(b.nextDate)
  );

  function resetForm() {
    setName('');
    setPrice('');
    setCycle('monthly');
    setNextDate('');
    setUntilDate('');
    setCategory(CATEGORIES[0]);
    setReminders([]);
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(sub) {
    setEditingId(sub.id);
    setName(sub.name);
    setPrice(String(sub.price));
    setCycle(sub.cycle);
    setNextDate(sub.nextDate);
    setUntilDate(sub.untilDate || '');
    setCategory(sub.category || CATEGORIES[0]);
    setReminders(
      (sub.reminders || []).map((r) => ({
        id: r.id || generateId(),
        daysBefore: String(r.daysBefore),
        lastSentFor: r.lastSentFor ?? null,
      }))
    );
    setShowForm(true);
  }

  function addReminderField() {
    setReminders((prev) => [...prev, { id: generateId(), daysBefore: '3' }]);
  }

  function updateReminderField(id, key, value) {
    setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, [key]: value } : r)));
  }

  function removeReminderField(id) {
    setReminders((prev) => prev.filter((r) => r.id !== id));
  }

  function getMissingFields() {
    const missing = [];
    if (!name.trim()) missing.push('Name');
    if (!category) missing.push('Category');
    if (!price) missing.push('Price');
    if (!cycle) missing.push('Billing cycle');
    if (!nextDate) missing.push('Next renewal date');
    if (untilDate && nextDate && untilDate < nextDate) {
      missing.push('Repeat until date (must be on or after the next renewal)');
    }
    if (reminders.length === 0) missing.push('At least one reminder');
    return missing;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const missing = getMissingFields();
    if (missing.length > 0) {
      setAlertMessage(missing);
      return;
    }
    const payload = {
      name: name.trim(),
      price: parseFloat(price),
      cycle,
      nextDate,
      untilDate: untilDate || null,
      category,
      reminders: reminders.map((r) => ({
        id: r.id,
        daysBefore: parseInt(r.daysBefore, 10),
        lastSentFor: r.lastSentFor ?? null,
      })),
    };
    if (editingId) {
      updateSubscription(editingId, payload);
    } else {
      addSubscription(payload);
    }
    resetForm();
  }

  if (loading) {
    return (
      <div className="subs-dashboard">
        <p className="subs-dashboard__empty">Loading subscriptions…</p>
      </div>
    );
  }

  return (
    <div className="subs-dashboard">
      <header className="subs-dashboard__header">
        <div>
          <h1>Subscriptions</h1>
          <p className="subs-dashboard__total">
            {formatMoney(totalMonthly, user?.currency)}<span> / month</span>
          </p>
        </div>
        <div className="subs-dashboard__header-actions">
          <button
            className="btn btn--primary subs-dashboard__add-btn"
            onClick={() => (showForm ? resetForm() : setShowForm(true))}
          >
            {showForm ? 'Cancel' : 'Add'}
          </button>
          <div className="account-menu" ref={menuRef}>
            <button
              type="button"
              className="account-menu__trigger"
              onClick={() => setMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <span className="account-menu__avatar">
                {(user?.email?.[0] || '?').toUpperCase()}
              </span>
              <FiChevronDown
                className={`account-menu__chevron${menuOpen ? ' account-menu__chevron--open' : ''}`}
              />
            </button>

            {menuOpen && (
              <div className="account-menu__dropdown" role="menu">
                {user && <p className="account-menu__email">{user.email}</p>}

                <Link
                  to="/settings"
                  className="account-menu__item"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                >
                  <FiSettings className="account-menu__icon" />
                  Settings
                </Link>

                <Link
                  to="/calendar"
                  className="account-menu__item"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                >
                  <FiCalendar className="account-menu__icon" />
                  Calendar
                </Link>

                <Link
                  to="/statistics"
                  className="account-menu__item"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                >
                  <FiBarChart2 className="account-menu__icon" />
                  Statistics
                </Link>

                <div className="account-menu__divider" />

                <button
                  type="button"
                  className="account-menu__item account-menu__item--danger"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    logout();
                  }}
                >
                  <FiLogOut className="account-menu__icon" />
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <button
        type="button"
        className="subs-fab"
        aria-label={showForm ? 'Close form' : 'Add subscription'}
        onClick={() => (showForm ? resetForm() : setShowForm(true))}
      >
        {showForm ? <FiX /> : <FiPlus />}
      </button>

      {showForm && (
        <div className="modal-backdrop" onClick={resetForm}>
          <form
            className="subs-form modal modal--form"
            onSubmit={handleSubmit}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="subs-form__heading">
              {editingId ? 'Edit subscription' : 'New subscription'}
            </h2>
            <label className="subs-form__field">
              <span className="subs-form__label">Name</span>
              <input
                className="text-input"
                placeholder="e.g. Netflix"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </label>
            <div className="subs-form__row">
              <label className="subs-form__field">
                <span className="subs-form__label">Category</span>
                <select
                  className="text-input"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="subs-form__field">
                <span className="subs-form__label">Price</span>
                <input
                  className="text-input"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </label>
            </div>
            <div className="subs-form__row">
              <label className="subs-form__field">
                <span className="subs-form__label">Billing cycle</span>
                <select
                  className="text-input"
                  value={cycle}
                  onChange={(e) => setCycle(e.target.value)}
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </label>
              <label className="subs-form__field">
                <span className="subs-form__label">Next renewal</span>
                <input
                  className="text-input"
                  type="date"
                  value={nextDate}
                  onChange={(e) => setNextDate(e.target.value)}
                />
              </label>
            </div>
            <div className="subs-form__row subs-form__row--align-end">
              <label className="subs-form__field">
                <span className="subs-form__label">Repeat until (optional)</span>
                <input
                  className="text-input"
                  type="date"
                  min={nextDate || undefined}
                  value={untilDate}
                  onChange={(e) => setUntilDate(e.target.value)}
                />
              </label>
              {untilDate && (
                <button
                  type="button"
                  className="link subs-form__clear-until"
                  onClick={() => setUntilDate('')}
                >
                  No end date
                </button>
              )}
            </div>
            <div className="subs-form__section">
              <span className="subs-form__label">
                Email reminders{' '}
                {user && (
                  <>
                    &middot; sent to <b style={{ textTransform: 'lowercase' }}>{user.email}</b>
                  </>
                )}
              </span>

              {reminders.map((r) => (
                <div className="subs-form__reminder-row" key={r.id}>
                  <div className="subs-form__row">
                    <label className="subs-form__field">
                      <span className="subs-form__label">Notify me</span>
                      <select
                        className="text-input"
                        value={r.daysBefore}
                        onChange={(e) => updateReminderField(r.id, 'daysBefore', e.target.value)}
                      >
                        <option value="1">1 day before</option>
                        <option value="2">2 days before</option>
                        <option value="3">3 days before</option>
                        <option value="7">7 days before</option>
                        <option value="14">14 days before</option>
                      </select>
                    </label>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label="Remove reminder"
                      onClick={() => removeReminderField(r.id)}
                    >
                      &times;
                    </button>
                  </div>
                  <span className="subs-form__send-label">
                    {formatSendLabel(nextDate, Number(r.daysBefore))}
                  </span>
                </div>
              ))}

              <button type="button" className="link" onClick={addReminderField}>
                + Add reminder
              </button>
            </div>

            <button className="btn btn--primary" type="submit">
              {editingId ? 'Save changes' : 'Save subscription'}
            </button>
          </form>
        </div>
      )}

      {sorted.length === 0 ? (
        <p className="subs-dashboard__empty">No subscriptions yet. Add your first one.</p>
      ) : (
        <ul className="subs-list">
          {sorted.map((sub) => {
            const days = daysUntil(sub.nextDate);
            const isSoon = days <= 3;
            return (
              <li key={sub.id} className="subs-card">
                <div className="subs-card__top">
                  <div className="subs-card__name-row">
                    <span className="subs-card__name">{sub.name}</span>
                    {sub.category && <span className="subs-card__category">{sub.category}</span>}
                  </div>
                  <span className="subs-card__price">
                    {formatMoney(sub.price, user?.currency)}
                    <span className="subs-card__cycle">/{sub.cycle === 'yearly' ? 'yr' : 'mo'}</span>
                  </span>
                </div>
                <div className="subs-card__info">
                  <span className={`subs-card__due${isSoon ? ' subs-card__due--soon' : ''}`}>
                    {formatDueLabel(days)}
                  </span>
                  {sub.untilDate && (
                    <span className="subs-card__until">{formatUntilLabel(sub.untilDate)}</span>
                  )}
                  {sub.reminders && sub.reminders.length > 0 && (
                    <div className="subs-card__reminders">
                      {sub.reminders.map((r, i) => (
                        <span className="subs-card__reminder" key={i}>
                          Reminder {r.daysBefore}d before &middot;{' '}
                          {formatSendLabel(sub.nextDate, r.daysBefore)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="subs-card__actions">
                  <button
                    className="subs-card__action-btn"
                    aria-label={`Edit ${sub.name}`}
                    onClick={() => startEdit(sub)}
                  >
                    <FiEdit2 size={15} />
                  </button>
                  <button
                    className="subs-card__action-btn subs-card__action-btn--danger"
                    aria-label={`Remove ${sub.name}`}
                    onClick={() => setPendingDelete(sub)}
                  >
                    <FiTrash2 size={15} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {alertMessage && (
        <div className="modal-backdrop" onClick={() => setAlertMessage(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal__title">Missing information</h2>
            <p className="modal__text">Please fill in the following before saving:</p>
            <ul className="modal__list">
              {alertMessage.map((field) => (
                <li key={field}>{field}</li>
              ))}
            </ul>
            <button className="btn btn--primary" onClick={() => setAlertMessage(null)}>
              Got it
            </button>
          </div>
        </div>
      )}

      {pendingDelete && (
        <div className="modal-backdrop" onClick={() => setPendingDelete(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal__title">Delete subscription?</h2>
            <p className="modal__text">
              This will permanently delete <b>{pendingDelete.name}</b> and its reminders. This
              can't be undone.
            </p>
            <div className="modal__actions">
              <button className="btn btn--secondary" onClick={() => setPendingDelete(null)}>
                Cancel
              </button>
              <button className="btn btn--danger" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
