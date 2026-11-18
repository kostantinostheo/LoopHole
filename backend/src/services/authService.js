import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

// Each user has a random secret peppered into the hash; it rotates on password change.
export function hashPassword(password, userSecret) {
  return bcrypt.hash(`${password}:${userSecret}`, 10);
}

export function verifyPassword(password, user) {
  return bcrypt.compare(`${password}:${user.userSecret}`, user.passwordHash);
}

export function issueToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

export function publicUser({ id, email, currency, timezone }) {
  return { id, email, currency: currency || 'USD', timezone: timezone || 'UTC' };
}

export function isValidTimezone(timezone) {
  if (typeof timezone !== 'string' || !timezone) return false;

  try {
    new Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}
