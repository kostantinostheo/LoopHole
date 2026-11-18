export const CURRENCIES = {
  USD: { symbol: '$', label: 'US Dollar (USD)' },
  EUR: { symbol: '€', label: 'Euro (EUR)' },
  GBP: { symbol: '£', label: 'British Pound (GBP)' },
};

export function formatMoney(amount, currency) {
  return `${(CURRENCIES[currency] ?? CURRENCIES.USD).symbol}${Number(amount).toFixed(2)}`;
}

export function cycleSuffix(cycle) {
  return cycle === 'yearly' ? '/yr' : '/mo';
}

export function formatPrice(sub, currency) {
  return formatMoney(sub.price, currency) + cycleSuffix(sub.cycle);
}

export function monthlyCost(sub) {
  return sub.cycle === 'yearly' ? sub.price / 12 : sub.price;
}

export function totalMonthlyCost(subscriptions) {
  return subscriptions.reduce((sum, sub) => sum + monthlyCost(sub), 0);
}
