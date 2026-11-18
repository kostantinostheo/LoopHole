import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { createUser, findUserByEmail, findUserById, updateUser } from '../database/userRepository.js';
import { requireAuth } from '../middleware/requireAuth.js';
import {
  hashPassword,
  issueToken,
  isValidTimezone,
  publicUser,
  verifyPassword,
} from '../services/authService.js';

const router = Router();

router.post('/register', async (req, res) => {
  const { email, password, timezone } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  if (findUserByEmail(email)) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const userSecret = randomUUID();
  const user = createUser({
    id: randomUUID(),
    email,
    userSecret,
    passwordHash: await hashPassword(password, userSecret),
    timezone: isValidTimezone(timezone) ? timezone : 'UTC',
  });

  res.status(201).json({ token: issueToken(user), user: publicUser(user) });
});

router.post('/login', async (req, res) => {
  const { email, password, timezone } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  let user = findUserByEmail(email);
  if (!user || !(await verifyPassword(password, user))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Follow the browser's timezone so reminders keep up when the user travels.
  if (isValidTimezone(timezone) && timezone !== user.timezone) {
    user = updateUser(user.id, { timezone });
  }

  res.json({ token: issueToken(user), user: publicUser(user) });
});

router.get('/me', requireAuth, (req, res) => {
  const user = findUserById(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  res.json({ user: publicUser(user) });
});

export default router;
