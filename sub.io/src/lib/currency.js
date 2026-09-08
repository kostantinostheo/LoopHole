export const CURRENCIES = {
  USD: { symbol: '$', label: 'US Dollar (USD)' },
  EUR: { symbol: '€', label: 'Euro (EUR)' },
  GBP: { symbol: '£', label: 'British Pound (GBP)' },
};

export function currencySymbol(code) {
  return CURRENCIES[code]?.symbol || CURRENCIES.USD.symbol;
}

export function formatMoney(amount, code) {
  return `${currencySymbol(code)}${Number(amount).toFixed(2)}`;
}
