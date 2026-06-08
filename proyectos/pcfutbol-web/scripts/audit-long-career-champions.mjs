import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const playerTeamId = process.env.TEAM_ID || 'recreativo';
const maxSeasons = Number(process.env.SEASONS || 400);
const mode = process.env.MODE || 'proof'; // proof = deterministic best-manager path, stochastic = seeded Monte Carlo
const seed = Number(process.env.SEED || 3);
const outputPath = process.env.OUT || path.join(repoRoot, 'tmp', 'long-career-champions-audit.json');

// Make draws/simulations reproducible so this regression is stable in CI.
let rngState = seed >>> 0;
Math.random = () => {
  rngState = (1664525 * rngState + 1013904223) >>> 0;
  return rngState / 0x100000000;
};

// Vite SSR helpers for modules that expect browser APIs.
globalThis.fetch = async (url) => {
  if (url !== '/data/all-teams.json') throw new Error(`Unexpected fetch URL: ${url}`);
  const text = await fs.readFile(path.join(repoRoot, 'public/data/all-teams.json'), 'utf8');
  return { ok: true, text: async () => text };
};
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

const server = await createServer({ root: repoRoot, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });

const teamsFirestore = await server.ssrLoadModule('/src/data/teamsFirestore.js');
const groupLeagueEngine = await server.ssrLoadModule('/src/game/groupLeagueEngine.js');
const multiLeagueEngine = await server.ssrLoadModule('/src/game/multiLeagueEngine.js');
const playoffEngine = await server.ssrLoadModule('/src/game/playoffEngine.js');
const europeanCompetitions = await server.ssrLoadModule('/src/game/europeanCompetitions.js');
const europeanSeason = await server.ssrLoadModule('/src/game/europeanSeason.js');

const {
  loadAllData,
  getLaLigaTeams,
  getSegundaTeams,
  getPrimeraRfefTeams,
  getPrimeraRfefGroups,
  getSegundaRfefTeams,
  getSegundaRfefGroups
} = teamsFirestore;
const { initializeLeague } = await server.ssrLoadModule('/src/game/leagueEngine.js');
const { initializeGroupLeague } = groupLeagueEngine;
const { initializeOtherLeagues, initializeNewSeasonWithPromotions, LEAGUE_CONFIG } = multiLeagueEngine;
const { initializeEuropeanCompetitions, simulateEuropeanMatchday, advanceEuropeanPhase, recordPlayerLeagueResult, recordPlayerKnockoutResult } = europeanSeason;
const { qualifyTeamsForEurope, CHAMPIONS_LEAGUE } = europeanCompetitions;
const { generateAllGroupPlayoffs, simulateAllGroupPlayoffs, getNextPlayoffMatch, advanceGroupPlayoffBracket, autoResolvePlayoffUntilPlayerMatch } = playoffEngine;

