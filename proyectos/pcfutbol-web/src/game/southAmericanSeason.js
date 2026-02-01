// ============================================================
// SOUTH AMERICAN SEASON — Season orchestrator for SA competitions
// ============================================================
// Manages the full lifecycle: initialization → Swiss phase →
// playoffs → knockout → final, for Libertadores & Sudamericana.
// Follows the same pattern as europeanSeason.js.
// ============================================================

import { generateSwissDraw, getSwissStandings, determineSwissQualification } from './swissSystem';
import { drawPlayoffRound, drawKnockoutRound, simulateKnockoutTie, simulateKnockoutRound } from './knockoutEngine';
import { simulateMatch } from './leagueEngine';
import {
  SA_COMPETITIONS,
  SA_MATCHDAY_WEEKS,
  calculateSAPrizeMoney
} from './southAmericanCompetitions';

// ============================================================
// INITIALIZATION
// ============================================================

/**
 * Initialize all SA competitions for the season.
 * Takes qualified teams, runs Swiss draws, sets up state.
 * 
 * @param {Object} qualifiedTeams - { copaLibertadores: [], copaSudamericana: [] }
 * @returns {Object} saState - Full state for both competitions
 */
export function initializeSACompetitions(qualifiedTeams) {
  const competitions = {};

  for (const [compId, compConfig] of Object.entries(SA_COMPETITIONS)) {
    const teams = qualifiedTeams[compId] || [];
    
    if (teams.length < 4) {
      competitions[compId] = null;
      continue;
    }

    const { matchdays, pots } = generateSwissDraw(teams);

    competitions[compId] = {
      id: compId,
      config: compConfig,
      teams: teams,
      pots: pots,
      
      phase: 'league',
      currentMatchday: 0,
      
      matchdays: matchdays,
      results: [],
      standings: teams.map(t => ({
        teamId: t.teamId,
        teamName: t.teamName || t.name,
        shortName: t.shortName || '',
        league: t.league || '',
        reputation: t.reputation || 70,
        played: 0, won: 0, drawn: 0, lost: 0,
        goalsFor: 0, goalsAgainst: 0, goalDifference: 0,
        points: 0
      })),
      
      qualification: null,
      playoffMatchups: [],
      playoffResults: [],
      r16Matchups: [],
      r16Results: [],
      qfMatchups: [],
      qfResults: [],
      sfMatchups: [],
      sfResults: [],
      finalMatchup: null,
      finalResult: null,
      
      prizesMoney: {}
    };
  }

  return {
    competitions,
    initialized: true,
    season: null
  };
}

// ============================================================
// MATCHDAY SIMULATION
// ============================================================

/**
 * Simulate one SA matchday for a competition.
 * Player's match is NOT simulated (played interactively).
 */
