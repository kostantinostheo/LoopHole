import express from 'express';
import { requireAuth } from './middleware/requireAuth.js';
import accountRoutes from './routes/accountRoutes.js';
import authRoutes from './routes/authRoutes.js';
import subscriptionRoutes from './routes/subscriptionRoutes.js';
import vaultRoutes from './routes/vaultRoutes.js';
import { startScheduler } from './services/reminderScheduler.js';
import { startBot } from './services/telegramService.js';
import { isVaultConfigured, listVaultUserIds, readVault } from './services/vaultService.js';

const app = express();

app.use(express.json());
app.use((req, res, next) => {
  req.body ??= {};
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/account', requireAuth, accountRoutes);
app.use('/api/subscriptions', requireAuth, subscriptionRoutes);
app.use('/api', vaultRoutes);

// Express 5 forwards thrown and rejected handler errors here.
app.use((err, req, res, _next) => {
  console.error(`${req.method} ${req.path} failed:`, err.message);
  res.status(err.status || 500).json({ error: err.message });
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`LoopHole backend listening on port ${PORT}`);
  startScheduler();

  if (!isVaultConfigured()) {
    console.warn('VAULT_KEY not set — per-user integrations (Telegram) are disabled.');
    return;
  }

  let started = 0;
  for (const userId of listVaultUserIds()) {
    const { telegramBotToken } = readVault(userId);
    if (!telegramBotToken) continue;

    startBot(userId, telegramBotToken);
    started += 1;
  }
  console.log(`Started Telegram polling for ${started} user(s).`);
});
