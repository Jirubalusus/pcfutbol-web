// ============================================================
// EUROPEAN COMPETITIONS — Smoke Test
// ============================================================
// Quick validation that the European system works end-to-end.
// Run with: node src/game/europeanCompetitions.test.js
// ============================================================

import {
  qualifyTeamsForEurope,
  LEAGUE_SLOTS,
  EUROPEAN_LEAGUE_IDS,
  CHAMPIONS_LEAGUE,
  validateLeagueSlots,
  getEuropeanPositionsForLeague,
  ensureEuropeanLeagueStandings
} from './europeanCompetitions.js';
import { generateSwissDraw, getSwissStandings, determineSwissQualification } from './swissSystem.js';
import { drawPlayoffRound, drawKnockoutRound } from './knockoutEngine.js';

// ============================================================
// MOCK DATA — Generate fake league standings
// ============================================================

function generateMockTeams(leagueId, count, repBase) {
  return Array.from({ length: count }, (_, i) => ({
    teamId: `${leagueId}_team_${i + 1}`,
    teamName: `${leagueId.toUpperCase()} Team ${i + 1}`,
    shortName: `${leagueId.substring(0, 2).toUpperCase()}${i + 1}`,
    league: leagueId,
    reputation: Math.max(40, repBase - i * 2 + Math.floor(Math.random() * 5)),
    overall: Math.max(55, repBase - i * 1.5),
    players: Array.from({ length: 18 }, (_, j) => ({
      name: `Player ${j + 1}`,
      position: ['GK', 'CB', 'CB', 'RB', 'LB', 'CM', 'CM', 'CDM', 'RW', 'LW', 'ST', 'CAM', 'CF', 'RM', 'LM', 'CB', 'ST', 'GK'][j],
      overall: Math.round(repBase - i * 1.5 + (Math.random() * 6 - 3)),
      age: 20 + Math.floor(Math.random() * 14)
    }))
  }));
}

// League sizes used by the game (see LEAGUE_CONFIG). Keep in sync with
// LEAGUE_SLOTS — any mismatch here means the slot allocation cannot be
// filled by real clubs and qualifyTeamsForEurope will throw.
const LEAGUE_TEAM_COUNTS = {
  laliga: 20, premierLeague: 20, serieA: 20, bundesliga: 18, ligue1: 18,
  eredivisie: 18, primeiraLiga: 18, belgianPro: 16, superLig: 19,
  scottishPrem: 12, austrianBundesliga: 12, greekSuperLeague: 14,
  swissSuperLeague: 12, danishSuperliga: 12, croatianLeague: 10,
  czechLeague: 16, eliteserien: 16, allsvenskan: 16, ekstraklasa: 18,
  russiaPremier: 16, ukrainePremier: 16, romaniaSuperliga: 16, hungaryNBI: 12
};

const REP_BASES = {
  laliga: 88, premierLeague: 87, serieA: 85, bundesliga: 84, ligue1: 80,
  eredivisie: 76, primeiraLiga: 77, belgianPro: 72, superLig: 73,
  scottishPrem: 70, austrianBundesliga: 69, greekSuperLeague: 68,
  swissSuperLeague: 67, danishSuperliga: 66, croatianLeague: 64,
  czechLeague: 65, eliteserien: 64, allsvenskan: 64, ekstraklasa: 65,
  russiaPremier: 66, ukrainePremier: 65, romaniaSuperliga: 63, hungaryNBI: 62
};

function generateMockStandings() {
  const out = {};
  for (const leagueId of Object.keys(LEAGUE_SLOTS)) {
    out[leagueId] = generateMockTeams(
      leagueId,
      LEAGUE_TEAM_COUNTS[leagueId] || 18,
      REP_BASES[leagueId] || 70
    );
  }
  return out;
}

// ============================================================
// TESTS
// ============================================================

