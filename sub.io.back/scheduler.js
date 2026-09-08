import { CronJob } from 'cron';
import { listAllSubscriptions, markReminderSent, updateSubscriptionNextDate } from './db.js';
import { sendReminderEmail, isEmailConfigured } from './emailer.js';
import { sendReminderTelegramMessage, isTelegramConfigured } from './telegram.js';
import { getVault, isVaultConfigured } from './vault.js';

const jobs = new Map();

function computeFireDate(nextDate, daysBefore) {
  const fireDate = new Date(`${nextDate}T09:00:00`);
  fireDate.setDate(fireDate.getDate() - daysBefore);
  return fireDate;
}

function addMonths(date, amount) {
  const day = date.getDate();
  const result = new Date(date.getFullYear(), date.getMonth() + amount, 1);
  const lastDayOfTargetMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDayOfTargetMonth));
  return result;
}

function addYears(date, amount) {
  const targetYear = date.getFullYear() + amount;
  const lastDayOfTargetMonth = new Date(targetYear, date.getMonth() + 1, 0).getDate();
  return new Date(targetYear, date.getMonth(), Math.min(date.getDate(), lastDayOfTargetMonth));
}

function step(date, cycle) {
  return cycle === 'yearly' ? addYears(date, 1) : addMonths(date, 1);
}

// Walks nextDate forward to the first occurrence that is still due (>= today).
// If untilDate is set, stops as soon as the next occurrence would fall after it —
// once that happens the series has ended and nextDate settles on its final payment.
function advanceNextDate(nextDate, cycle, untilDate) {
  let date = new Date(`${nextDate}T00:00:00`);
  const now = new Date();
  const cap = untilDate ? new Date(`${untilDate}T00:00:00`) : null;

  while (date.getTime() < now.getTime()) {
    const candidate = step(date, cycle);
    if (cap && candidate.getTime() > cap.getTime()) break;
    date = candidate;
  }
  return date.toISOString().slice(0, 10);
}

function rollOverIfPast(sub) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextDate = new Date(`${sub.nextDate}T00:00:00`);
  if (nextDate.getTime() >= today.getTime()) return sub;

  const rolled = advanceNextDate(sub.nextDate, sub.cycle, sub.untilDate);
  if (rolled !== sub.nextDate) updateSubscriptionNextDate(sub.id, rolled);
  return { ...sub, nextDate: rolled };
}

function cancelReminderJob(reminderId) {
  const job = jobs.get(reminderId);
  if (job) {
    job.stop();
    jobs.delete(reminderId);
  }
}

export function cancelSubscriptionJobs(sub) {
  for (const reminder of sub.reminders) {
    cancelReminderJob(reminder.id);
  }
}

function scheduleReminder(sub, reminder) {
  cancelReminderJob(reminder.id);

  if (reminder.lastSentFor === sub.nextDate) return;

  const fireDate = computeFireDate(sub.nextDate, reminder.daysBefore);
  if (fireDate.getTime() <= Date.now()) return;

  const job = new CronJob(fireDate, async () => {
    try {
      const creds = isVaultConfigured() ? getVault(sub.userId) : {};

      if (isEmailConfigured(creds)) {
        await sendReminderEmail(creds, {
          toEmail: reminder.email,
          subscription: sub,
          daysBefore: reminder.daysBefore,
        });
        console.log(`Sent email reminder for "${sub.name}" to ${reminder.email}`);
      }

      if (isTelegramConfigured(creds)) {
        await sendReminderTelegramMessage(creds, { subscription: sub, daysBefore: reminder.daysBefore });
        console.log(`Sent Telegram reminder for "${sub.name}"`);
      }

      if (!isEmailConfigured(creds) && !isTelegramConfigured(creds)) {
        console.warn(`No email or Telegram configured for user ${sub.userId}; reminder for "${sub.name}" not sent.`);
      }

      markReminderSent(reminder.id, sub.nextDate);
    } catch (err) {
      console.error(`Failed to send reminder for "${sub.name}":`, err.message);
    } finally {
      jobs.delete(reminder.id);
    }
  });

  job.start();
  jobs.set(reminder.id, job);
}

export function scheduleSubscription(sub) {
  sub = rollOverIfPast(sub);
  for (const reminder of sub.reminders) {
    scheduleReminder(sub, reminder);
  }
}

export function rescheduleAll() {
  const subs = listAllSubscriptions();
  for (const sub of subs) {
    scheduleSubscription(sub);
  }
  console.log(`Scheduled reminder jobs for ${subs.length} subscription(s).`);
}

new CronJob('0 5 0 * * *', rescheduleAll, null, true);