export function simulateSAMatchday(competitionState, matchday, playerTeamId) {
  if (!competitionState || competitionState.phase !== 'league') {
    return { updatedState: competitionState, playerMatch: null };
  }

  const matchdayIdx = matchday - 1;
  if (matchdayIdx < 0 || matchdayIdx >= competitionState.matchdays.length) {
    return { updatedState: competitionState, playerMatch: null };
  }

  const fixtures = competitionState.matchdays[matchdayIdx];
  const newResults = [...competitionState.results];
  let playerMatch = null;

  const teamMap = new Map();
  competitionState.teams.forEach(t => teamMap.set(t.teamId, t));

  for (const fixture of fixtures) {
    const homeTeam = teamMap.get(fixture.homeTeamId);
    const awayTeam = teamMap.get(fixture.awayTeamId);

    if (!homeTeam || !awayTeam) continue;

    const involvesPlayer = playerTeamId && (
      fixture.homeTeamId === playerTeamId || fixture.awayTeamId === playerTeamId
    );

    if (involvesPlayer) {
      playerMatch = {
        ...fixture,
        homeTeam,
        awayTeam,
        isHome: fixture.homeTeamId === playerTeamId,
        competitionId: competitionState.id,
        competitionName: competitionState.config.name,
        matchday
      };
      continue;
    }

    const result = simulateSAMatch(homeTeam, awayTeam);
    newResults.push({
      matchday,
      homeTeamId: fixture.homeTeamId,
      awayTeamId: fixture.awayTeamId,
      homeScore: result.homeScore,
      awayScore: result.awayScore,
      events: result.events
    });
  }

  const newStandings = getSwissStandings(competitionState.teams, newResults);

  const prizesMoney = { ...competitionState.prizesMoney };
  if (matchday === 1) {
    competitionState.teams.forEach(t => {
      prizesMoney[t.teamId] = (prizesMoney[t.teamId] || 0) + competitionState.config.prizes.participation;
    });
  }

  for (const result of newResults.filter(r => r.matchday === matchday)) {
    if (result.homeScore > result.awayScore) {
      prizesMoney[result.homeTeamId] = (prizesMoney[result.homeTeamId] || 0) + competitionState.config.prizes.winBonus;
    } else if (result.homeScore < result.awayScore) {
      prizesMoney[result.awayTeamId] = (prizesMoney[result.awayTeamId] || 0) + competitionState.config.prizes.winBonus;
    } else {
      prizesMoney[result.homeTeamId] = (prizesMoney[result.homeTeamId] || 0) + competitionState.config.prizes.drawBonus;
      prizesMoney[result.awayTeamId] = (prizesMoney[result.awayTeamId] || 0) + competitionState.config.prizes.drawBonus;
    }
  }

  return {
    updatedState: {
      ...competitionState,
      currentMatchday: matchday,
      results: newResults,
      standings: newStandings,
      prizesMoney
    },
    playerMatch
  };
}

function simulateSAMatch(homeTeam, awayTeam) {
  const homeData = ensurePlayersExist(homeTeam);
  const awayData = ensurePlayersExist(awayTeam);

  return simulateMatch(
    homeTeam.teamId || homeTeam.id,
    awayTeam.teamId || awayTeam.id,
    homeData,
    awayData,
    {
      importance: 'crucial',
      attendanceFillRate: 0.85
    }
  );
}

function ensurePlayersExist(team) {
  if (team.players && team.players.length >= 11) return team;
  const rep = team.reputation || 70;
  return {
    ...team,
    id: team.teamId || team.id,
    name: team.teamName || team.name || 'Unknown',
    players: Array.from({ length: 18 }, (_, i) => ({
      name: `Jugador ${i + 1}`,
      position: ['GK', 'CB', 'CB', 'CB', 'RB', 'LB', 'CM', 'CM', 'CDM', 'CAM', 'RM', 'LM', 'RW', 'LW', 'ST', 'ST', 'CF', 'GK'][i],
      overall: Math.round(rep + (Math.random() * 10 - 5)),
      age: 22 + Math.floor(Math.random() * 10),
      stamina: 80 + Math.floor(Math.random() * 15)
    }))
  };
}

// ============================================================
// PHASE ADVANCEMENT (same pattern as europeanSeason.js)
// ============================================================

