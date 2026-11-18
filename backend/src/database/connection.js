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
    createdAt TEXT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    timezone TEXT NOT NULL DEFAULT 'UTC'
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    cycle TEXT NOT NULL,
    nextDate TEXT NOT NULL,
    category TEXT,
    untilDate TEXT
  );

  CREATE TABLE IF NOT EXISTS reminders (
    id TEXT PRIMARY KEY,
    subscriptionId TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    daysBefore INTEGER NOT NULL,
    time TEXT NOT NULL DEFAULT '09:00',
    lastSentFor TEXT
  );
`);

// Bring databases created by older versions up to the current schema.
const columnsOf = (table) => db.query(`PRAGMA table_info(${table})`).all().map((c) => c.name);

const addedColumns = [
  ['subscriptions', 'untilDate', 'TEXT'],
  ['reminders', 'time', "TEXT NOT NULL DEFAULT '09:00'"],
  ['users', 'currency', "TEXT NOT NULL DEFAULT 'USD'"],
  ['users', 'timezone', "TEXT NOT NULL DEFAULT 'UTC'"],
];

for (const [table, column, type] of addedColumns) {
  if (!columnsOf(table).includes(column)) {
    db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  }
}

// Email reminders were removed; the old NOT NULL column would break inserts.
if (columnsOf('reminders').includes('email')) {
  db.run('ALTER TABLE reminders DROP COLUMN email');
}
