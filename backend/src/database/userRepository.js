import { db } from './connection.js';

export function createUser({ id, email, passwordHash, userSecret, timezone }) {
  db.query(
    'INSERT INTO users (id, email, passwordHash, userSecret, createdAt, timezone) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, email, passwordHash, userSecret, new Date().toISOString(), timezone);

  return findUserById(id);
}

export function findUserById(id) {
  return db.query('SELECT * FROM users WHERE id = ?').get(id);
}

export function findUserByEmail(email) {
  return db.query('SELECT * FROM users WHERE email = ?').get(email);
}

// `fields` keys become column names, so only pass literal objects from server code.
export function updateUser(id, fields) {
  const assignments = Object.keys(fields).map((column) => `${column} = ?`).join(', ');
  db.query(`UPDATE users SET ${assignments} WHERE id = ?`).run(...Object.values(fields), id);

  return findUserById(id);
}