export function advanceSAPhase(competitionState, playerTeamId) {
  if (!competitionState) return { updatedState: null, playerMatch: null, messages: [] };

  const messages = [];
  let state = { ...competitionState };
  let playerMatch = null;

  switch (state.phase) {
    case 'league': {
      if (state.currentMatchday < 8) {
        return { updatedState: state, playerMatch: null, messages: [] };
      }

      const qualification = determineSwissQualification(state.standings);
      state.qualification = qualification;

      const playoffMatchups = drawPlayoffRound(
        qualification.playoffSeeded,
        qualification.playoffUnseeded
      );

      const playerInDirect = qualification.direct.some(t => t.teamId === playerTeamId);
      const playerEliminated = qualification.eliminated.some(t => t.teamId === playerTeamId);
      const playerInPlayoff = [...qualification.playoffSeeded, ...qualification.playoffUnseeded]
        .some(t => t.teamId === playerTeamId);

      if (playerInDirect) {
        messages.push({
          type: 'southamerican',
          title: `${state.config.icon} ${state.config.shortName}`,
          content: `¡Tu equipo se clasifica directamente para los octavos de final!`
        });
      } else if (playerInPlayoff) {
        messages.push({
          type: 'southamerican',
          title: `${state.config.icon} ${state.config.shortName}`,
          content: `Tu equipo jugará la ronda de playoffs para acceder a octavos.`
        });
      } else if (playerEliminated) {
        messages.push({
          type: 'southamerican',
          title: `${state.config.icon} ${state.config.shortName}`,
          content: `Tu equipo ha sido eliminado en la fase de liga.`
        });
      }

      const prizesMoney = { ...state.prizesMoney };
      qualification.direct.forEach(t => {
        prizesMoney[t.teamId] = (prizesMoney[t.teamId] || 0) + state.config.prizes.r16;
      });

      state = { ...state, phase: 'playoff', qualification, playoffMatchups, prizesMoney };

      const playoffSim = simulateKnockoutRound(playoffMatchups, playerTeamId);
      state.playoffResults = playoffSim.results;
      if (playoffSim.playerMatchup) playerMatch = playoffSim.playerMatchup;
      break;
    }

    case 'playoff': {
      const allPlayoffsResolved = state.playoffResults.length > 0 &&
        state.playoffResults.every(r => r.winner != null);
      if (!allPlayoffsResolved) {
        return { updatedState: state, playerMatch: null, messages: [] };
      }

      const playoffWinners = state.playoffResults.filter(r => r.winner).map(r => r.winner);
      const r16Teams = [...state.qualification.direct, ...playoffWinners];
      const r16Matchups = drawKnockoutRound(r16Teams, { avoidSameLeague: true });
      
      const prizesMoney = { ...state.prizesMoney };
      playoffWinners.forEach(t => {
        prizesMoney[t.teamId] = (prizesMoney[t.teamId] || 0) + state.config.prizes.r16;
      });

      state = { ...state, phase: 'r16', r16Matchups, prizesMoney };

      const r16Sim = simulateKnockoutRound(r16Matchups, playerTeamId);
      state.r16Results = r16Sim.results;
      if (r16Sim.playerMatchup) playerMatch = r16Sim.playerMatchup;
      break;
    }

    case 'r16': {
      const allR16Resolved = state.r16Results.length > 0 &&
        state.r16Results.every(r => r.winner != null);
      if (!allR16Resolved) {
        return { updatedState: state, playerMatch: null, messages: [] };
      }

      const r16Winners = state.r16Results.filter(r => r.winner).map(r => r.winner);
      const qfMatchups = drawKnockoutRound(r16Winners, { avoidSameLeague: true });
      
      const prizesMoney = { ...state.prizesMoney };
      r16Winners.forEach(t => {
        prizesMoney[t.teamId] = (prizesMoney[t.teamId] || 0) + state.config.prizes.qf;
      });

      state = { ...state, phase: 'qf', qfMatchups, prizesMoney };

      const qfSim = simulateKnockoutRound(qfMatchups, playerTeamId);
      state.qfResults = qfSim.results;
      if (qfSim.playerMatchup) playerMatch = qfSim.playerMatchup;
      break;
    }

    case 'qf': {
      const allQFResolved = state.qfResults.length > 0 &&
        state.qfResults.every(r => r.winner != null);
      if (!allQFResolved) {
        return { updatedState: state, playerMatch: null, messages: [] };
      }

      const qfWinners = state.qfResults.filter(r => r.winner).map(r => r.winner);
      const sfMatchups = drawKnockoutRound(qfWinners, { avoidSameLeague: false });
      
      const prizesMoney = { ...state.prizesMoney };
      qfWinners.forEach(t => {
        prizesMoney[t.teamId] = (prizesMoney[t.teamId] || 0) + state.config.prizes.sf;
      });

      state = { ...state, phase: 'sf', sfMatchups, prizesMoney };

      const sfSim = simulateKnockoutRound(sfMatchups, playerTeamId);
      state.sfResults = sfSim.results;
      if (sfSim.playerMatchup) playerMatch = sfSim.playerMatchup;
      break;
    }

    case 'sf': {
      const allSFResolved = state.sfResults.length > 0 &&
        state.sfResults.every(r => r.winner != null);
      if (!allSFResolved) {
        return { updatedState: state, playerMatch: null, messages: [] };
      }

      const sfWinners = state.sfResults.filter(r => r.winner).map(r => r.winner);

      if (sfWinners.length < 2) {
        state.phase = 'completed';
        break;
      }

      const finalMatchup = {
        id: 'final',
        team1: sfWinners[0],
        team2: sfWinners[1],
        isFinal: true,
        leg1: null,
        leg2: null,
        winner: null,
        aggregate: null
      };

      const prizesMoney = { ...state.prizesMoney };
      sfWinners.forEach(t => {
        prizesMoney[t.teamId] = (prizesMoney[t.teamId] || 0) + state.config.prizes.final;
      });

      state = { ...state, phase: 'final', finalMatchup, prizesMoney };

      const playerInFinal = sfWinners.some(t => t.teamId === playerTeamId);
      if (playerInFinal) {
        playerMatch = finalMatchup;
      } else {
        const finalResult = simulateKnockoutTie(finalMatchup);
        state.finalResult = finalResult;
        state.phase = 'completed';

        if (finalResult.winner) {
          state.prizesMoney[finalResult.winner.teamId] =
            (state.prizesMoney[finalResult.winner.teamId] || 0) + state.config.prizes.winnerExtra;
        }

        messages.push({
          type: 'southamerican',
          title: `${state.config.icon} ${state.config.shortName} — ¡Final!`,
          content: `${finalResult.winner?.teamName || 'Desconocido'} gana la ${state.config.name} (${finalResult.aggregate})`
        });
      }
      break;
    }

    case 'final': {
      state.phase = 'completed';
      break;
    }

    default:
      break;
  }

  return { updatedState: state, playerMatch, messages };
}

