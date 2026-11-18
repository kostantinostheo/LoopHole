import { CATEGORIES } from './categories';
import { occurrencesInRange } from './dates';
import { monthlyCost, totalMonthlyCost } from './money';

// [[category, monthly amount]], largest first; unknown categories count as 'Other'.
export function spendByCategory(subscriptions) {
  const totals = Object.fromEntries(CATEGORIES.map((category) => [category, 0]));
  for (const sub of subscriptions) {
    totals[Object.hasOwn(totals, sub.category) ? sub.category : 'Other'] += monthlyCost(sub);
  }

  return Object.entries(totals)
    .filter(([, amount]) => amount > 0)
    .sort((a, b) => b[1] - a[1]);
}

export function cycleSplit(subscriptions) {
  const group = (yearly) => {
    const subs = subscriptions.filter((sub) => (sub.cycle === 'yearly') === yearly);
    return { count: subs.length, monthlyCost: totalMonthlyCost(subs) };
  };

  return { monthly: group(false), yearly: group(true) };
}

// Actual charges per calendar month, starting with the current one.
export function projectedSpend(subscriptions, months = 12) {
  const now = new Date();

  return Array.from({ length: months }, (_, i) => {
    const start = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + i + 1, 0);
    const total = subscriptions.reduce(
      (sum, sub) => sum + occurrencesInRange(sub, start, end).length * sub.price,
      0
    );
    return { month: start, total };
  });
}
