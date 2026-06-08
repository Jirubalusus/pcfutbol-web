import fs from 'node:fs';
import assert from 'node:assert/strict';

globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

globalThis.fetch = async (url) => {
  const filePath = url === '/data/all-teams.json'
    ? new URL('../public/data/all-teams.json', import.meta.url)
    : new URL(url, import.meta.url);
  const text = fs.readFileSync(filePath, 'utf8');
  return { ok: true, text: async () => text };
};

const {
  initializeOtherLeagues,
  initializeNewSeasonWithPromotions,
} = await import('../src/game/multiLeagueEngine.js');
const {
  getLaLigaTeams,
  getSegundaTeams,
  getSegundaRfefGroups,
  loadAllData,
} = await import('../src/data/teamsFirestore.js');

const loaded = await loadAllData();
assert.equal(loaded, true, 'Los datos base deben cargarse para auditar ascensos/descensos');

const tableFromTeams = (teams) => teams.map((team, index) => ({
  teamId: team.id,
  teamName: team.name || team.shortName || team.id,
  played: 38,
  won: Math.max(0, teams.length - index - 1),
  drawn: 0,
  lost: index,
  goalsFor: Math.max(0, teams.length - index) * 2,
  goalsAgainst: index,
  goalDifference: Math.max(0, teams.length - index) * 2 - index,
  points: (teams.length - index) * 3,
  form: [],
  morale: 70,
}));

const ids = (tableOrTeams) => tableOrTeams.map(item => item.teamId || item.id).filter(Boolean);
const sorted = (arr) => [...arr].sort();
const unique = (arr) => [...new Set(arr)];
const sameSet = (a, b) => JSON.stringify(sorted(unique(a))) === JSON.stringify(sorted(unique(b)));
const assertIncludesAll = (container, expected, message) => {
  for (const item of expected) assert.ok(container.includes(item), `${message}: falta ${item}`);
};

function normalizeGroupTeams(groupValue) {
  if (Array.isArray(groupValue)) return groupValue;
  return groupValue?.teams || [];
}

function collectGroupedIds(leagueState) {
  return Object.values(leagueState?.groups || {}).flatMap(group => ids(group.table || group.teams || []));
}

function testSpanishTopTwoRollover() {
  const laligaTeams = getLaLigaTeams();
  const segundaTeams = getSegundaTeams();
  assert.ok(laligaTeams.length >= 18, 'Datos insuficientes de La Liga');
  assert.ok(segundaTeams.length >= 18, 'Datos insuficientes de Segunda');
  const laligaTable = tableFromTeams(laligaTeams);
  const segundaTable = tableFromTeams(segundaTeams);

  const otherLeagues = initializeOtherLeagues('laliga', null);
  otherLeagues.segunda = {
    ...(otherLeagues.segunda || {}),
    table: segundaTable,
  };

  const state = {
    playerLeagueId: 'laliga',
    leagueId: 'laliga',
    teamId: laligaTeams[0].id,
    team: laligaTeams[0],
    leagueTable: laligaTable,
    fixtures: [],
    otherLeagues,
  };

  const result = initializeNewSeasonWithPromotions(state, state.teamId, null, {});
  const oldLaLigaIds = ids(laligaTable);
  const newLaLigaIds = ids(result.playerLeague.table);
  const relegated = oldLaLigaIds.slice(-3);
  const promotedDirect = ids(segundaTable).slice(0, 2);

  assert.equal(newLaLigaIds.length, oldLaLigaIds.length, 'La liga superior debe mantener el número de equipos');
  assert.ok(!sameSet(newLaLigaIds, oldLaLigaIds), 'La Liga no puede conservar exactamente los mismos equipos tras el rollover');
  for (const teamId of relegated) assert.ok(!newLaLigaIds.includes(teamId), `Descendido sigue en La Liga: ${teamId}`);
  assertIncludesAll(newLaLigaIds, promotedDirect, 'Ascensos directos de Segunda no entraron en La Liga');

  const newSegundaIds = ids(result.otherLeagues.segunda.table);
  assertIncludesAll(newSegundaIds, relegated, 'Descendidos de La Liga no entraron en Segunda');
  for (const teamId of promotedDirect) assert.ok(!newSegundaIds.includes(teamId), `Ascendido sigue en Segunda: ${teamId}`);
}

function testSpanishGroupRolloverForGloryBaseDivision() {
  const groups = getSegundaRfefGroups();
  const [playerGroupId, rawGroupTeams] = Object.entries(groups)[0];
  const groupTeams = normalizeGroupTeams(rawGroupTeams);
  assert.ok(groupTeams.length > 5, 'Datos insuficientes de Segunda RFEF para auditar grupos');

  const otherLeagues = initializeOtherLeagues('segundaRFEF', playerGroupId);
  const playerTable = tableFromTeams(groupTeams);
  const initialFullSecondRfefIds = unique([
    ...ids(playerTable),
    ...collectGroupedIds(otherLeagues.segundaRFEF),
  ]);

  const state = {
    gameMode: 'glory',
    playerLeagueId: 'segundaRFEF',
    leagueId: 'segundaRFEF',
    playerGroupId,
    // Pick a team outside the direct/playoff promotion zone. A 3rd-place team can
    // randomly win the Segunda RFEF playoff, moving result.playerLeague to
    // Primera RFEF and making this IA rollover audit nondeterministic.
    teamId: groupTeams[5].id,
    team: groupTeams[5],
    leagueTable: playerTable,
    fixtures: [],
    otherLeagues,
  };

  const result = initializeNewSeasonWithPromotions(state, state.teamId, null, {});
  const newFullSecondRfefIds = unique(collectGroupedIds(result.playerLeague));

  assert.equal(newFullSecondRfefIds.length, initialFullSecondRfefIds.length, 'Segunda RFEF debe conservar tamaño total tras ascensos/descensos internos');
  assert.ok(!sameSet(newFullSecondRfefIds, initialFullSecondRfefIds), 'Segunda RFEF conservó exactamente los mismos clubes; no hubo ascensos/descensos de IA');
  assert.ok((result.changes.segundaRFEFPromoted || []).length > 0, 'No se registraron ascensos desde Segunda RFEF');
}

function testGlorySeasonEndDoesNotResetOtherLeaguesToStaticData() {
  const source = fs.readFileSync(new URL('../src/components/SeasonEnd/SeasonEnd.jsx', import.meta.url), 'utf8');
  const start = source.indexOf('const handleGloryNewSeason = () =>');
  const end = source.indexOf('const handleConfirm =', start);
  assert.ok(start >= 0 && end > start, 'No se pudo localizar handleGloryNewSeason');
  const gloryBlock = source.slice(start, end);

  assert.ok(gloryBlock.includes('initializeNewSeasonWithPromotions'), 'Glory debe usar el motor global de ascensos/descensos');
  assert.ok(gloryBlock.includes('completeRemainingLeagues'), 'Glory debe completar ligas IA antes del rollover');
  assert.ok(gloryBlock.includes('newOtherLeagues: dynamicOtherLeagues'), 'START_NEW_SEASON de Glory debe persistir ligas dinámicas');
  assert.ok(!/const\s+otherLeagues\s*=\s*initializeOtherLeagues\(/.test(gloryBlock), 'Glory no debe reconstruir otherLeagues desde datos estáticos tras el rollover');
}

testSpanishTopTwoRollover();
testSpanishGroupRolloverForGloryBaseDivision();
testGlorySeasonEndDoesNotResetOtherLeaguesToStaticData();

console.log('✅ Audit ascensos/descensos OK: rollover español, grupos RFEF y Glory usan composiciones dinámicas.');
