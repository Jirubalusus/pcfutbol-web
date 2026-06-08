import assert from 'node:assert/strict';
import {
  buildCareerLeagueGetters,
  generateInitialOffers,
  generateSeasonEndOffers,
  getProManagerEligibleLeagueIds,
  MIN_PLAYABLE_SQUAD,
} from '../src/game/proManagerEngine.js';

// Regression: selecting a historical year and entering Manager Profesional showed
// offers from static LEAGUE_CONFIG leagues that were absent from the active season
// universe. Pressing "INICIAR CARRERA" then failed with
// "No se pudo preparar la liga de la oferta elegida.".
// Strict mode must only ever offer the league ids handed in via the universe getters.

function makeTeam(leagueId, idx, players = MIN_PLAYABLE_SQUAD) {
  return {
    id: `${leagueId}-team-${idx}`,
    name: `${leagueId} Team ${idx}`,
    leagueId,
    players: Array.from({ length: players }, (_, i) => ({ name: `p${i}`, overall: 68 })),
  };
}

function makeGetters(entries) {
  const getters = {};
  for (const entry of entries) getters[entry.id] = () => entry.teams;
  return getters;
}

// ---- 1) Strict mode with a single league getter never leaks static leagues ----
{
  const segundaTeams = Array.from({ length: 12 }, (_, i) => makeTeam('segunda', i));
  const offers = generateInitialOffers(null, 10, { segunda: () => segundaTeams }, {
    strictLeagueGetters: true,
    minPlayersPerTeam: MIN_PLAYABLE_SQUAD,
  });

  assert.ok(offers.length > 0, 'expected at least one offer from the provided league');
  const leagueIds = [...new Set(offers.map(o => o.leagueId))];
  assert.deepEqual(leagueIds, ['segunda'], `strict mode must only offer provided leagues, got ${leagueIds.join(',')}`);

  const staticOnly = ['ekstraklasa', 'kLeague1', 'austrianBundesliga', 'czechLeague', 'laliga'];
  for (const offer of offers) {
    assert.ok(!staticOnly.includes(offer.leagueId), `static-only league leaked into offers: ${offer.leagueId}`);
  }
}

// ---- 2) Offers are a subset of the active-universe leagues and handleStart-preparable ----
{
  const universeEntries = [
    { id: 'segunda', teams: Array.from({ length: 12 }, (_, i) => makeTeam('segunda', i)) },
    { id: 'serieB', teams: Array.from({ length: 10 }, (_, i) => makeTeam('serieB', i)) },
  ];
  const universeLeagueIds = new Set(universeEntries.map(e => e.id));
  const teamsByLeague = new Map(universeEntries.map(e => [e.id, new Set(e.teams.map(t => t.id))]));

  const offers = generateInitialOffers(null, 10, makeGetters(universeEntries), {
    strictLeagueGetters: true,
    minPlayersPerTeam: MIN_PLAYABLE_SQUAD,
  });

  assert.ok(offers.length > 0, 'expected offers from the active universe');
  for (const offer of offers) {
    // league id exists in the universe (handleStart filters entries by id)
    assert.ok(universeLeagueIds.has(offer.leagueId), `offer league ${offer.leagueId} absent from universe`);
    // offered team is actually one of that league's teams (preparable)
    assert.ok(offer.team?.id, 'offer team must have an id');
    assert.ok(teamsByLeague.get(offer.leagueId).has(offer.team.id), `offer team ${offer.team.id} not in league ${offer.leagueId}`);
    // enough player data to be playable
    assert.ok((offer.team.players?.length || 0) >= MIN_PLAYABLE_SQUAD, `offer team ${offer.team.id} has too few players`);
  }
}

// ---- 3) Teams without a playable squad are filtered out ----
{
  const teams = [
    makeTeam('segunda', 1, 5),  // too few players -> excluded
    makeTeam('segunda', 2, 11), // ok
    { id: null, name: 'No id', leagueId: 'segunda', players: Array.from({ length: 11 }, () => ({ overall: 70 })) }, // no id -> excluded
  ];
  const offers = generateInitialOffers(null, 10, { segunda: () => teams }, {
    strictLeagueGetters: true,
    minPlayersPerTeam: MIN_PLAYABLE_SQUAD,
  });
  const offeredIds = offers.map(o => o.team.id);
  assert.deepEqual(offeredIds, ['segunda-team-2'], `only playable teams should be offered, got ${offeredIds.join(',')}`);
}

// ---- 4) Season-end offers respect eligibleLeagueIds (no static-only fallback) ----
{
  const getters = {
    segunda: () => Array.from({ length: 12 }, (_, i) => makeTeam('segunda', i)),
    serieB: () => Array.from({ length: 12 }, (_, i) => makeTeam('serieB', i)),
  };
  const offers = generateSeasonEndOffers(40, 'segunda', 'segunda-team-0', getters, {
    wasFired: true,
    minOffers: 5,
    maxOffers: 6,
    eligibleLeagueIds: ['segunda', 'serieB'],
  });
  for (const offer of offers) {
    assert.ok(['segunda', 'serieB'].includes(offer.leagueId), `season-end offered ineligible league: ${offer.leagueId}`);
  }
}

// ---- 5) Stripped otherLeagues saves still derive eligible leagues from leagueTeams ----
{
  const liveTeams = [
    ...Array.from({ length: 4 }, (_, i) => ({ ...makeTeam('segunda', i), players: Array.from({ length: 18 }, (_, p) => ({ name: `segunda-p${p}`, overall: 70 })) })),
    ...Array.from({ length: 4 }, (_, i) => ({ ...makeTeam('serieB', i), players: Array.from({ length: 18 }, (_, p) => ({ name: `serieB-p${p}`, overall: 55 })) })),
    ...Array.from({ length: 4 }, (_, i) => ({ ...makeTeam('bundesliga2', i), players: Array.from({ length: 18 }, (_, p) => ({ name: `bundesliga2-p${p}`, overall: 56 })) })),
  ];
  const strippedState = {
    playerLeagueId: 'segunda',
    leagueTable: liveTeams.filter(team => team.leagueId === 'segunda').map(team => ({ teamId: team.id, teamName: team.name })),
    otherLeagues: {},
    leagueTeams: liveTeams,
  };
  const eligibleLeagueIds = getProManagerEligibleLeagueIds(strippedState);
  assert.ok(eligibleLeagueIds.includes('serieB'), 'eligible leagues must include leagueTeams leagueId when otherLeagues was stripped');
  assert.ok(eligibleLeagueIds.includes('bundesliga2'), 'eligible leagues must include every active leagueTeams leagueId');

  const getters = buildCareerLeagueGetters(strippedState, {});
  const offers = generateSeasonEndOffers(40, 'segunda', 'segunda-team-0', getters, {
    wasFired: true,
    minOffers: 5,
    maxOffers: 6,
    eligibleLeagueIds,
  });
  assert.ok(new Set(offers.map(offer => offer.leagueId)).size > 1, `stripped save offers should not collapse to one league, got ${offers.map(o => o.leagueId).join(',')}`);
  assert.ok(offers.every(offer => (offer.team.players || []).length >= MIN_PLAYABLE_SQUAD), 'stripped save offers must keep full rosters from leagueTeams');
}

console.log(JSON.stringify({ ok: true, minPlayableSquad: MIN_PLAYABLE_SQUAD }));
