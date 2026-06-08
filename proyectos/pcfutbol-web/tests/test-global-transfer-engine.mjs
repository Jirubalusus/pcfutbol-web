import assert from 'node:assert/strict';
import { GlobalTransferEngine, MARKET_ACTIVITY_RATES } from '../src/game/globalTransferEngine.js';

const makePlayers = (prefix, count = 18) => Array.from({ length: count }, (_, i) => ({
  id: `${prefix}_${i}`,
  name: `${prefix} Player ${i}`,
  position: ['GK', 'CB', 'CM', 'ST'][i % 4],
  overall: 62 + (i % 8),
  age: 20 + (i % 15),
  contractYears: 2,
  salary: 500 + i,
}));

const teams = [
  { id: 'a', name: 'Alpha CF', leagueId: 'segundaRFEF', budget: 1_234_567, players: makePlayers('A') },
  { id: 'b', name: 'Beta FC', leagueId: 'segundaRFEF', budget: 2_345_678, players: makePlayers('B') },
  { id: 'c', name: 'Gamma CD', leagueId: 'primeraRFEF', budget: 3_456_789, originalBudget: 9_999_999, players: makePlayers('C') },
];

assert.ok(MARKET_ACTIVITY_RATES.weeklySigningChance <= 0.10, 'ritmo de compras IA debe quedar por debajo del 10% semanal');
assert.ok(MARKET_ACTIVITY_RATES.weeklySaleChance <= 0.05, 'ritmo de ventas IA debe quedar por debajo del 5% semanal');

const engine = new GlobalTransferEngine(new Map(), 'a');
const initialized = engine.initializeTeams(teams);

assert.equal(initialized.get('a').budget, 1_234_567, 'preserva presupuesto existente de Alpha');
assert.equal(initialized.get('b').budget, 2_345_678, 'preserva presupuesto existente de Beta');
assert.equal(initialized.get('c').budget, 3_456_789, 'preserva presupuesto existente de Gamma');
assert.equal(initialized.get('c').originalBudget, 9_999_999, 'preserva originalBudget existente');

const beforeTotal = Array.from(initialized.values()).reduce((sum, t) => sum + t.budget, 0);

const beforePlayers = Array.from(initialized.values()).reduce((sum, t) => sum + t.players.length, 0);
const transfer = engine.executeTransfer(initialized.get('b').players[0], initialized.get('b'), initialized.get('c'), 100_000);
assert.ok(transfer, 'ejecuta un traspaso válido');
const afterPlayers = Array.from(initialized.values()).reduce((sum, t) => sum + t.players.length, 0);
assert.equal(afterPlayers, beforePlayers, 'un traspaso mueve un jugador, no lo clona');

const stale = engine.executeTransfer({ id: 'missing', name: 'Fantasma', position: 'ST', age: 22, overall: 70 }, initialized.get('b'), initialized.get('c'), 100_000);
assert.equal(stale, null, 'un target obsoleto no debe crear clones si no existe en el vendedor');
const afterStalePlayers = Array.from(initialized.values()).reduce((sum, t) => sum + t.players.length, 0);
assert.equal(afterStalePlayers, afterPlayers, 'un target obsoleto conserva el total de jugadores');

const rehydrated = new GlobalTransferEngine(new Map(), 'a');
rehydrated.initializeTeams(Array.from(initialized.values()));
const afterTotal = Array.from(rehydrated.allTeams.values()).reduce((sum, t) => sum + t.budget, 0);
assert.equal(afterTotal, beforeTotal, 'rehidratar el motor no debe recrear dinero del mercado');

const generated = new GlobalTransferEngine(new Map(), 'a');
generated.initializeTeams([{ id: 'fresh', name: 'Fresh FC', leagueId: 'segundaRFEF', players: makePlayers('F') }]);
assert.ok(Number.isFinite(generated.allTeams.get('fresh').budget), 'sigue generando presupuesto si falta budget');
assert.ok(generated.allTeams.get('fresh').budget >= 0, 'presupuesto generado válido');

// Regression: initializeTeams must not keep shared players-array references.
// Some generated fallback teams may reuse the same array; pushing a signing into one
// team must not silently add that player to every team sharing that original array.
const sharedPlayers = [
  { id: 'shared_forward', name: 'Shared Forward', position: 'CF', age: 24, overall: 73, salary: 100000 },
  { id: 'shared_gk', name: 'Shared Keeper', position: 'GK', age: 25, overall: 68, salary: 80000 },
];
const sharedEngine = new GlobalTransferEngine(new Map(), 'player_team');
sharedEngine.initializeTeams([
  { id: 'shared_a', name: 'Shared A', leagueId: 'laliga', players: sharedPlayers, budget: 10_000_000 },
  { id: 'shared_b', name: 'Shared B', leagueId: 'laliga', players: sharedPlayers, budget: 10_000_000 },
  { id: 'buyer', name: 'Buyer', leagueId: 'laliga', players: [{ id: 'buyer_gk', name: 'Buyer GK', position: 'GK', age: 25, overall: 70 }], budget: 10_000_000 },
]);
const fromShared = sharedEngine.allTeams.get('shared_a');
const otherShared = sharedEngine.allTeams.get('shared_b');
const buyerShared = sharedEngine.allTeams.get('buyer');
sharedEngine.executeTransfer(fromShared.players[0], fromShared, buyerShared, 500_000);
assert.equal(fromShared.players.some(p => p.id === 'shared_forward'), false, 'seller loses transferred player');
assert.equal(otherShared.players.some(p => p.id === 'shared_forward'), true, 'unrelated team sharing original array keeps its own player copy');
assert.equal(otherShared.players.length, 2, 'unrelated shared-reference team is not mutated by buyer/seller changes');
assert.equal(buyerShared.players.some(p => p.id === 'shared_forward'), true, 'buyer receives transferred player');

console.log('✅ globalTransferEngine budget preservation OK');
