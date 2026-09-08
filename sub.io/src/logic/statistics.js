import { occurrencesInRange } from './calendar';

export function monthlyEquivalent(sub) {
  return sub.cycle === 'yearly' ? sub.price / 12 : sub.price;
}

export function annualEquivalent(sub) {
  return sub.cycle === 'yearly' ? sub.price : sub.price * 12;
}

export function totalMonthlySpend(subscriptions) {
  return subscriptions.reduce((sum, sub) => sum + monthlyEquivalent(sub), 0);
}

export function totalAnnualSpend(subscriptions) {
  return subscriptions.reduce((sum, sub) => sum + annualEquivalent(sub), 0);
}

export function spendByCategory(subscriptions, categories) {
  const totals = new Map(categories.map((category) => [category, 0]));
  for (const sub of subscriptions) {
    const key = totals.has(sub.category) ? sub.category : 'Other';
    totals.set(key, (totals.get(key) || 0) + monthlyEquivalent(sub));
  }
  return categories.map((category) => ({ category, amount: totals.get(category) || 0 }));
}

export function cycleSplit(subscriptions) {
  const monthly = subscriptions.filter((sub) => sub.cycle !== 'yearly');
  const yearly = subscriptions.filter((sub) => sub.cycle === 'yearly');
  return {
    monthly: {
      count: monthly.length,
      monthlyCost: monthly.reduce((sum, sub) => sum + sub.price, 0),
    },
    yearly: {
      count: yearly.length,
      monthlyCost: yearly.reduce((sum, sub) => sum + monthlyEquivalent(sub), 0),
    },
  };
}

export function extremeSubscriptions(subscriptions) {
  if (subscriptions.length === 0) return { cheapest: null, priciest: null };
  const sorted = [...subscriptions].sort(
    (a, b) => monthlyEquivalent(a) - monthlyEquivalent(b)
  );
  return { cheapest: sorted[0], priciest: sorted[sorted.length - 1] };
}

// Subscriptions only store their next unpaid renewal date, so projecting future
// months reuses the same forward/backward occurrence walk as the calendar view.
export function projectedMonthlySpend(subscriptions, monthsCount = 12, from = new Date()) {
  const results = [];
  for (let i = 0; i < monthsCount; i++) {
    const monthStart = new Date(from.getFullYear(), from.getMonth() + i, 1);
    const monthEnd = new Date(from.getFullYear(), from.getMonth() + i + 1, 0);
    let total = 0;
    for (const sub of subscriptions) {
      total += occurrencesInRange(sub, monthStart, monthEnd).length * sub.price;
    }
    results.push({ month: monthStart, total });
  }
  return results;
}