function runTests() {
  console.log('🧪 Running European Competitions Smoke Tests...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✅ ${testName}`);
      passed++;
    } else {
      console.log(`  ❌ ${testName}`);
      failed++;
    }
  }

  // Test 0: Slot totals invariant (sanity + 32-per-comp rule)
  console.log('\n📋 Test 0: validateLeagueSlots');
  let totals;
  try {
    totals = validateLeagueSlots();
    assert(totals.championsLeague === 32, `CL slot total = 32 (got ${totals.championsLeague})`);
    assert(totals.europaLeague === 32, `EL slot total = 32 (got ${totals.europaLeague})`);
    assert(totals.conferenceleague === 32, `ECL slot total = 32 (got ${totals.conferenceleague})`);
  } catch (e) {
    assert(false, `validateLeagueSlots threw: ${e.message}`);
  }

  // Test 0b: getEuropeanPositionsForLeague returns contiguous position ranges
  console.log('\n📋 Test 0b: getEuropeanPositionsForLeague');
  let rangesOK = true;
  for (const leagueId of Object.keys(LEAGUE_SLOTS)) {
    const positions = getEuropeanPositionsForLeague(leagueId);
    const slots = LEAGUE_SLOTS[leagueId];
    const expectedLen = slots.championsLeague + slots.europaLeague + slots.conferenceleague;
    const flat = [...positions.champions, ...positions.europaLeague, ...positions.conference];
    const isContiguous = flat.every((p, i) => p === i + 1);
    if (!isContiguous || flat.length !== expectedLen) {
      console.log(`    ⚠️  ${leagueId} positions not contiguous: ${flat.join(',')}`);
      rangesOK = false;
    }
  }
  assert(rangesOK, 'European positions form contiguous ranges starting at 1');

  // Test 1: Qualification — exactly 32 teams per competition
  console.log('\n📋 Test 1: qualifyTeamsForEurope');
  const standings = generateMockStandings();
  const allTeamsMap = {};
  Object.values(standings).flat().forEach(t => { allTeamsMap[t.teamId] = t; });

  const qualified = qualifyTeamsForEurope(standings, allTeamsMap);

  assert(qualified.championsLeague.length === 32,
    `Champions League has 32 teams (got ${qualified.championsLeague.length})`);
  assert(qualified.europaLeague.length === 32,
    `Europa League has 32 teams (got ${qualified.europaLeague.length})`);
  assert(qualified.conferenceleague.length === 32,
    `Conference League has 32 teams (got ${qualified.conferenceleague.length})`);

  assert(qualified.championsLeague.every(t => t.teamId && t.league),
    'All CL teams have teamId and league');

  // No team may qualify for more than one competition.
  const allIds = [
    ...qualified.championsLeague,
    ...qualified.europaLeague,
    ...qualified.conferenceleague
  ].map(t => t.teamId);
  const uniqueIds = new Set(allIds);
  assert(uniqueIds.size === allIds.length,
    `No team duplicated across competitions (${uniqueIds.size} unique / ${allIds.length} total)`);

  // Every European league contributes at least one team.
  const leaguesRepresented = new Set(allIds.map(id => {
    const slash = id.indexOf('_team_');
    return slash >= 0 ? id.substring(0, slash) : id;
  }));
  assert(leaguesRepresented.size === EUROPEAN_LEAGUE_IDS.size,
    `All ${EUROPEAN_LEAGUE_IDS.size} European leagues contribute at least one team (got ${leaguesRepresented.size})`);

  // Test 1b: Missing league causes a clear, throwing failure.
  console.log('\n📋 Test 1b: qualifyTeamsForEurope fails fast on missing leagues');
  const broken = generateMockStandings();
  delete broken.czechLeague;
  let threwOnMissing = false;
  try {
    qualifyTeamsForEurope(broken, allTeamsMap);
  } catch (e) {
    threwOnMissing = /czechLeague/.test(e.message);
  }
  assert(threwOnMissing, 'Throws with league name when a LEAGUE_SLOTS league is missing');

  // Test 1c: ensureEuropeanLeagueStandings patches missing leagues using
  // reputation-ordered real teams from the provided getter.
  console.log('\n📋 Test 1c: ensureEuropeanLeagueStandings patches gaps');
  const partial = generateMockStandings();
  delete partial.hungaryNBI;
  const getTeamsForLeague = (lid) => {
    if (lid === 'hungaryNBI') {
      // Simulate what LEAGUE_CONFIG.getTeams() would return.
      return generateMockTeams('hungaryNBI', LEAGUE_TEAM_COUNTS.hungaryNBI, REP_BASES.hungaryNBI)
        .map(t => ({ id: t.teamId, name: t.teamName, reputation: t.reputation }));
    }
    return null;
  };
  const patched = ensureEuropeanLeagueStandings(partial, getTeamsForLeague);
  assert(Array.isArray(patched.hungaryNBI) && patched.hungaryNBI.length >= 4,
    `hungaryNBI patched with real teams (${patched.hungaryNBI?.length || 0} entries)`);
  const patchedQualified = qualifyTeamsForEurope(patched, allTeamsMap);
  assert(patchedQualified.championsLeague.length === 32,
    'After patching, CL still has exactly 32 teams');

  // Test 2: Swiss Draw — CL already has 32 teams
  console.log('\n📋 Test 2: generateSwissDraw');
  const clTeams = [...qualified.championsLeague];
  const { matchdays, pots } = generateSwissDraw(clTeams);

  assert(matchdays.length === 8, `Matchday count = 8 (got ${matchdays.length})`);
  assert(pots.length === 4, `Pot count = 4 (got ${pots.length})`);
  assert(pots.every(p => p.length === 8), `Each pot has 8 teams`);

  const fixturesPerTeam = new Map();
  clTeams.forEach(t => fixturesPerTeam.set(t.teamId, 0));
  matchdays.forEach(md => {
    md.forEach(f => {
      fixturesPerTeam.set(f.homeTeamId, (fixturesPerTeam.get(f.homeTeamId) || 0) + 1);
      fixturesPerTeam.set(f.awayTeamId, (fixturesPerTeam.get(f.awayTeamId) || 0) + 1);
    });
  });
  const counts = Array.from(fixturesPerTeam.values());
  assert(Math.min(...counts) >= 4 && Math.max(...counts) <= 10,
    `Each team has 4-10 fixtures (min=${Math.min(...counts)}, max=${Math.max(...counts)})`);

  // Test 3: Swiss Standings
  console.log('\n📋 Test 3: getSwissStandings');
  const fakeResults = [];
  matchdays.forEach((md, mdIdx) => {
    md.forEach(f => {
      fakeResults.push({
        matchday: mdIdx + 1,
        homeTeamId: f.homeTeamId,
        awayTeamId: f.awayTeamId,
        homeScore: Math.floor(Math.random() * 4),
        awayScore: Math.floor(Math.random() * 3)
      });
    });
  });
  const swissStandings = getSwissStandings(clTeams, fakeResults);
  assert(swissStandings.length === 32, `Standings has 32 teams (got ${swissStandings.length})`);
  assert(swissStandings[0].points >= swissStandings[1].points, 'Standings sorted by points DESC');

  // Test 4: Swiss Qualification
  console.log('\n📋 Test 4: determineSwissQualification');
  const qual = determineSwissQualification(swissStandings);
  assert(qual.direct.length === 8, `Direct: 8 (got ${qual.direct.length})`);
  assert(qual.playoffSeeded.length === 8, `Playoff seeded: 8 (got ${qual.playoffSeeded.length})`);
  assert(qual.playoffUnseeded.length === 8, `Playoff unseeded: 8 (got ${qual.playoffUnseeded.length})`);
  assert(qual.eliminated.length === 8, `Eliminated: 8 (got ${qual.eliminated.length})`);

  // Test 5: Playoff / Knockout draws
  console.log('\n📋 Test 5: drawPlayoffRound');
  const playoffMatchups = drawPlayoffRound(qual.playoffSeeded, qual.playoffUnseeded);
  assert(playoffMatchups.length === 8, `Playoff: 8 matchups (got ${playoffMatchups.length})`);
  assert(playoffMatchups.every(m => m.team1 && m.team2), 'All matchups have both teams');

  console.log('\n📋 Test 6: drawKnockoutRound');
  const koTeams = [...qual.direct, ...qual.playoffSeeded];
  const r16Matchups = drawKnockoutRound(koTeams);
  assert(r16Matchups.length === 8, `R16: 8 matchups (got ${r16Matchups.length})`);

  // Summary
  console.log(`\n${'='.repeat(50)}`);
  console.log(`🏁 Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
  if (failed > 0) {
    console.log('⚠️  Some tests failed!');
  } else {
    console.log('🎉 All tests passed!');
  }
}

runTests();
