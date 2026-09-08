import emailjs from '@emailjs/nodejs';

export function isEmailConfigured(creds) {
  return Boolean(
    creds?.emailjsPublicKey &&
      creds?.emailjsPrivateKey &&
      creds?.emailjsServiceId &&
      creds?.emailjsTemplateId
  );
}

export function sendReminderEmail(creds, { toEmail, subscription, daysBefore }) {
  if (!isEmailConfigured(creds)) {
    return Promise.reject(new Error('EmailJS is not configured for this account'));
  }
  return emailjs.send(
    creds.emailjsServiceId,
    creds.emailjsTemplateId,
    {
      to_email: toEmail,
      subscription_name: subscription.name,
      category: subscription.category,
      due_date: subscription.nextDate,
      price: subscription.price.toFixed(2),
      cycle: subscription.cycle,
      days_before: daysBefore,
    },
    { publicKey: creds.emailjsPublicKey, privateKey: creds.emailjsPrivateKey }
  );
}

export function sendTestEmail(creds, toEmail) {
  return sendReminderEmail(creds, {
    toEmail,
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