// ============================================================
// PLAYER MATCH RECORDING (same pattern as europeanSeason.js)
// ============================================================

export function recordPlayerSALeagueResult(competitionState, matchResult, matchday) {
  const newResults = [...competitionState.results, {
    matchday,
    homeTeamId: matchResult.homeTeamId,
    awayTeamId: matchResult.awayTeamId,
    homeScore: matchResult.homeScore,
    awayScore: matchResult.awayScore,
    events: matchResult.events || []
  }];

  const newStandings = getSwissStandings(competitionState.teams, newResults);

  const prizesMoney = { ...competitionState.prizesMoney };
  if (matchResult.homeScore > matchResult.awayScore) {
    prizesMoney[matchResult.homeTeamId] = (prizesMoney[matchResult.homeTeamId] || 0) + competitionState.config.prizes.winBonus;
  } else if (matchResult.homeScore < matchResult.awayScore) {
    prizesMoney[matchResult.awayTeamId] = (prizesMoney[matchResult.awayTeamId] || 0) + competitionState.config.prizes.winBonus;
  } else {
    prizesMoney[matchResult.homeTeamId] = (prizesMoney[matchResult.homeTeamId] || 0) + competitionState.config.prizes.drawBonus;
    prizesMoney[matchResult.awayTeamId] = (prizesMoney[matchResult.awayTeamId] || 0) + competitionState.config.prizes.drawBonus;
  }

  return {
    ...competitionState,
    results: newResults,
    standings: newStandings,
    prizesMoney
  };
}

