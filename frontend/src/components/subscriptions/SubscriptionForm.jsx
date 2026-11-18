import { useState } from 'react';
import { FiChevronDown, FiX } from 'react-icons/fi';
import { CATEGORIES } from '../../utils/categories';
import { formatReminderSendTime } from '../../utils/dates';
import { createId } from '../../utils/ids';
import DateInput from '../form/DateInput';
import FormField from '../form/FormField';
import SelectInput from '../form/SelectInput';
import Modal from '../Modal';

const CATEGORY_OPTIONS = CATEGORIES.map((c) => ({ value: c, label: c }));
const CYCLE_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];
const NOTIFY_OPTIONS = [1, 2, 3, 7, 14].map((d) => ({
  value: String(d),
  label: `${d} ${d === 1 ? 'day' : 'days'} before`,
}));

const EMPTY_FORM = {
  name: '',
  price: '',
  cycle: 'monthly',
  nextDate: '',
  untilDate: '',
  category: CATEGORIES[0],
  reminders: [],
};

// Form fields are strings; numbers are parsed back on save.
function toFormValues(sub) {
  if (!sub) return EMPTY_FORM;

  return {
    name: sub.name,
    price: String(sub.price),
    cycle: sub.cycle,
    nextDate: sub.nextDate,
    untilDate: sub.untilDate || '',
    category: sub.category || CATEGORIES[0],
    reminders: (sub.reminders || []).map((r) => ({
      id: r.id || createId(),
      daysBefore: String(r.daysBefore),
      time: r.time || '09:00',
      lastSentFor: r.lastSentFor ?? null,
    })),
  };
}

function missingFields(form) {
  return [
    !form.name.trim() && 'Name',
    !form.category && 'Category',
    !form.price && 'Price',
    !form.cycle && 'Billing cycle',
    !form.nextDate && 'Next renewal date',
    form.untilDate && form.nextDate && form.untilDate < form.nextDate &&
      'Repeat until date (must be on or after the next renewal)',
    form.reminders.length === 0 && 'At least one reminder',
  ].filter(Boolean);
}

export default function SubscriptionForm({ subscription, onSave, onClose }) {
  const [form, setForm] = useState(() => toFormValues(subscription));
  const [showUntil, setShowUntil] = useState(Boolean(subscription?.untilDate));
  const [missing, setMissing] = useState([]);

  const setField = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));
  const setReminders = (update) => setForm((prev) => ({ ...prev, reminders: update(prev.reminders) }));
  const updateReminder = (id, key, value) =>
    setReminders((list) => list.map((r) => (r.id === id ? { ...r, [key]: value } : r)));

  function toggleUntil() {
    if (showUntil) setField('untilDate')('');
    setShowUntil(!showUntil);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const problems = missingFields(form);
    if (problems.length > 0) return setMissing(problems);

    onSave({
      name: form.name.trim(),
      price: parseFloat(form.price),
      cycle: form.cycle,
      nextDate: form.nextDate,
      untilDate: form.untilDate || null,
      category: form.category,
      reminders: form.reminders.map((r) => ({
        id: r.id,
        daysBefore: parseInt(r.daysBefore, 10),
        time: r.time || '09:00',
        lastSentFor: r.lastSentFor ?? null,
      })),
    });
  }

  return (
    <>
      <Modal as="form" className="subs-form modal--form" onClose={onClose} onSubmit={handleSubmit}>
        <div className="subs-form__header">
          <h2 className="subs-form__heading">{subscription ? 'Edit subscription' : 'New subscription'}</h2>
          <button type="button" className="subs-form__close" aria-label="Close" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <FormField
          label="Name"
          placeholder="e.g. Netflix"
          value={form.name}
          onChange={setField('name')}
          autoFocus
        />

        <div className="subs-form__row">
          <FormField label="Category">
            <SelectInput value={form.category} onChange={setField('category')} options={CATEGORY_OPTIONS} />
          </FormField>
          <FormField
            label="Price"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={form.price}
            onChange={setField('price')}
          />
        </div>

        <div className="subs-form__row">
          <FormField label="Billing cycle">
            <SelectInput value={form.cycle} onChange={setField('cycle')} options={CYCLE_OPTIONS} />
          </FormField>
          <FormField label="Next renewal">
            <DateInput value={form.nextDate} onChange={(e) => setField('nextDate')(e.target.value)} />
          </FormField>
        </div>

        <div className="subs-form__accordion">
          <button
            type="button"
            className="subs-form__accordion-header"
            aria-expanded={showUntil}
            onClick={toggleUntil}
          >
            <span className="subs-form__label">Repeat until (optional)</span>
            <FiChevronDown
              className={`subs-form__accordion-chevron${showUntil ? ' subs-form__accordion-chevron--open' : ''}`}
            />
          </button>
          {showUntil && (
            <div className="subs-form__accordion-body">
              <DateInput
                min={form.nextDate || undefined}
                value={form.untilDate}
                onChange={(e) => setField('untilDate')(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="subs-form__section">
          <span className="subs-form__label">Reminders</span>

          {form.reminders.map((r) => (
            <div className="subs-form__reminder-row" key={r.id}>
              <div className="subs-form__row">
                <FormField label="Notify me">
                  <SelectInput
                    value={r.daysBefore}
                    onChange={(v) => updateReminder(r.id, 'daysBefore', v)}
                    options={NOTIFY_OPTIONS}
                  />
                </FormField>
                <FormField
                  label="At"
                  className="subs-form__field--time"
                  type="time"
                  value={r.time}
                  onChange={(v) => updateReminder(r.id, 'time', v)}
                />
                <button
                  type="button"
                  className="icon-btn subs-form__remove-btn"
                  aria-label="Remove reminder"
                  onClick={() => setReminders((list) => list.filter((x) => x.id !== r.id))}
                >
                  &times;
                </button>
              </div>
              <span className="subs-form__send-label">
                {formatReminderSendTime(form.nextDate, Number(r.daysBefore), r.time)}
              </span>
            </div>
          ))}

          <button
            type="button"
            className="link"
            onClick={() =>
              setReminders((list) => [...list, { id: createId(), daysBefore: '3', time: '09:00' }])
            }
          >
            + Add reminder
          </button>
        </div>

        <button className="btn btn--primary" type="submit">
          {subscription ? 'Save changes' : 'Save subscription'}
        </button>
      </Modal>

      {missing.length > 0 && (
        <Modal title="Missing information" onClose={() => setMissing([])}>
          <p className="modal__text">Please fill in the following before saving:</p>
          <ul className="modal__list">
            {missing.map((field) => (
              <li key={field}>{field}</li>
            ))}
          </ul>
          <button className="btn btn--primary" onClick={() => setMissing([])}>
            Got it
          </button>
        </Modal>
      )}
    </>
  );
}
