import { Router } from 'express';
import { findUserById } from '../database/userRepository.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { sendTestReminder, startBot, stopBot } from '../services/telegramService.js';
import { readVault, saveVault } from '../services/vaultService.js';

const router = Router();

router.get('/vault', requireAuth, (req, res) => {
  res.json(readVault(req.userId));
});

router.put('/vault', requireAuth, (req, res) => {
  const saved = saveVault(req.userId, req.body);

  if ('telegramBotToken' in req.body) {
    if (saved.telegramBotToken) startBot(req.userId, saved.telegramBotToken);
    else stopBot(req.userId);
  }

  res.json(saved);
});

router.post('/test-telegram', requireAuth, async (req, res) => {
  await sendTestReminder(readVault(req.userId), findUserById(req.userId)?.currency);
  res.json({ sent: true });
});

export default router;
