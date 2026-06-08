/**
 * Audit: Camino a la Gloria small-team yearly economy.
 *
 * Pablo's report (paraphrased): with small clubs in Camino a la Gloria you earn
 * too much every year — a tiny side gets rich just by ending/promoting season
 * after season. The fix tones the yearly cash DOWN moderately (not punitively)
 * and removes the duplicated promotion grant.
 *
 * Root cause guarded here:
 *   - The promotion grant used to be added TWICE: once inside
 *     gloryEngine.processSeasonEnd (`budget += nextDiv.budget`, synced to
 *     state.money via budgetDiff) and again as the START_NEW_SEASON moneyChange
 *     (`moneyBonus = nextDiv.budget`). For 2RFEF->1RFEF that was ~€1M instead of
 *     a sane one-time grant.
 *
 * This audit asserts, with NO network/IO:
 *   PART A — the centralised helper returns bounded values for every division and
 *            for promotion / non-promotion.
 *   PART B — no double promotion grant: processSeasonEnd no longer mutates budget
 *            on a clean promotion (without sheikh), and the 2RFEF->1RFEF net is in
 *            a sane band ( >0 and <= 350k ).
 *   PART C — a full 2RFEF -> LaLiga climb (3 promotions) stays far below the old
 *            compounding bug: positive, but total net grants/operating <= ~5M.
 *   PART D — non-promotion seasons for a small club are near-flat and never push a
 *            healthy club negative on a normal start.
 *
 * Run: npm run audit:glory-small-team-economy
 */
import assert from 'node:assert/strict';

const {
  calculateGlorySeasonFinancials,
  getGlorySeasonGrant,
  getGloryOperatingCost,
  getGloryFinishMoney,
  processSeasonEnd,
  GLORY_DIVISIONS,
} = await import('../src/game/gloryEngine.js');

const DIVISIONS = GLORY_DIVISIONS.map((d) => d.id); // segundaRFEF..laliga (low->high)
const fmt = (n) => `€${(n / 1000).toFixed(0)}k`;

// ── PART A — bounded helper for every division + promotion/non-promotion ─────
const SANE_NET_CEIL = 4_000_000; // a single season net must never exceed this
for (const divisionId of DIVISIONS) {
  for (const position of [1, 2, 5, 10, 18]) {
    for (const promoted of [false, true]) {
      const r = calculateGlorySeasonFinancials({ divisionId, position, promoted });
      assert.ok(Number.isFinite(r.net), `net no finito en ${divisionId} pos${position} promo=${promoted}`);
      assert.ok(r.finishMoney > 0, `finishMoney debe ser > 0 (${divisionId})`);
      assert.ok(r.operatingCost > 0, `operatingCost debe ser > 0 (${divisionId})`);
      assert.ok(r.net <= SANE_NET_CEIL, `net demasiado alto en ${divisionId} pos${position} promo=${promoted}: ${r.net}`);
      // grant only when promoted AND not already in the top division
      const isTop = divisionId === DIVISIONS[DIVISIONS.length - 1];
      if (promoted && !isTop) assert.ok(r.grant > 0, `grant debe existir al ascender desde ${divisionId}`);
      else assert.equal(r.grant, 0, `grant debe ser 0 (${divisionId}, promo=${promoted})`);
    }
  }
}
// finish money is monotonic in position (better finish >= worse finish)
for (const divisionId of DIVISIONS) {
  assert.ok(getGloryFinishMoney(divisionId, 1) >= getGloryFinishMoney(divisionId, 18),
    `finishMoney debe premiar mejores posiciones en ${divisionId}`);
}
// operating cost grows with tier strength (laliga most expensive)
assert.ok(
  getGloryOperatingCost('segundaRFEF') < getGloryOperatingCost('primeraRFEF') &&
  getGloryOperatingCost('primeraRFEF') < getGloryOperatingCost('segunda') &&
  getGloryOperatingCost('segunda') < getGloryOperatingCost('laliga'),
  'El coste operativo debe crecer por categoría'
);
// the top division yields no promotion grant
assert.equal(getGlorySeasonGrant('laliga', true), 0, 'No debe haber grant por encima de LaLiga');

