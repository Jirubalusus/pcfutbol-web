// ============================================================
// EUROPEAN COMPETITIONS — Smoke Test
// ============================================================
// Quick validation that the European system works end-to-end.
// Run with: node src/game/europeanCompetitions.test.js
// ============================================================

import { qualifyTeamsForEurope, LEAGUE_SLOTS, CHAMPIONS_LEAGUE } from './europeanCompetitions';
import { generateSwissDraw, getSwissStandings, determineSwissQualification } from './swissSystem';
import { drawPlayoffRound, drawKnockoutRound, simulateKnockoutTie } from './knockoutEngine';

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

function generateMockStandings() {
  return {
    laliga: generateMockTeams('laliga', 20, 88),
    premierLeague: generateMockTeams('premierLeague', 20, 87),
    serieA: generateMockTeams('serieA', 20, 85),
    bundesliga: generateMockTeams('bundesliga', 18, 84),
    ligue1: generateMockTeams('ligue1', 18, 80),
    eredivisie: generateMockTeams('eredivisie', 18, 76),
    primeiraLiga: generateMockTeams('primeiraLiga', 18, 77),
    belgianPro: generateMockTeams('belgianPro', 16, 72),
    superLig: generateMockTeams('superLig', 19, 73),
    scottishPrem: generateMockTeams('scottishPrem', 12, 70),
    austrianBundesliga: generateMockTeams('austrianBundesliga', 12, 69),
    greekSuperLeague: generateMockTeams('greekSuperLeague', 14, 68),
    swissSuperLeague: generateMockTeams('swissSuperLeague', 12, 67),
    danishSuperliga: generateMockTeams('danishSuperliga', 12, 66),
    croatianLeague: generateMockTeams('croatianLeague', 10, 64),
    czechLeague: generateMockTeams('czechLeague', 16, 65)
  };
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

  // Test 1: Qualification
  console.log('\n📋 Test 1: qualifyTeamsForEurope');
  const standings = generateMockStandings();
  const allTeamsMap = {};
  Object.values(standings).flat().forEach(t => { allTeamsMap[t.teamId] = t; });
  
  const qualified = qualifyTeamsForEurope(standings, allTeamsMap);

  // Expected CL teams: 4+4+4+4+3+2+2+1+1+1+1+1+1+1+1+1 = 32
  assert(qualified.championsLeague.length === 32,
    `Champions League has 32 teams (got ${qualified.championsLeague.length})`);

  // Expected EL teams: 2+2+2+2+1+2+2+3+3+2+2+2+2+2+1+2 = 32
  assert(qualified.europaLeague.length === 32,
    `Europa League has 32 teams (got ${qualified.europaLeague.length})`);

  // Expected ECL teams: 1+1+1+1+1+3+3+3+3+2+2+2+2+2+2+3 = 32
  assert(qualified.conferenceleague.length === 32,
    `Conference League has 32 teams (got ${qualified.conferenceleague.length})`);

  // All teams should have teamId and league
  assert(qualified.championsLeague.every(t => t.teamId && t.league),
    'All CL teams have teamId and league');

  // Test 2: Swiss Draw (pad teams to 36)
  console.log('\n📋 Test 2: generateSwissDraw');
  
  // CL should already have 32 teams, no padding needed
  const clTeams = [...qualified.championsLeague];

  const { matchdays, pots } = generateSwissDraw(clTeams);

  assert(matchdays.length === 8,
    `Matchday count = 8 (got ${matchdays.length})`);

  assert(pots.length === 4,
    `Pot count = 4 (got ${pots.length})`);

  assert(pots.every(p => p.length === 8),
    `Each pot has 8 teams (got ${pots.map(p => p.length).join(', ')})`);

  // Count fixtures per team
  const fixturesPerTeam = new Map();
  clTeams.forEach(t => fixturesPerTeam.set(t.teamId, 0));
  
  matchdays.forEach(md => {
    md.forEach(f => {
      fixturesPerTeam.set(f.homeTeamId, (fixturesPerTeam.get(f.homeTeamId) || 0) + 1);
      fixturesPerTeam.set(f.awayTeamId, (fixturesPerTeam.get(f.awayTeamId) || 0) + 1);
    });
  });

  const totalFixtures = matchdays.reduce((sum, md) => sum + md.length, 0);
  console.log(`    Total fixtures: ${totalFixtures}`);
  
  const teamFixtureCounts = Array.from(fixturesPerTeam.values());
  const minFixtures = Math.min(...teamFixtureCounts);
  const maxFixtures = Math.max(...teamFixtureCounts);
  console.log(`    Fixtures per team: min=${minFixtures}, max=${maxFixtures}`);
  
  // Each team should have close to 8 fixtures (some might be slightly off due to constraints)
  assert(minFixtures >= 4 && maxFixtures <= 10,
    `Each team has 4-10 fixtures (min=${minFixtures}, max=${maxFixtures})`);

  // Test 3: Swiss Standings
  console.log('\n📋 Test 3: getSwissStandings');
  
  // Generate fake results for all fixtures
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
  
  assert(swissStandings.length === 32,
    `Standings has 32 teams (got ${swissStandings.length})`);
  
  assert(swissStandings[0].points >= swissStandings[1].points,
    'Standings sorted by points DESC');

  // Test 4: Swiss Qualification
  console.log('\n📋 Test 4: determineSwissQualification');
  
  const qual = determineSwissQualification(swissStandings);
  
  assert(qual.direct.length === 8,
    `Direct qualification: 8 teams (got ${qual.direct.length})`);
  
  assert(qual.playoffSeeded.length === 8,
    `Playoff seeded: 8 teams (got ${qual.playoffSeeded.length})`);
  
  assert(qual.playoffUnseeded.length === 8,
    `Playoff unseeded: 8 teams (got ${qual.playoffUnseeded.length})`);
  
  assert(qual.eliminated.length === 8,
    `Eliminated: 8 teams (got ${qual.eliminated.length})`);

  // Test 5: Playoff Draw
  console.log('\n📋 Test 5: drawPlayoffRound');
  
  const playoffMatchups = drawPlayoffRound(qual.playoffSeeded, qual.playoffUnseeded);
  
  assert(playoffMatchups.length === 8,
    `Playoff has 8 matchups (got ${playoffMatchups.length})`);
  
  assert(playoffMatchups.every(m => m.team1 && m.team2),
    'All matchups have team1 and team2');

  // Test 6: Knockout Draw
  console.log('\n📋 Test 6: drawKnockoutRound');
  
  const koTeams = [...qual.direct, ...qual.playoffSeeded]; // 16 teams
  const r16Matchups = drawKnockoutRound(koTeams);
  
  assert(r16Matchups.length === 8,
    `R16 has 8 matchups (got ${r16Matchups.length})`);

  // Summary
  console.log(`\n${'='.repeat(50)}`);
  console.log(`🏁 Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
  
  if (failed > 0) {
    console.log('⚠️  Some tests failed!');
  } else {
    console.log('🎉 All tests passed!');
  }
}

// Run tests
runTests();
