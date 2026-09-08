import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import {
  createUser,
  findUserByEmail,
  findUserById,
  updateUserEmail,
  updateUserPassword,
  updateUserCurrency,
  listSubscriptionsByUser,
  getSubscription,
  insertSubscription,
  updateSubscriptionRow,
  deleteSubscription,
} from './db.js';
import { hashPassword, verifyPassword, generateToken, requireAuth } from './auth.js';
import { scheduleSubscription, cancelSubscriptionJobs, rescheduleAll } from './scheduler.js';
import { sendTestEmail } from './emailer.js';
import { sendTestTelegramMessage, startUserTelegramBot, stopUserTelegramBot } from './telegram.js';
import { getVault, saveVault, listVaultUserIds, isVaultConfigured } from './vault.js';

const app = express();
app.use(cors());
app.use(express.json());

const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP'];

function serializeUser(user) {
  return { id: user.id, email: user.email, currency: user.currency || 'USD' };
}

function normalizeReminders(reminders = [], userId, userEmail) {
  return reminders.map((r) => ({
    id: r.id || randomUUID(),
    userId,
    email: userEmail,
    daysBefore: Number(r.daysBefore),
    lastSentFor: r.lastSentFor ?? null,
  }));
}

// --- auth ---

app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  if (findUserByEmail(email)) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const userSecret = randomUUID();
  const passwordHash = await hashPassword(password, userSecret);
  const user = createUser({
    id: randomUUID(),
    email,
    passwordHash,
    userSecret,
    createdAt: new Date().toISOString(),
  });

  const token = generateToken(user);
  res.status(201).json({ token, user: serializeUser(user) });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = findUserByEmail(email);
  if (!user) return res.status(401).json({ error: 'Invalid email or password' });

  const valid = await verifyPassword(password, user.userSecret, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

  const token = generateToken(user);
  res.json({ token, user: serializeUser(user) });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  const user = findUserById(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: serializeUser(user) });
});

app.put('/api/account/email', requireAuth, (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const existing = findUserByEmail(email);
  if (existing && existing.id !== req.userId) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const user = updateUserEmail(req.userId, email);
  const token = generateToken(user);
  res.json({ token, user: serializeUser(user) });
});

app.put('/api/account/currency', requireAuth, (req, res) => {
  const { currency } = req.body || {};
  if (!SUPPORTED_CURRENCIES.includes(currency)) {
    return res.status(400).json({ error: `Currency must be one of: ${SUPPORTED_CURRENCIES.join(', ')}` });
  }

  const user = updateUserCurrency(req.userId, currency);
  res.json({ user: serializeUser(user) });
});

app.put('/api/account/password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  const user = findUserById(req.userId);
  const valid = await verifyPassword(currentPassword, user.userSecret, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

  const userSecret = randomUUID();
  const passwordHash = await hashPassword(newPassword, userSecret);
  updateUserPassword(req.userId, passwordHash, userSecret);
  res.json({ success: true });
});

// --- subscriptions (scoped to the authenticated user) ---

app.get('/api/subscriptions', requireAuth, (req, res) => {
  res.json(listSubscriptionsByUser(req.userId));
});

app.post('/api/subscriptions', requireAuth, (req, res) => {
  const body = req.body;
  const sub = {
    id: randomUUID(),
    userId: req.userId,
    name: body.name,
    price: Number(body.price),
    cycle: body.cycle,
    nextDate: body.nextDate,
    untilDate: body.untilDate || null,
    category: body.category,
    reminders: normalizeReminders(body.reminders, req.userId, req.userEmail),
  };
  const created = insertSubscription(sub);
  scheduleSubscription(created);
  res.status(201).json(created);
});

app.put('/api/subscriptions/:id', requireAuth, (req, res) => {
  const existing = getSubscription(req.params.id);
  if (!existing || existing.userId !== req.userId) {
    return res.status(404).json({ error: 'Subscription not found' });
  }

  cancelSubscriptionJobs(existing);

  const body = req.body;
  const updated = updateSubscriptionRow(req.params.id, {
    userId: req.userId,
    name: body.name,
    price: Number(body.price),
    cycle: body.cycle,
    nextDate: body.nextDate,
    untilDate: body.untilDate || null,
    category: body.category,
    reminders: normalizeReminders(body.reminders, req.userId, req.userEmail),
  });

  scheduleSubscription(updated);
  res.json(updated);
});

app.delete('/api/subscriptions/:id', requireAuth, (req, res) => {
  const existing = getSubscription(req.params.id);
  if (!existing || existing.userId !== req.userId) {
    return res.status(404).json({ error: 'Subscription not found' });
  }

  cancelSubscriptionJobs(existing);
  deleteSubscription(req.params.id);
  res.status(204).end();
});

// --- vault (per-user integration secrets, never stored in the DB) ---

app.get('/api/vault', requireAuth, (req, res) => {
  if (!isVaultConfigured()) {
    return res.status(500).json({ error: 'Vault is not configured (missing VAULT_KEY on the server)' });
  }
  try {
    res.json(getVault(req.userId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/vault', requireAuth, (req, res) => {
  if (!isVaultConfigured()) {
    return res.status(500).json({ error: 'Vault is not configured (missing VAULT_KEY on the server)' });
  }
  try {
    const saved = saveVault(req.userId, req.body || {});

    if ('telegramBotToken' in (req.body || {})) {
      if (saved.telegramBotToken) {
        startUserTelegramBot(req.userId, saved.telegramBotToken);
      } else {
        stopUserTelegramBot(req.userId);
      }
    }

    res.json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/test-email', requireAuth, async (req, res) => {
  const email = req.body?.email || req.userEmail;
  try {
    const creds = getVault(req.userId);
    await sendTestEmail(creds, email);
    res.json({ sent: true, email });
  } catch (err) {
    console.error('Test email failed:', err);
    res.status(500).json({ error: err.message || err.text || String(err) });
  }
});

app.post('/api/test-telegram', requireAuth, async (req, res) => {
  try {
    const creds = getVault(req.userId);
    await sendTestTelegramMessage(creds);
    res.json({ sent: true });
  } catch (err) {
    console.error('Test Telegram message failed:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`sub.io backend listening on port ${PORT}`);
  rescheduleAll();

  if (isVaultConfigured()) {
    let started = 0;
    for (const userId of listVaultUserIds()) {
      const creds = getVault(userId);
      if (creds.telegramBotToken) {
        startUserTelegramBot(userId, creds.telegramBotToken);
        started += 1;
      }
    }
    console.log(`Started Telegram polling for ${started} user(s).`);
  } else {
    console.warn('VAULT_KEY not set — per-user integrations (EmailJS/Telegram) are disabled.');
  }
});