// ── PART B — no double promotion grant + sane 2RFEF->1RFEF net ────────────────
// processSeasonEnd must NOT mutate budget on a clean promotion (no sheikh): the
// single grant is applied by the caller via calculateGlorySeasonFinancials.
const baseState = {
  division: 'segundaRFEF',
  divisionTier: 4,
  season: 1,
  budget: 200000,
  squad: [{ id: 'p1', name: 'X', overall: 55, age: 24, morale: 70, salary: 40000 }],
  perks: {},
  pickedCards: [],
  history: [],
  sheikhSeasons: 0,
};
const processedPromo = processSeasonEnd(baseState, 1); // finished 1st -> promoted
assert.equal(processedPromo.division, 'primeraRFEF', 'Debe ascender a Primera RFEF');
assert.equal(processedPromo.budget, baseState.budget,
  `processSeasonEnd NO debe tocar el presupuesto al ascender (era ${baseState.budget}, ahora ${processedPromo.budget})`);

const promo2to1 = calculateGlorySeasonFinancials({ divisionId: 'segundaRFEF', position: 1, promoted: true });
assert.ok(promo2to1.net > 0, '2RFEF->1RFEF debe ser net positivo');
assert.ok(promo2to1.net <= 350_000,
  `2RFEF->1RFEF net demasiado alto (¿grant duplicado?): ${promo2to1.net}`);

// sheikh expiry consequence still bites: budget /5 on the season it expires
const sheikhState = { ...baseState, budget: 2_000_000, sheikhSeasons: 1 };
const processedSheikh = processSeasonEnd(sheikhState, 10); // mid-table, no promotion
assert.equal(processedSheikh.budget, Math.round(2_000_000 / 5),
  'El castigo del Jeque Fantasma (presupuesto/5) debe conservarse');

// ── PART C — full 2RFEF -> LaLiga climb stays far below the old compounding ──
const climb = [
  { divisionId: 'segundaRFEF', label: '2RFEF -> 1RFEF', band: [200_000, 300_000] },
  { divisionId: 'primeraRFEF', label: '1RFEF -> Segunda', band: [600_000, 900_000] },
  { divisionId: 'segunda', label: 'Segunda -> LaLiga', band: [2_500_000, 4_000_000] },
];
let totalNet = 0;
const climbReport = [];
for (const step of climb) {
  const r = calculateGlorySeasonFinancials({ divisionId: step.divisionId, position: 1, promoted: true });
  assert.ok(r.net >= step.band[0] && r.net <= step.band[1],
    `${step.label} fuera de banda: ${r.net} (esperado ${step.band[0]}–${step.band[1]})`);
  totalNet += r.net;
  climbReport.push({ ...step, net: r.net });
}
assert.ok(totalNet > 0, 'El ascenso 2RFEF->LaLiga debe ser net positivo');
assert.ok(totalNet <= 5_000_000,
  `El ascenso completo compone demasiado: ${totalNet} (límite ~5M)`);

// ── PART D — non-promotion small-club seasons are near-flat, never bankrupting ─
for (const position of [1, 5, 10, 18]) {
  const r = calculateGlorySeasonFinancials({ divisionId: 'segundaRFEF', position, promoted: false });
  assert.ok(r.net >= 0, `2RFEF sin ascenso (pos${position}) no debe ser negativo: ${r.net}`);
  assert.ok(r.net <= 80_000, `2RFEF sin ascenso (pos${position}) demasiado lucrativo: ${r.net}`);
}
// a healthy 200k club surviving several flat seasons must not go bankrupt
let money = 200_000;
for (let s = 0; s < 5; s++) {
  money += calculateGlorySeasonFinancials({ divisionId: 'segundaRFEF', position: 10, promoted: false }).net;
}
assert.ok(money >= 200_000, `5 temporadas planas no deben empobrecer al club: ${money}`);

// ── report ───────────────────────────────────────────────────────────────────
console.log('✅ Audit glory-small-team-economy OK');
console.log('   Bandas netas por temporada (antes de fichajes/cartas):');
console.log(`     - 2RFEF sin ascenso (top5):     ${fmt(calculateGlorySeasonFinancials({ divisionId: 'segundaRFEF', position: 3, promoted: false }).net)}`);
console.log(`     - 2RFEF sin ascenso (colista):  ${fmt(calculateGlorySeasonFinancials({ divisionId: 'segundaRFEF', position: 18, promoted: false }).net)}`);
for (const r of climbReport) {
  console.log(`     - ${r.label.padEnd(18)} ${fmt(r.net)}`);
}
console.log(`   Total neto ascenso 2RFEF->LaLiga: €${(totalNet / 1_000_000).toFixed(2)}M (límite 5M)`);
console.log('   processSeasonEnd ya NO duplica el grant de ascenso ✔');
console.log('   Castigo Jeque Fantasma (presupuesto/5) conservado ✔');
