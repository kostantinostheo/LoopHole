import { Database } from 'bun:sqlite';

export const db = new Database(process.env.DB_PATH || 'subscriptions.db');

db.run('PRAGMA journal_mode = WAL');
db.run('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL,
    userSecret TEXT NOT NULL,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    cycle TEXT NOT NULL,
    nextDate TEXT NOT NULL,
    category TEXT
  );

  CREATE TABLE IF NOT EXISTS reminders (
    id TEXT PRIMARY KEY,
    subscriptionId TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    daysBefore INTEGER NOT NULL,
    lastSentFor TEXT
  );
`);

const subscriptionColumns = db.prepare('PRAGMA table_info(subscriptions)').all().map((c) => c.name);
if (!subscriptionColumns.includes('untilDate')) {
  db.run('ALTER TABLE subscriptions ADD COLUMN untilDate TEXT');
}

const userColumns = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
if (!userColumns.includes('currency')) {
  db.run("ALTER TABLE users ADD COLUMN currency TEXT NOT NULL DEFAULT 'USD'");
}

// --- users ---

export function createUser({ id, email, passwordHash, userSecret, createdAt }) {
  db.prepare(
    'INSERT INTO users (id, email, passwordHash, userSecret, createdAt) VALUES (?, ?, ?, ?, ?)'
  ).run(id, email, passwordHash, userSecret, createdAt);
  return findUserById(id);
}

export function findUserByEmail(email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
}

export function findUserById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

export function updateUserEmail(id, email) {
  db.prepare('UPDATE users SET email = ? WHERE id = ?').run(email, id);
  return findUserById(id);
}

export function updateUserCurrency(id, currency) {
  db.prepare('UPDATE users SET currency = ? WHERE id = ?').run(currency, id);
  return findUserById(id);
}

export function updateUserPassword(id, passwordHash, userSecret) {
  db.prepare('UPDATE users SET passwordHash = ?, userSecret = ? WHERE id = ?').run(
    passwordHash,
    userSecret,
    id
  );
  return findUserById(id);
}

// --- subscriptions ---

function attachReminders(sub) {
  const reminders = db
    .prepare('SELECT id, email, daysBefore, lastSentFor FROM reminders WHERE subscriptionId = ?')
    .all(sub.id);
  return { ...sub, reminders };
}

export function listAllSubscriptions() {
  const subs = db.prepare('SELECT * FROM subscriptions').all();
  return subs.map(attachReminders);
}

export function listSubscriptionsByUser(userId) {
  const subs = db.prepare('SELECT * FROM subscriptions WHERE userId = ?').all(userId);
  return subs.map(attachReminders);
}

export function getSubscription(id) {
  const sub = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(id);
  return sub ? attachReminders(sub) : null;
}

export function insertSubscription(sub) {
  db.prepare(
    'INSERT INTO subscriptions (id, userId, name, price, cycle, nextDate, category, untilDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    sub.id,
    sub.userId,
    sub.name,
    sub.price,
    sub.cycle,
    sub.nextDate,
    sub.category,
    sub.untilDate ?? null
  );

  const insertReminder = db.prepare(
    'INSERT INTO reminders (id, subscriptionId, userId, email, daysBefore, lastSentFor) VALUES (?, ?, ?, ?, ?, ?)'
  );
  for (const r of sub.reminders) {
    insertReminder.run(r.id, sub.id, sub.userId, r.email, r.daysBefore, r.lastSentFor ?? null);
  }

  return getSubscription(sub.id);
}

export function updateSubscriptionNextDate(id, nextDate) {
  db.prepare('UPDATE subscriptions SET nextDate = ? WHERE id = ?').run(nextDate, id);
}

export function updateSubscriptionRow(id, sub) {
  db.prepare(
    'UPDATE subscriptions SET name = ?, price = ?, cycle = ?, nextDate = ?, category = ?, untilDate = ? WHERE id = ?'
  ).run(sub.name, sub.price, sub.cycle, sub.nextDate, sub.category, sub.untilDate ?? null, id);

  db.prepare('DELETE FROM reminders WHERE subscriptionId = ?').run(id);

  const insertReminder = db.prepare(
    'INSERT INTO reminders (id, subscriptionId, userId, email, daysBefore, lastSentFor) VALUES (?, ?, ?, ?, ?, ?)'
  );
  for (const r of sub.reminders) {
    insertReminder.run(r.id, id, sub.userId, r.email, r.daysBefore, r.lastSentFor ?? null);
  }

  return getSubscription(id);
}

export function markReminderSent(reminderId, sentFor) {
  db.prepare('UPDATE reminders SET lastSentFor = ? WHERE id = ?').run(sentFor, reminderId);
}

export function deleteSubscription(id) {
  db.prepare('DELETE FROM subscriptions WHERE id = ?').run(id);
}
