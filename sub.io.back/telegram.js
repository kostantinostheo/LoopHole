import { Api, Bot } from 'node-telegram-bot-api';
import { run } from 'node-telegram-bot-api/node';

const runningBots = new Map();

export function isTelegramConfigured(creds) {
  return Boolean(creds?.telegramBotToken && creds?.telegramChatId);
}

export function startUserTelegramBot(userId, botToken) {
  stopUserTelegramBot(userId);
  if (!botToken) return;

  const bot = new Bot(botToken);

  bot.on('message', (ctx) => {
    ctx.reply(
      `Your chat ID is: ${ctx.chatId}\n\nSave this as your Telegram Chat ID in Settings to receive reminders here.`
    );
  });

  bot.catch((err) => console.error(`Telegram bot error (user ${userId}):`, err.message));

  run(bot).catch((err) => {
    console.error(`Telegram polling stopped for user ${userId}:`, err.message);
    runningBots.delete(userId);
  });
  runningBots.set(userId, bot);
}

export function stopUserTelegramBot(userId) {
  const bot = runningBots.get(userId);
  if (bot) {
    bot.stop();
    runningBots.delete(userId);
  }
}

export function sendTelegramMessage(creds, text) {
  if (!isTelegramConfigured(creds)) {
    return Promise.reject(new Error('Telegram is not configured for this account'));
  }
  const api = new Api(creds.telegramBotToken);
  return api.sendMessage({ chat_id: creds.telegramChatId, text });
}

export function sendReminderTelegramMessage(creds, { subscription, daysBefore }) {
  const text =
    `🔔 Reminder: ${subscription.name} renews in ${daysBefore} day(s)\n\n` +
    `Category: ${subscription.category}\n` +
    `Renewal date: ${subscription.nextDate}\n` +
    `Price: $${subscription.price.toFixed(2)} / ${subscription.cycle}`;
  return sendTelegramMessage(creds, text);
}

export function sendTestTelegramMessage(creds) {
  return sendReminderTelegramMessage(creds, {
    subscription: {
      name: 'Test Subscription',
      category: 'Test',
      nextDate: new Date().toISOString().slice(0, 10),
      price: 9.99,
      cycle: 'monthly',
    },
    daysBefore: 3,
  });
}
