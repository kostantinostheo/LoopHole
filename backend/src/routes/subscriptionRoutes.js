import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import {
  deleteSubscription,
  getSubscription,
  listUserSubscriptions,
  saveSubscription,
} from '../database/subscriptionRepository.js';
import { cancelReminders, scheduleReminders } from '../services/reminderScheduler.js';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const router = Router();

function fromRequestBody(body, id, userId) {
  return {
    id,
    userId,
    name: body.name,
    price: Number(body.price),
    cycle: body.cycle,
    nextDate: body.nextDate,
    untilDate: body.untilDate || null,
    category: body.category,
    reminders: (body.reminders ?? []).map((r) => ({
      id: r.id || randomUUID(),
      daysBefore: Number(r.daysBefore),
      time: TIME_PATTERN.test(r.time) ? r.time : '09:00',
      lastSentFor: r.lastSentFor ?? null,
    })),
  };
}

// Responds 404 unless the subscription exists and belongs to the caller.
function findOwned(req, res) {
  const subscription = getSubscription(req.params.id);
  if (subscription?.userId === req.userId) return subscription;

  res.status(404).json({ error: 'Subscription not found' });
}

router.get('/', (req, res) => {
  res.json(listUserSubscriptions(req.userId));
});

router.post('/', (req, res) => {
  const created = saveSubscription(fromRequestBody(req.body, randomUUID(), req.userId));
  scheduleReminders(created);
  res.status(201).json(created);
});

router.put('/:id', (req, res) => {
  const existing = findOwned(req, res);
  if (!existing) return;

  cancelReminders(existing);
  const updated = saveSubscription(fromRequestBody(req.body, existing.id, req.userId));
  scheduleReminders(updated);
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const existing = findOwned(req, res);
  if (!existing) return;

  cancelReminders(existing);
  deleteSubscription(existing.id);
  res.status(204).end();
});

export default router;
