import assert from 'node:assert/strict';
import {
  generateSeasonEndOffers,
  shouldEndProManagerCareerAfterDismissal,
} from '../src/game/proManagerEngine.js';

const makeTeam = (id, ovr = 55) => ({
  id,
  name: id.toUpperCase(),
  reputation: 2,
  budget: 1_500_000,
  players: Array.from({ length: 18 }, (_, index) => ({ id: `${id}-p${index}`, overall: ovr }))
});

const leagueIds = [
  'laliga', 'segunda', 'premier', 'championship', 'seriea', 'ligue1',
  'bundesliga', 'eredivisie', 'argentina', 'brasileirao', 'paraguay', 'venezuela'
];

const getters = Object.fromEntries(leagueIds.map((leagueId, leagueIndex) => [
  leagueId,
  () => Array.from({ length: 4 }, (_, teamIndex) => makeTeam(`${leagueId}-${teamIndex}`, 50 + ((leagueIndex + teamIndex) % 8)))
]));

const firedOffers = generateSeasonEndOffers(5, 'laliga', 'current-team', getters, { wasFired: true });
assert.ok(firedOffers.length >= 5 && firedOffers.length <= 6, `Despido debe generar 5 o 6 ofertas, generó ${firedOffers.length}`);
assert.equal(new Set(firedOffers.map(o => o.team.id)).size, firedOffers.length, 'Las ofertas de despido no deben repetir equipo');
assert.ok(firedOffers.every(o => o.team.id !== 'current-team'), 'No debe ofrecer renovar/seguir con el equipo que te echó');

assert.equal(shouldEndProManagerCareerAfterDismissal(4, [2]), true, 'Segundo despido con 2 temporadas de diferencia debe perder la partida');
assert.equal(shouldEndProManagerCareerAfterDismissal(5, [2]), false, 'Despido después de más de 2 temporadas no debe perder la partida');
assert.equal(shouldEndProManagerCareerAfterDismissal(2, []), false, 'Primer despido no debe perder la partida');

console.log(JSON.stringify({ ok: true, firedOffers: firedOffers.length }));
