import { CronJob } from 'cron';
import { DateTime } from 'luxon';
import {
  listAllSubscriptions,
  markReminderSent,
  updateNextDate,
} from '../database/subscriptionRepository.js';
import { isTelegramConfigured, sendReminder } from './telegramService.js';
import { isVaultConfigured, readVault } from './vaultService.js';

const jobs = new Map(); // reminder id -> CronJob

// Moves a past renewal forward to the first one still due, stopping at untilDate.
function rollOver(sub) {
  const today = DateTime.now().startOf('day');
  const until = sub.untilDate && DateTime.fromISO(sub.untilDate);
  const cycle = sub.cycle === 'yearly' ? { years: 1 } : { months: 1 };

  let date = DateTime.fromISO(sub.nextDate);
  while (date < today) {
    const next = date.plus(cycle);
    if (until && next > until) break;
    date = next;
  }

  const nextDate = date.toISODate();
  if (nextDate === sub.nextDate) return sub;

  updateNextDate(sub.id, nextDate);
  return { ...sub, nextDate };
}

async function deliver(sub, reminder) {
  try {
    const creds = isVaultConfigured() ? readVault(sub.userId) : {};

    if (isTelegramConfigured(creds)) {
      await sendReminder(creds, sub, reminder.daysBefore);
      console.log(`Sent Telegram reminder for "${sub.name}"`);
    } else {
      console.warn(`No Telegram configured for user ${sub.userId}; reminder for "${sub.name}" not sent.`);
    }

    markReminderSent(reminder.id, sub.nextDate);
  } catch (err) {
    console.error(`Failed to send reminder for "${sub.name}":`, err.message);
  } finally {
    jobs.delete(reminder.id);
  }
}

export function cancelReminders(sub) {
  for (const { id } of sub.reminders) {
    jobs.get(id)?.stop();
    jobs.delete(id);
  }
}

export function scheduleReminders(sub) {
  sub = rollOver(sub);
  cancelReminders(sub);

  for (const reminder of sub.reminders) {
    if (reminder.lastSentFor === sub.nextDate) continue;

    // Wall-clock time in the owner's timezone, not the server's.
    const fireAt = DateTime.fromISO(`${sub.nextDate}T${reminder.time}`, { zone: sub.timezone })
      .minus({ days: reminder.daysBefore });
    if (fireAt <= DateTime.now()) continue;

    jobs.set(reminder.id, new CronJob(fireAt.toJSDate(), () => deliver(sub, reminder), null, true));
  }
}

function scheduleAll() {
  const subs = listAllSubscriptions();
  subs.forEach(scheduleReminders);
  console.log(`Scheduled reminder jobs for ${subs.length} subscription(s).`);
}

// Reschedule now and every night, so renewals roll over and new reminders get queued.
export function startScheduler() {
  scheduleAll();
  new CronJob('0 5 0 * * *', scheduleAll, null, true);
}
