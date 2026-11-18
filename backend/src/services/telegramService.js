import { Api, Bot } from 'node-telegram-bot-api';
import { run } from 'node-telegram-bot-api/node';

// Every user brings their own bot; polling it lets the bot reply with the chat ID.
const runningBots = new Map();

// Mirrors the frontend's CURRENCIES (frontend/src/utils/money.js).
const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£' };

export function isTelegramConfigured(creds) {
  return Boolean(creds?.telegramBotToken && creds?.telegramChatId);
}

export function startBot(userId, botToken) {
  stopBot(userId);
  if (!botToken) return;

  const bot = new Bot(botToken);
  bot.on('message', (ctx) =>
    ctx.reply(
      `Your chat ID is: ${ctx.chatId}\n\n` +
        'Save this as your Telegram Chat ID in Settings to receive reminders here.'
    )
  );
  bot.catch((err) => console.error(`Telegram bot error (user ${userId}):`, err.message));

  run(bot).catch((err) => {
    console.error(`Telegram polling stopped for user ${userId}:`, err.message);
    runningBots.delete(userId);
  });
  runningBots.set(userId, bot);
}

export function stopBot(userId) {
  runningBots.get(userId)?.stop();
  runningBots.delete(userId);
}

export async function sendReminder(creds, subscription, daysBefore) {
  if (!isTelegramConfigured(creds)) {
    throw new Error('Telegram is not configured for this account');
  }

  const text =
    `🔔 Reminder: ${subscription.name} renews in ${daysBefore} day(s)\n\n` +
    `Category: ${subscription.category}\n` +
    `Renewal date: ${subscription.nextDate}\n` +
    `Price: ${CURRENCY_SYMBOLS[subscription.currency] ?? '$'}${subscription.price.toFixed(2)} / ${subscription.cycle}`;

  return new Api(creds.telegramBotToken).sendMessage({ chat_id: creds.telegramChatId, text });
}

export function sendTestReminder(creds, currency) {
  const sample = {
    name: 'Test Subscription',
    category: 'Test',
    nextDate: new Date().toISOString().slice(0, 10),
    price: 9.99,
    cycle: 'monthly',
    currency,
  };

  return sendReminder(creds, sample, 3);
}
