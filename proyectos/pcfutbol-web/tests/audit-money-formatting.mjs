import assert from 'node:assert/strict';
import { formatCompactMoney, toFiniteMoney } from '../src/utils/money.js';

const invalidValues = [undefined, null, Number.NaN, Infinity, -Infinity, '', '   ', 'abc', {}, []];

for (const value of invalidValues) {
  assert.equal(toFiniteMoney(value), 0, `toFiniteMoney should default invalid value ${String(value)} to 0`);
  const formatted = formatCompactMoney(value);
  assert.equal(formatted, '€0', `Invalid money value ${String(value)} should render as €0, got ${formatted}`);
  assert.ok(!/NaN|Infinity/.test(formatted), `Formatted value should never contain NaN/Infinity: ${formatted}`);
}

assert.equal(formatCompactMoney(1_250_000), '€1.3M');
assert.equal(formatCompactMoney(25_000), '€25K');
assert.equal(formatCompactMoney(750), '€750');
assert.equal(formatCompactMoney(-1_250_000), '-€1.3M');
assert.equal(formatCompactMoney('1200000'), '€1.2M');
assert.equal(formatCompactMoney('1200000', { currency: '$' }), '$1.2M');
assert.equal(formatCompactMoney(undefined, { zero: '0' }), '0');

console.log('✅ Money formatter handles invalid values without NaN/Infinity');