export function recordPlayerSAKnockoutResult(competitionState, matchResult, phase) {
  const state = { ...competitionState };
  
  const phaseKeys = {
    playoff: 'playoffResults',
    r16: 'r16Results',
    qf: 'qfResults',
    sf: 'sfResults',
    final: 'finalResult'
  };

  const key = phaseKeys[phase];
  if (!key) return state;

  const teamMap = new Map();
  state.teams.forEach(t => teamMap.set(t.teamId, t));

  const homeTeam = teamMap.get(matchResult.homeTeamId);
  const awayTeam = teamMap.get(matchResult.awayTeamId);
  
  let winner;
  if (matchResult.homeScore > matchResult.awayScore) {
    winner = homeTeam || { teamId: matchResult.homeTeamId, teamName: matchResult.homeTeamId };
  } else if (matchResult.awayScore > matchResult.homeScore) {
    winner = awayTeam || { teamId: matchResult.awayTeamId, teamName: matchResult.awayTeamId };
  } else {
    const homeRep = homeTeam?.reputation || 70;
    const awayRep = awayTeam?.reputation || 70;
    winner = Math.random() < (homeRep / (homeRep + awayRep)) ? homeTeam : awayTeam;
  }

  const completedMatchup = {
    team1: homeTeam || { teamId: matchResult.homeTeamId },
    team2: awayTeam || { teamId: matchResult.awayTeamId },
    leg1: {
      homeTeamId: matchResult.homeTeamId,
      awayTeamId: matchResult.awayTeamId,
      homeScore: matchResult.homeScore,
      awayScore: matchResult.awayScore
    },
    leg2: null,
    winner,
    aggregate: `${matchResult.homeScore}-${matchResult.awayScore}`,
    isFinalResult: phase === 'final'
  };

  if (phase === 'final') {
    state.finalResult = completedMatchup;
    if (winner) {
      state.prizesMoney = { ...state.prizesMoney };
      state.prizesMoney[winner.teamId] =
        (state.prizesMoney[winner.teamId] || 0) + state.config.prizes.winnerExtra;
    }
    state.phase = 'completed';
  } else {
    state[key] = (state[key] || []).map(r => {
      const matchupTeamIds = [r.team1?.teamId, r.team2?.teamId];
      if (matchupTeamIds.includes(matchResult.homeTeamId) || matchupTeamIds.includes(matchResult.awayTeamId)) {
        if (!r.winner) {
          return { ...r, ...completedMatchup, id: r.id };
        }
      }
      return r;
    });
  }

  return state;
}

// ============================================================
// HELPERS
// ============================================================

export function getSACalendar() {
  const calendar = {};

  SA_MATCHDAY_WEEKS.league.forEach((week, idx) => {
    calendar[week] = {
      phase: 'league',
      matchday: idx + 1,
      isLeague: true,
      isKnockout: false
    };
  });

  const knockoutPhases = ['playoff', 'r16', 'qf', 'sf', 'final'];
  knockoutPhases.forEach(phase => {
    SA_MATCHDAY_WEEKS[phase].forEach((week, idx) => {
      calendar[week] = {
        phase,
        leg: idx + 1,
        isLeague: false,
        isKnockout: true
      };
    });
  });

  return calendar;
}

export function isTeamAliveInSA(competitionState, teamId) {
  if (!competitionState) return false;
  const phase = competitionState.phase;
  if (phase === 'league') return competitionState.teams.some(t => t.teamId === teamId);
  if (phase === 'completed') return false;

  const q = competitionState.qualification;
  if (!q) return false;
  if (q.eliminated?.some(t => t.teamId === teamId)) return false;

  const phaseOrder = ['playoff', 'r16', 'qf', 'sf', 'final'];
  const currentPhaseIdx = phaseOrder.indexOf(phase);

  for (let i = 0; i <= currentPhaseIdx; i++) {
    const p = phaseOrder[i];
    const resultsKey = p === 'final' ? 'finalResult' : `${p}Results`;
    const results = competitionState[resultsKey];
    if (!results) continue;

    if (p === 'final') {
      if (results && results.winner) return results.winner.teamId === teamId;
      return competitionState.finalMatchup &&
        (competitionState.finalMatchup.team1.teamId === teamId ||
         competitionState.finalMatchup.team2.teamId === teamId);
    }

    const teamMatchup = results.find(r =>
      r.team1?.teamId === teamId || r.team2?.teamId === teamId
    );
    if (teamMatchup && teamMatchup.winner && teamMatchup.winner.teamId !== teamId) {
      return false;
    }
  }

  return true;
}

export function getPlayerSACompetition(saState, playerTeamId) {
  if (!saState?.competitions) return null;
  for (const [compId, compState] of Object.entries(saState.competitions)) {
    if (!compState) continue;
    if (compState.teams.some(t => t.teamId === playerTeamId)) {
      return { competitionId: compId, state: compState };
    }
  }
  return null;
}
