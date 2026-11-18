import { db } from './connection.js';

// Reminders fire in the owner's timezone and show their currency, so both are joined on.
const SELECT_SUBSCRIPTIONS = `
  SELECT subscriptions.*, users.timezone, users.currency
  FROM subscriptions JOIN users ON users.id = subscriptions.userId`;

function withReminders(subscription) {
  if (!subscription) return null;

  const reminders = db
    .query('SELECT id, daysBefore, time, lastSentFor FROM reminders WHERE subscriptionId = ?')
    .all(subscription.id);

  return { ...subscription, reminders };
}

export function listAllSubscriptions() {
  return db.query(SELECT_SUBSCRIPTIONS).all().map(withReminders);
}

export function listUserSubscriptions(userId) {
  return db.query(`${SELECT_SUBSCRIPTIONS} WHERE subscriptions.userId = ?`).all(userId).map(withReminders);
}

export function getSubscription(id) {
  return withReminders(db.query(`${SELECT_SUBSCRIPTIONS} WHERE subscriptions.id = ?`).get(id));
}

// Inserts or updates a subscription and replaces its reminders.
export const saveSubscription = db.transaction((sub) => {
  db.query(`
    INSERT INTO subscriptions (id, userId, name, price, cycle, nextDate, category, untilDate)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name, price = excluded.price, cycle = excluded.cycle,
      nextDate = excluded.nextDate, category = excluded.category, untilDate = excluded.untilDate
  `).run(sub.id, sub.userId, sub.name, sub.price, sub.cycle, sub.nextDate, sub.category, sub.untilDate);

  db.query('DELETE FROM reminders WHERE subscriptionId = ?').run(sub.id);

  const insertReminder = db.query(`
    INSERT INTO reminders (id, subscriptionId, userId, daysBefore, time, lastSentFor)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  for (const r of sub.reminders) {
    insertReminder.run(r.id, sub.id, sub.userId, r.daysBefore, r.time, r.lastSentFor);
  }

  return getSubscription(sub.id);
});

export function updateNextDate(id, nextDate) {
  db.query('UPDATE subscriptions SET nextDate = ? WHERE id = ?').run(nextDate, id);
}

export function markReminderSent(reminderId, sentFor) {
  db.query('UPDATE reminders SET lastSentFor = ? WHERE id = ?').run(sentFor, reminderId);
}

export function deleteSubscription(id) {
  db.query('DELETE FROM subscriptions WHERE id = ?').run(id);
}
