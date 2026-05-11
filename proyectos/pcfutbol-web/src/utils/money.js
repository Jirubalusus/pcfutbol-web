export function toFiniteMoney(value, fallback = 0) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  if (typeof value === 'string') {
    const normalized = value.trim().replace(/\s/g, '').replace(/,/g, '.');
    if (normalized === '') return fallback;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

export function formatCompactMoney(value, options = {}) {
  const {
    currency = '€',
    fallbackValue = 0,
    zero = `${currency}0`,
    decimalsForMillions = 1,
    space = '',
  } = options;

  const amount = toFiniteMoney(value, fallbackValue);
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);

  if (abs === 0) return zero;
  if (abs >= 1_000_000) return `${sign}${currency}${space}${(abs / 1_000_000).toFixed(decimalsForMillions)}M`;
  if (abs >= 1_000) return `${sign}${currency}${space}${(abs / 1_000).toFixed(0)}K`;
  return `${sign}${currency}${space}${Math.round(abs)}`;
}
