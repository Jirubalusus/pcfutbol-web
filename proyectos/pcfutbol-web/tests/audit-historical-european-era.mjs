import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  getEuropeanCompetitionIdsForSeason,
  getEuropeanEraContextFromState,
  getCompetitionConfigForSeason,
  getEuropeanPositionsForLeague,
} from '../src/game/europeanCompetitions.js';
import { initializeEuropeanCompetitions } from '../src/game/europeanSeason.js';
import {
  getEuropeanSpotsForLeague,
  getSeasonResult,
} from '../src/game/seasonManager.js';
import { calculateSeasonOutcome } from '../src/game/seasonEngine.js';
import { buildHistoricalChampionsLeagueTeams } from '../src/data/historicalChampionsParticipants.js';
import {
  buildHistoricalEuropaLeagueTeams,
  getHistoricalEuropaParticipantNames,
} from '../src/data/historicalEuropaParticipants.js';

const repoRoot = process.cwd();
const seasonsRoot = path.join(repoRoot, 'public/historical-db/seasons');
const ENGINE_TEAMS = 32;

let failures = 0;
function check(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failures += 1;
    console.error(`  ✗ ${name}\n      ${err.message}`);
  }
}

function teamsFor(compId) {
  return Array.from({ length: ENGINE_TEAMS }, (_, idx) => ({
    id: `${compId}-${idx + 1}`,
    teamId: `${compId}-${idx + 1}`,
    name: `${compId} Team ${idx + 1}`,
    teamName: `${compId} Team ${idx + 1}`,
    reputation: 80 - (idx % 20),
    overall: 80 - (idx % 20),
    players: [],
  }));
}

function qualified(ids = ['championsLeague', 'europaLeague', 'conferenceleague']) {
  return Object.fromEntries(ids.map((id) => [id, teamsFor(id)]));
}

function loadSeasonTeams(seasonId) {
  return JSON.parse(fs.readFileSync(path.join(seasonsRoot, seasonId, 'teams.json'), 'utf8'));
}

function sourceNames(built, field) {
  return new Set(built.map((team) => team[field]));
}

function startYear(seasonId) {
  return Number(String(seasonId).slice(0, 4));
}