const leagueMeta = {
  segundaRFEF: { groups: getSegundaRfefGroups, teams: getSegundaRfefTeams, groupIds: ['grupo1', 'grupo2', 'grupo3', 'grupo4', 'grupo5'], playoffPayloadKey: 'segundaRFEFPlayoffBrackets' },
  primeraRFEF: { groups: getPrimeraRfefGroups, teams: getPrimeraRfefTeams, groupIds: ['grupo1', 'grupo2'], playoffPayloadKey: 'primeraRFEFPlayoffBrackets' },
  segunda: { teams: getSegundaTeams },
  laliga: { teams: getLaLigaTeams }
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function normalizeGroups(rawGroups, groupIds) {
  return Object.fromEntries(groupIds.map(groupId => [groupId, rawGroups[groupId]?.teams || rawGroups[groupId] || []]));
}

function findPlayerTeam() {
  return [...getSegundaRfefTeams(), ...getPrimeraRfefTeams(), ...getSegundaTeams(), ...getLaLigaTeams()].find(t => t.id === playerTeamId);
}

function injectPlayerIntoGroups(groupsData, leagueId) {
  const team = findPlayerTeam();
  assert(team, `Missing team ${playerTeamId}`);
  const entries = Object.entries(groupsData);
  const currentGroup = entries.find(([, teams]) => teams.some(t => t.id === playerTeamId))?.[0];
  const targetGroup = currentGroup || entries[0]?.[0];
  return Object.fromEntries(entries.map(([groupId, teams]) => {
    const withoutPlayer = teams.filter(t => t.id !== playerTeamId);
    const nextTeams = groupId === targetGroup ? [team, ...withoutPlayer].slice(0, teams.length || 18) : withoutPlayer;
    return [groupId, nextTeams];
  }));
}

function rankTableWithPlayerAt(table, position) {
  const entries = table.map(e => ({ ...e }));
  const player = entries.find(e => e.teamId === playerTeamId);
  assert(player, `Missing ${playerTeamId} in table`);
  const others = entries.filter(e => e.teamId !== playerTeamId);
  const ordered = [...others.slice(0, position - 1), player, ...others.slice(position - 1)];
  return ordered.map((entry, index) => ({
    ...entry,
    played: Math.max(1, (ordered.length - 1) * 2),
    won: Math.max(0, ordered.length - index),
    drawn: 0,
    lost: Math.max(0, index),
    goalsFor: 95 - index,
    goalsAgainst: 18 + index,
    goalDifference: 77 - index * 2,
    points: (ordered.length - index) * 3
  }));
}

function makeInitialState() {
  const groups = injectPlayerIntoGroups(normalizeGroups(getSegundaRfefGroups(), leagueMeta.segundaRFEF.groupIds), 'segundaRFEF');
  const groupLeague = initializeGroupLeague(groups, playerTeamId);
  const playerGroup = groupLeague.playerGroup;
  assert(playerGroup, `Player group not found for ${playerTeamId}`);
  const team = findPlayerTeam();
  const otherLeagues = initializeOtherLeagues('segundaRFEF', playerGroup);
  otherLeagues.segundaRFEF = {
    isGroupLeague: true,
    groups: Object.fromEntries(Object.entries(groupLeague.groups).filter(([gid]) => gid !== playerGroup)),
    playerGroup
  };
  return {
    currentSeason: 1,
    playerLeagueId: 'segundaRFEF',
    leagueId: 'segundaRFEF',
    teamId: playerTeamId,
    team,
    playerGroupId: playerGroup,
    leagueTable: groupLeague.groups[playerGroup].table,
    fixtures: groupLeague.groups[playerGroup].fixtures,
    otherLeagues,
    gameMode: 'career',
    europeanState: null,
    history: []
  };
}

function playerPositionForSeason(state, seasonIndex) {
  if (mode === 'proof') {
    // Best-manager proof path: win every domestic ladder season, then qualify and win Champions.
    if (state.playerLeagueId === 'laliga') return seasonIndex >= 5 ? 1 : 4;
    return 1;
  }
  // Seedless Monte Carlo-ish policy biased by progress; used for balance smoke checks.
  const league = state.playerLeagueId;
  const base = { segundaRFEF: 0.55, primeraRFEF: 0.48, segunda: 0.42, laliga: 0.30 }[league] || 0.35;
  const growth = Math.min((state.currentSeason - 1) * 0.035, 0.35);
  const roll = Math.random();
  if (league === 'laliga') {
    if (roll < base + growth) return 1 + Math.floor(Math.random() * 4);
    if (roll < 0.78) return 5 + Math.floor(Math.random() * 7);
    return 12 + Math.floor(Math.random() * 8);
  }
  if (roll < base + growth) return 1;
  if (roll < base + growth + 0.25) return 2 + Math.floor(Math.random() * 4);
  return 7 + Math.floor(Math.random() * 8);
}

function makeWinResult(match, winnerId) {
  const homeWon = match.homeTeam.teamId === winnerId;
  const loser = homeWon ? match.awayTeam : match.homeTeam;
  return {
    homeScore: homeWon ? 2 : 0,
    awayScore: homeWon ? 0 : 2,
    finalHomeScore: homeWon ? 2 : 0,
    finalAwayScore: homeWon ? 0 : 2,
    extraTime: false,
    penalties: null,
    winnerId,
    winnerName: winnerId,
    loserName: loser.teamName || loser.teamId,
    events: []
  };
}

function completePlayerGroupPlayoff(state, playerWins = true) {
  const meta = leagueMeta[state.playerLeagueId];
  const fullGroups = { ...(state.otherLeagues[state.playerLeagueId]?.groups || {}), [state.playerGroupId]: { table: state.leagueTable, fixtures: state.fixtures } };
  const groupLeagueData = { isGroupLeague: true, groups: fullGroups, playerGroup: state.playerGroupId };
  const { brackets } = generateAllGroupPlayoffs(groupLeagueData, meta.teams(), playerTeamId);
  const simulated = simulateAllGroupPlayoffs(brackets, playerTeamId);
  let playerBracket = simulated.playerBracket;
  if (!playerBracket) return null;
  let next = getNextPlayoffMatch(playerTeamId, playerBracket);
  while (next && playerBracket.phase !== 'completed') {
    const winner = playerWins ? playerTeamId : (next.homeTeam.teamId === playerTeamId ? next.awayTeam.teamId : next.homeTeam.teamId);
    playerBracket = advanceGroupPlayoffBracket(playerBracket, next.id, makeWinResult(next, winner));
    playerBracket = autoResolvePlayoffUntilPlayerMatch(playerBracket, playerTeamId);
    next = getNextPlayoffMatch(playerTeamId, playerBracket);
  }
  return { ...simulated.brackets, [state.playerGroupId]: playerBracket };
}

function rankedCurrentState(state, position) {
  const nextState = { ...state };
  nextState.leagueTable = rankTableWithPlayerAt(state.leagueTable, position);
  if (LEAGUE_CONFIG[state.playerLeagueId]?.isGroupLeague) {
    const existing = state.otherLeagues[state.playerLeagueId] || { groups: {}, isGroupLeague: true };
    nextState.otherLeagues = {
      ...state.otherLeagues,
      [state.playerLeagueId]: {
        ...existing,
        isGroupLeague: true,
        playerGroup: state.playerGroupId,
        groups: {
          ...(existing.groups || {}),
          [state.playerGroupId]: { table: nextState.leagueTable, fixtures: state.fixtures }
        }
      }
    };
  }
  return nextState;
}

function advanceSeason(state, position, wonPlayoff = true) {
  const ranked = rankedCurrentState(state, position);
  const payload = {};
  if (LEAGUE_CONFIG[ranked.playerLeagueId]?.isGroupLeague && position >= 2 && position <= 5) {
    const brackets = completePlayerGroupPlayoff(ranked, wonPlayoff);
    if (brackets) payload[leagueMeta[ranked.playerLeagueId].playoffPayloadKey] = brackets;
  }
  const nextData = initializeNewSeasonWithPromotions(ranked, playerTeamId, null, payload);
  assert(nextData.playerLeague.table?.some(e => e.teamId === playerTeamId), `Next ${nextData.newPlayerLeagueId} table lost player team`);
  assert(nextData.playerLeague.fixtures?.some(f => f.homeTeam === playerTeamId || f.awayTeam === playerTeamId), `Next ${nextData.newPlayerLeagueId} fixtures lost player team`);
  return {
    ...ranked,
    currentSeason: state.currentSeason + 1,
    playerLeagueId: nextData.newPlayerLeagueId,
    leagueId: nextData.newPlayerLeagueId,
    playerGroupId: nextData.playerLeague.playerGroup || null,
    leagueTable: nextData.playerLeague.table,
    fixtures: nextData.playerLeague.fixtures,
    otherLeagues: nextData.otherLeagues,
    lastChanges: nextData.changes,
    europeanState: null
  };
}

function makeEuropeanTablesWithPlayerQualified(state, position = 4) {
  const laligaTable = rankTableWithPlayerAt(state.leagueTable, position);
  const otherLeagues = { ...state.otherLeagues };
  for (const [leagueId, config] of Object.entries(LEAGUE_CONFIG)) {
    if (leagueId === 'laliga') continue;
    if (!config.getTeams || config.isGroupLeague) continue;
    const teams = config.getTeams();
    if (!teams || teams.length < 2) continue;
    const { table } = initializeLeague(teams, null);
    otherLeagues[leagueId] = { ...(otherLeagues[leagueId] || {}), table };
  }
  return { ...state, leagueTable: laligaTable, otherLeagues };
}

function proveChampionsCanInitialize(state) {
  const qualifiedState = makeEuropeanTablesWithPlayerQualified(state, 4);
  const leagueStandings = { laliga: qualifiedState.leagueTable };
  const allTeamsMap = {};
  for (const team of [
    ...getLaLigaTeams(),
    ...getSegundaTeams(),
    ...getPrimeraRfefTeams(),
    ...getSegundaRfefTeams(),
    qualifiedState.team
  ]) {
    if (team?.id) allTeamsMap[team.id] = team;
  }
  for (const [leagueId, leagueData] of Object.entries(qualifiedState.otherLeagues || {})) {
    if (Array.isArray(leagueData?.table)) leagueStandings[leagueId] = leagueData.table;
  }
  const qualified = qualifyTeamsForEurope(leagueStandings, allTeamsMap);
  assert(qualified.championsLeague.length === CHAMPIONS_LEAGUE.teamsCount, `Expected 32 Champions teams, got ${qualified.championsLeague.length}`);
  assert(qualified.championsLeague.some(t => t.teamId === playerTeamId), `${playerTeamId} did not qualify to Champions from LaLiga top 4`);
  const europeanState = initializeEuropeanCompetitions(qualified);
  assert(europeanState.competitions.championsLeague.teams.some(t => t.teamId === playerTeamId), `${playerTeamId} missing from initialized Champions state`);
  return { qualified, europeanState };
}

function resultForPlayerWin(homeTeamId, awayTeamId) {
  const playerHome = homeTeamId === playerTeamId;
  assert(playerHome || awayTeamId === playerTeamId, `Expected player in match ${homeTeamId} vs ${awayTeamId}`);
  return {
    homeTeamId,
    awayTeamId,
    homeScore: playerHome ? 3 : 0,
    awayScore: playerHome ? 0 : 3,
    events: []
  };
}

function matchupTeams(matchup) {
  const team1 = matchup.team1 || matchup.homeTeam;
  const team2 = matchup.team2 || matchup.awayTeam;
  assert(team1?.teamId && team2?.teamId, `Invalid knockout matchup: ${JSON.stringify(matchup)}`);
  return [team1, team2];
}

function playPlayerKnockoutWin(comp, phase, playerMatch) {
  const [team1, team2] = matchupTeams(playerMatch);
  const matchResult = resultForPlayerWin(team1.teamId, team2.teamId);
  return recordPlayerKnockoutResult(comp, matchResult, phase);
}

function findUnresolvedPlayerKnockoutMatch(comp, phase) {
  const key = phase === 'final' ? 'finalResult' : `${phase}Results`;
  if (phase === 'final') return comp.finalMatchup && !comp.finalResult ? comp.finalMatchup : null;
  return (comp[key] || []).find(r =>
    !r.winner && (r.team1?.teamId === playerTeamId || r.team2?.teamId === playerTeamId)
  ) || null;
}

function simulateActualChampionsWin(europeanState) {
  let comp = europeanState.competitions.championsLeague;
  const trace = [];

  for (let matchday = 1; matchday <= 8; matchday++) {
    const { updatedState, playerMatch } = simulateEuropeanMatchday(comp, matchday, playerTeamId);
    comp = updatedState;
    assert(playerMatch, `Player Champions league-phase matchday ${matchday} not found`);
    comp = recordPlayerLeagueResult(comp, resultForPlayerWin(playerMatch.homeTeamId, playerMatch.awayTeamId), matchday);
    trace.push({ phase: 'league', matchday, result: 'player_win' });
  }

  for (let guard = 0; guard < 20 && comp.phase !== 'completed'; guard++) {
    const phaseBefore = comp.phase;
    if (['playoff', 'r16', 'qf', 'sf', 'final'].includes(phaseBefore)) {
      const unresolvedPlayerMatch = findUnresolvedPlayerKnockoutMatch(comp, phaseBefore);
      if (unresolvedPlayerMatch) {
        comp = playPlayerKnockoutWin(comp, phaseBefore, unresolvedPlayerMatch);
        trace.push({ phase: phaseBefore, result: 'player_win_existing_match' });
        continue;
      }
    }

    const { updatedState, playerMatch } = advanceEuropeanPhase(comp, playerTeamId);
    comp = updatedState;

    if (playerMatch) {
      comp = playPlayerKnockoutWin(comp, phaseBefore === 'league' ? 'playoff' : phaseBefore, playerMatch);
      trace.push({ phase: phaseBefore === 'league' ? 'playoff' : phaseBefore, result: 'player_win' });
    } else {
      trace.push({ phase: phaseBefore, result: 'auto_advanced', nextPhase: comp.phase });
    }
  }

  if (comp.phase !== 'completed') {
    throw new Error(`Champions did not complete, phase=${comp.phase}, trace=${JSON.stringify(trace)}, state=${JSON.stringify({ phase: comp.phase, playoffResults: comp.playoffResults?.length, r16Matchups: comp.r16Matchups?.length, r16Results: comp.r16Results?.map(r => ({ teams: [r.team1?.teamId, r.team2?.teamId], winner: r.winner?.teamId })) })}`);
  }
  assert(comp.finalResult?.winner?.teamId === playerTeamId, `Player did not win Champions final; winner=${comp.finalResult?.winner?.teamId || 'none'}`);
  return {
    competitionId: comp.id,
    competitionName: comp.config.name,
    phase: comp.phase,
    winner: comp.finalResult.winner.teamId,
    winnerName: comp.finalResult.winner.teamName,
    checkedTeams: comp.teams.length,
    trace
  };
}

try {
  assert(await loadAllData(), 'Team data did not load');
  let state = makeInitialState();
  const seasons = [];
  let championsInitialized = null;
  let championsWin = null;

  for (let season = 1; season <= maxSeasons; season++) {
    const leagueBefore = state.playerLeagueId;
    const position = playerPositionForSeason(state, season);
    const reachedLaLigaBefore = leagueBefore === 'laliga';

    if (reachedLaLigaBefore && !championsInitialized && position <= 4) {
      championsInitialized = proveChampionsCanInitialize(state);
      seasons.push({ season, league: leagueBefore, position, milestone: 'qualified_to_champions', championsTeams: championsInitialized.qualified.championsLeague.length });
      championsWin = simulateActualChampionsWin(championsInitialized.europeanState);
      seasons.push({ season: season + 1, league: 'championsLeague', position: 1, milestone: 'won_champions', winner: championsWin.winner });
      break;
    }

    const next = advanceSeason(state, position, true);
    seasons.push({
      season,
      league: leagueBefore,
      position,
      nextLeague: next.playerLeagueId,
      promoted: next.playerLeagueId !== leagueBefore && ['segundaRFEF', 'primeraRFEF', 'segunda'].includes(leagueBefore),
      teamPresentNextTable: next.leagueTable.some(e => e.teamId === playerTeamId),
      nextFixtures: next.fixtures.length
    });
    state = next;
  }

  assert(championsInitialized, `Did not reach Champions qualification within ${maxSeasons} seasons`);
  assert(championsWin?.winner === playerTeamId, 'Champions win proof did not complete');

  // Continue a synthetic endurance pass to exactly maxSeasons transitions after the proof, to catch rollover breakage.
  let endurance = state;
  let enduranceSeasons = 0;
  for (let i = seasons.length + 1; i <= maxSeasons; i++) {
    const position = endurance.playerLeagueId === 'laliga' ? 1 : 1;
    endurance = advanceSeason(endurance, position, true);
    enduranceSeasons++;
  }

  const report = {
    ok: true,
    mode,
    seed,
    teamId: playerTeamId,
    teamName: findPlayerTeam()?.name || playerTeamId,
    requestedSeasons: maxSeasons,
    proofSeasons: seasons,
    enduranceSeasons,
    finalLeagueAfterEndurance: endurance.playerLeagueId,
    championsWin,
    assertions: [
      '2RFEF -> 1RFEF player team retained in table and fixtures',
      '1RFEF -> Segunda player team retained in table and fixtures',
      'Segunda -> Primera player team retained in table and fixtures',
      'Primera top-4 qualifies player team to Champions League',
      'Champions League initializes with 32 teams including player team',
      'Player team wins all 8 Champions league-phase matches through the real European engine',
      'Player team advances and records real knockout/final results as Champions winner',
      `Season rollover endured to ${maxSeasons} total audited seasons`
    ]
  };
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(report, null, 2));
  console.log(`PASS long-career Champions audit: ${report.teamName} (${playerTeamId})`);
  console.log(`Route: ${seasons.map(s => `${s.season}:${s.league}${s.nextLeague ? '→' + s.nextLeague : ''}${s.milestone ? ':' + s.milestone : ''}`).join(' | ')}`);
  console.log(`Audited seasons: ${maxSeasons}; endurance seasons after proof: ${enduranceSeasons}`);
  console.log(`Report: ${outputPath}`);
} catch (error) {
  console.error('FAIL long-career Champions audit');
  console.error(error.stack || error.message);
  process.exitCode = 1;
} finally {
  await server.close();
}
