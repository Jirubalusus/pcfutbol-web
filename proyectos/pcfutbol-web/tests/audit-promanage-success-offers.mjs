import assert from 'node:assert/strict';
import {
  calculateOfferMomentum,
  generateSeasonEndOffers,
} from '../src/game/proManagerEngine.js';

const makeTeam = (id, ovr, reputation = 3) => ({
  id,
  name: id.toUpperCase(),
  reputation,
  budget: Math.max(1_500_000, ovr * 700_000),
  players: Array.from({ length: 18 }, (_, index) => ({ id: `${id}-p${index}`, overall: ovr }))
});

const makeLeague = (prefix, ovrs) => () => ovrs.map((ovr, index) => makeTeam(`${prefix}-${index}`, ovr, Math.max(1, Math.round(ovr / 18))));

const getters = {
  segundaRFEF: makeLeague('rfef2', [54, 56, 58, 60, 62, 64]),
  primeraRFEF: makeLeague('rfef1', [61, 63, 65, 67, 69, 71]),
  segunda: makeLeague('segunda', [66, 68, 70, 72, 74, 76]),
  laliga: makeLeague('laliga', [76, 78, 80, 82, 84, 86]),
  premierLeague: makeLeague('prem', [78, 80, 82, 84, 86, 88]),
  championship: makeLeague('champ', [67, 69, 71, 73, 75, 77]),
  serieA: makeLeague('seriea', [75, 77, 79, 81, 83, 85]),
  serieB: makeLeague('serieb', [65, 67, 69, 71, 73, 75]),
  bundesliga: makeLeague('bund', [76, 78, 80, 82, 84, 86]),
  bundesliga2: makeLeague('bund2', [65, 67, 69, 71, 73, 75]),
  ligue1: makeLeague('ligue1', [74, 76, 78, 80, 82, 84]),
  ligue2: makeLeague('ligue2', [64, 66, 68, 70, 72, 74]),
};

const currentTeamId = 'rfef2-current';
const normalOffers = generateSeasonEndOffers(12, 'segundaRFEF', currentTeamId, getters);
const promotionMomentum = calculateOfferMomentum({
  seasonEvalResult: 'champion',
  promoted: true,
  cupResult: 'winner',
  position: 1,
});
const successOffers = generateSeasonEndOffers(12, 'segundaRFEF', currentTeamId, getters, {
  offerMomentum: promotionMomentum,
  performanceBoost: promotionMomentum.score,
});

const avg = offers => offers.reduce((sum, offer) => sum + offer.avgOvr, 0) / Math.max(1, offers.length);

assert.equal(promotionMomentum.level, 'elite', 'Ganar liga + ascender + copa debe ser un impacto de mercado elite');
assert.ok(successOffers.length >= 4, `Temporada excelente debe generar al menos 4 ofertas, generó ${successOffers.length}`);
assert.ok(avg(successOffers) > avg(normalOffers) + 8, `Las ofertas exitosas deben ser claramente mejores (${avg(successOffers)} vs ${avg(normalOffers)})`);
assert.ok(successOffers.some(offer => ['headline', 'improved'].includes(offer.marketTier)), 'Las mejores ofertas deben venir marcadas como mejoradas');
assert.ok(successOffers.every(offer => offer.team.id !== currentTeamId), 'No debe ofrecer el equipo actual como oferta externa');

console.log(JSON.stringify({
  ok: true,
  momentum: promotionMomentum,
  normalOffers: normalOffers.map(o => o.avgOvr),
  successOffers: successOffers.map(o => ({ ovr: o.avgOvr, tier: o.marketTier, league: o.leagueId })),
}));