function supportedHistoricalSeasons() {
  return fs.readdirSync(seasonsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\d{4}-\d{2}$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

function tableWithPlayerAt(position, count = 20) {
  return Array.from({ length: count }, (_, idx) => ({
    teamId: idx + 1 === position ? 'player' : `team-${idx + 1}`,
    teamName: idx + 1 === position ? 'Player FC' : `Team ${idx + 1}`,
    points: count - idx,
    goalsFor: 0,
    goalsAgainst: 0,
    won: 0,
    drawn: 0,
    lost: 0,
  }));
}

function readSource(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

console.log('AUDIT: historical European era competitions\n');

check('every supported historical season gates Conference/Trophy by era', () => {
  const seasons = supportedHistoricalSeasons();
  assert.ok(seasons.length > 0, 'No historical seasons found');
  for (const seasonId of seasons) {
    const ids = getEuropeanCompetitionIdsForSeason(seasonId, { historical: true });
    if (startYear(seasonId) < 2021) {
      assert.deepEqual(ids, ['championsLeague', 'europaLeague'], `${seasonId} must not expose Conference/Trophy`);
    } else {
      assert.deepEqual(ids, ['championsLeague', 'europaLeague', 'conferenceleague'], `${seasonId} must expose Conference/Trophy`);
    }
  }
});

check('2008-09 active ids are Champions + UEFA/Europa only', () => {
  assert.deepEqual(
    getEuropeanCompetitionIdsForSeason('2008-09', { historical: true }),
    ['championsLeague', 'europaLeague']
  );
});

check('2008-09 league positions and season outcomes have no Conference/Trophy slot', () => {
  const era = { seasonId: '2008-09', historical: true };
  const positions = getEuropeanPositionsForLeague('laliga', era);
  assert.deepEqual(positions.conference, []);
  const spots = getEuropeanSpotsForLeague('laliga', era);
  assert.deepEqual(spots.conference, []);

  const posSevenResult = getSeasonResult(tableWithPlayerAt(7), 'player', 'laliga', era);
  assert.equal(posSevenResult.qualification, null, 'LaLiga P7 must not qualify to Continental Trophy in 2008-09');

  const outcome = calculateSeasonOutcome(7, 'laliga', 20, era);
  assert.equal(outcome.conferenceLeague, false, 'calculateSeasonOutcome must not flag Conference in 2008-09');
});

check('loaded pre-2021 European state without metadata does not reserve Conference/Trophy slots', () => {
  const state = {
    historicalDatabase: false,
    europeanCompetitions: {
      activeCompetitionIds: ['championsLeague', 'europaLeague'],
      competitions: {
        championsLeague: {},
        europaLeague: {},
      },
    },
  };
  const era = getEuropeanEraContextFromState(state);
  assert.deepEqual(era.activeCompetitionIds, ['championsLeague', 'europaLeague']);
  assert.deepEqual(getEuropeanPositionsForLeague('laliga', era).conference, []);
  assert.deepEqual(getEuropeanSpotsForLeague('laliga', era).conference, []);
});

check('current/non-historical explicit all-three European state keeps Conference/Trophy slots', () => {
  const state = {
    historicalDatabase: false,
    europeanCompetitions: {
      activeCompetitionIds: ['championsLeague', 'europaLeague', 'conferenceleague'],
      competitions: {
        championsLeague: {},
        europaLeague: {},
        conferenceleague: {},
      },
    },
  };
  const era = getEuropeanEraContextFromState(state);
  assert.deepEqual(era.activeCompetitionIds, ['championsLeague', 'europaLeague', 'conferenceleague']);
  assert.deepEqual(getEuropeanPositionsForLeague('laliga', era).conference, [7]);
  assert.deepEqual(getEuropeanSpotsForLeague('laliga', era).conference, [7]);
});

check('2024-25 historical includes Conference League and its qualification slot', () => {
  const era = { seasonId: '2024-25', historical: true };
  assert.deepEqual(
    getEuropeanCompetitionIdsForSeason('2024-25', { historical: true }),
    ['championsLeague', 'europaLeague', 'conferenceleague']
  );
  assert.equal(getCompetitionConfigForSeason('conferenceleague', '2024-25', { historical: true }).name, 'Conference League');
  assert.deepEqual(getEuropeanPositionsForLeague('laliga', era).conference, [7]);
  assert.equal(getSeasonResult(tableWithPlayerAt(7), 'player', 'laliga', era).qualification, 'conference');
  assert.equal(calculateSeasonOutcome(7, 'laliga', 20, era).conferenceLeague, true);
});

check('2007-08 initialization creates no Conference/Trophy and labels UEFA Cup', () => {
  const state = initializeEuropeanCompetitions(qualified(['championsLeague', 'europaLeague']), {
    seasonId: '2007-08',
    historical: true,
  });
  assert.deepEqual(state.activeCompetitionIds, ['championsLeague', 'europaLeague']);
  assert.ok(state.competitions.championsLeague, 'Champions missing');
  assert.ok(state.competitions.europaLeague, 'UEFA/Europa missing');
  assert.equal(state.competitions.conferenceleague, undefined);
  assert.match(state.competitions.europaLeague.config.name, /UEFA/i);
  assert.match(state.competitions.europaLeague.config.shortName, /UEFA/i);
});

check('2007-08 UEFA source includes requested Spanish entrants', () => {
  const names = getHistoricalEuropaParticipantNames('2007-08');
  for (const club of ['Atlético Madrid', 'Villarreal', 'Getafe', 'Real Zaragoza']) {
    assert.ok(names.includes(club), `${club} missing from raw UEFA list`);
  }
});

check('2007-08 UEFA builder includes Spanish UEFA teams and excludes Champions duplicates', () => {
  const teams = loadSeasonTeams('2007-08');
  const built = buildHistoricalEuropaLeagueTeams('2007-08', teams, { teamsCount: ENGINE_TEAMS });
  const sources = sourceNames(built, 'historicalEuropaSourceName');
  for (const club of ['Atlético Madrid', 'Villarreal', 'Getafe', 'Real Zaragoza']) {
    assert.ok(sources.has(club), `${club} missing from engine UEFA slice`);
  }
  for (const club of ['Barcelona', 'Real Madrid', 'Valencia', 'Sevilla']) {
    assert.ok(!sources.has(club), `${club} should not be in 2007-08 UEFA field`);
  }
});

check('2007-08 priority injection only applies to real UEFA entrants', () => {
  const teams = loadSeasonTeams('2007-08');
  const betis = teams.find((team) => /Betis Balompi/i.test(team.name || team.teamName || ''));
  assert.ok(betis, 'Betis fixture missing from 2007-08 dataset');
  const built = buildHistoricalEuropaLeagueTeams('2007-08', teams, {
    teamsCount: ENGINE_TEAMS,
    priorityTeamId: betis.id || betis.teamId,
    priorityTeamName: betis.name || betis.teamName,
  });
  assert.ok(!built.some((team) => (team.teamId || team.id) === (betis.id || betis.teamId)), 'Non-qualified Betis was injected into 2007-08 UEFA');
});

check('2005-06 Betis is in Champions and not UEFA', () => {
  const teams = loadSeasonTeams('2005-06');
  const champions = buildHistoricalChampionsLeagueTeams('2005-06', teams, { teamsCount: ENGINE_TEAMS });
  const europa = buildHistoricalEuropaLeagueTeams('2005-06', teams, { teamsCount: ENGINE_TEAMS });
  assert.ok(sourceNames(champions, 'historicalChampionsSourceName').has('Real Betis'));
  assert.ok(!sourceNames(europa, 'historicalEuropaSourceName').has('Real Betis'));
});

check('current/non-historical initialization still includes all three', () => {
  const state = initializeEuropeanCompetitions(qualified(), { historical: false });
  assert.deepEqual(state.activeCompetitionIds, ['championsLeague', 'europaLeague', 'conferenceleague']);
  assert.ok(state.competitions.conferenceleague, 'Conference/Trophy missing in current mode');
});

check('LeagueTable and Europe screens filter stale/pre-2021 Conference UI state', () => {
  const leagueTable = readSource('src/components/LeagueTable/LeagueTable.jsx');
  assert.match(leagueTable, /getEuropeanEraContextFromState\(state\)/, 'LeagueTable must derive era context from state');
  assert.match(leagueTable, /state\.europeanCompetitions/, 'LeagueTable era memo must account for persisted European competitions');
  assert.match(leagueTable, /getEuropeanSpotsForLeague\(selectedLeague, euroEra\)/, 'LeagueTable must use era-gated spots');
  assert.match(leagueTable, /leagueConfig\.conference\?\.length > 0/, 'LeagueTable legend must hide empty Conference ranges');

  const europe = readSource('src/components/Europe/Europe.jsx');
  assert.match(europe, /getEuropeanEraContextFromState\(state\)/, 'Europe screen must derive era context from state');
  assert.match(europe, /allowed\.has\(compId\)/, 'Europe screen must filter stale inactive competition ids');
  assert.match(europe, /activeCompetitionIds\.includes\(selectedComp\)/, 'Europe screen must not keep inactive selected tab');
});

check('all game-mode bootstraps/rollovers pass historical season options into Europe initialization', () => {
  const expected = {
    'src/components/TeamSelection/TeamSelection.jsx': /initializeEuropeanCompetitions\(qualifiedTeams, \{[\s\S]*?seasonId:[\s\S]*?historical:/,
    'src/components/ContrarrelojSetup/ContrarrelojSetup.jsx': /initializeEuropeanCompetitions\(qualifiedTeams, \{[\s\S]*?seasonId:[\s\S]*?historical:/,
    'src/components/GloryMode/GlorySetup.jsx': /initializeEuropeanCompetitions\(qualifiedTeams, \{[\s\S]*?seasonId:[\s\S]*?historical:/,
    'src/components/SeasonEnd/SeasonEnd.jsx': /initializeEuropeanCompetitions\(qualifiedTeams, \{[\s\S]*?seasonId:[\s\S]*?historical:/,
    'src/components/ProManager/ProManagerSetup.jsx': /initializeEuropeanCompetitions\(qualified, \{[\s\S]*?seasonId:[\s\S]*?historical:/,
    'src/components/ProManager/ProManagerSeasonEnd.jsx': /initializeEuropeanCompetitions\(qualified, \{[\s\S]*?seasonId:[\s\S]*?historical:/,
  };
  for (const [relPath, re] of Object.entries(expected)) {
    assert.match(readSource(relPath), re, `${relPath} must initialize Europe with season era options`);
  }
});

check('season-end result screens pass era options to getSeasonResult', () => {
  const seasonEnd = readSource('src/components/SeasonEnd/SeasonEnd.jsx');
  assert.match(seasonEnd, /getSeasonResult\([\s\S]*?\.\.\.euroEra[\s\S]*?suppressRelegation:/, 'SeasonEnd must pass euroEra into getSeasonResult');

  const pmSeasonEnd = readSource('src/components/ProManager/ProManagerSeasonEnd.jsx');
  assert.match(pmSeasonEnd, /getEuropeanEraContextFromState\(state\)/, 'ProManagerSeasonEnd must derive era context');
  assert.match(pmSeasonEnd, /getSeasonResult\([^)]*euroEra\)/, 'ProManagerSeasonEnd must pass euroEra into getSeasonResult');
});

console.log('');
if (failures > 0) {
  console.error(`AUDIT FAILED — ${failures} check(s) failed.`);
  process.exit(1);
}
console.log('AUDIT PASSED — historical European era checks green.');
