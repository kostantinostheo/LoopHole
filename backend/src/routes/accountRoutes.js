import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { findUserByEmail, findUserById, updateUser } from '../database/userRepository.js';
import {
  hashPassword,
  issueToken,
  isValidTimezone,
  publicUser,
  verifyPassword,
} from '../services/authService.js';

const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP'];

const router = Router();

router.put('/email', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const existing = findUserByEmail(email);
  if (existing && existing.id !== req.userId) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  // The token carries the email, so issue a fresh one.
  const user = updateUser(req.userId, { email });
  res.json({ token: issueToken(user), user: publicUser(user) });
});

router.put('/currency', (req, res) => {
  const { currency } = req.body;
  if (!SUPPORTED_CURRENCIES.includes(currency)) {
    return res.status(400).json({ error: `Currency must be one of: ${SUPPORTED_CURRENCIES.join(', ')}` });
  }

  res.json({ user: publicUser(updateUser(req.userId, { currency })) });
});

router.put('/timezone', (req, res) => {
  const { timezone } = req.body;
  if (!isValidTimezone(timezone)) {
    return res.status(400).json({ error: 'Timezone must be a valid IANA timezone name' });
  }

  res.json({ user: publicUser(updateUser(req.userId, { timezone })) });
});

router.put('/password', async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  const user = findUserById(req.userId);
  if (!(await verifyPassword(currentPassword, user))) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  const userSecret = randomUUID();
  updateUser(req.userId, { passwordHash: await hashPassword(newPassword, userSecret), userSecret });
  res.json({ success: true });
});

export default router;
