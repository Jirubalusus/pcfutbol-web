// ============================================================
// EUROPEAN SEASON — Season orchestrator for European competitions
// ============================================================
// Manages the full lifecycle: initialization → Swiss phase →
// playoffs → knockout → final, for all 3 competitions.
// ============================================================

import { generateSwissDraw, getSwissStandings, determineSwissQualification } from './swissSystem';
import { drawPlayoffRound, drawKnockoutRound, simulateKnockoutTie, simulateKnockoutRound } from './knockoutEngine';
import { simulateMatch } from './leagueEngine';
import {
  COMPETITIONS,
  EUROPEAN_MATCHDAY_WEEKS,
  getEuropeanPhaseForWeek,
  calculatePrizeMoney
} from './europeanCompetitions';

// ============================================================
// INITIALIZATION
// ============================================================

/**
 * Initialize all European competitions for the season.
 * Takes qualified teams, runs Swiss draws, sets up state.
 * 
 * @param {Object} qualifiedTeams - { championsLeague: [], europaLeague: [], conferenceleague: [] }
 * @returns {Object} europeanState - Full state for all 3 competitions
 */
export function initializeEuropeanCompetitions(qualifiedTeams) {
  const competitions = {};

  for (const [compId, compConfig] of Object.entries(COMPETITIONS)) {
    const teams = qualifiedTeams[compId] || [];
    
    if (teams.length < 4) {
      // Not enough teams, skip this competition
      competitions[compId] = null;
      continue;
    }

    // Run Swiss draw
    const { matchdays, pots } = generateSwissDraw(teams);

    competitions[compId] = {
      id: compId,
      config: compConfig,
      teams: teams,
      pots: pots,
      
      // Current phase tracking
      phase: 'league',  // 'league' | 'playoff' | 'r16' | 'qf' | 'sf' | 'final' | 'completed'
      currentMatchday: 0, // 0 = not started, 1-8 = league matchdays
      
      // Swiss league phase
      matchdays: matchdays,
      results: [],           // All match results
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
      
      // Knockout phase
      qualification: null,   // Set after Swiss phase
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
      
      // Prize money tracking per team
      prizesMoney: {} // teamId → total earned
    };
  }

  return {
    competitions,
    initialized: true,
    season: null // Will be set by the game context
  };
}

// ============================================================
// MATCHDAY SIMULATION
// ============================================================

/**
 * Simulate one European matchday for a competition.
 * If the player's team is involved, their match is NOT simulated.
 * 
 * @param {Object} competitionState - State for one competition
 * @param {number} matchday - Which matchday (1-8)
 * @param {string} playerTeamId - Player's team ID
 * @returns {{ updatedState: Object, playerMatch: Object|null }}
 */
export function simulateEuropeanMatchday(competitionState, matchday, playerTeamId) {
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

  // Build team lookup
  const teamMap = new Map();
  competitionState.teams.forEach(t => teamMap.set(t.teamId, t));

  for (const fixture of fixtures) {
    const homeTeam = teamMap.get(fixture.homeTeamId);
    const awayTeam = teamMap.get(fixture.awayTeamId);

    if (!homeTeam || !awayTeam) continue;

    // Check if player is involved
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
      continue; // Don't simulate — player plays interactively
    }

    // Auto-simulate
    const result = simulateEuropeanMatch(homeTeam, awayTeam);
    newResults.push({
      matchday,
      homeTeamId: fixture.homeTeamId,
      awayTeamId: fixture.awayTeamId,
      homeScore: result.homeScore,
      awayScore: result.awayScore,
      events: result.events
    });
  }

  // Recompute standings
  const newStandings = getSwissStandings(competitionState.teams, newResults);

  // Award participation prize money on matchday 1
  const prizesMoney = { ...competitionState.prizesMoney };
  if (matchday === 1) {
    competitionState.teams.forEach(t => {
      prizesMoney[t.teamId] = (prizesMoney[t.teamId] || 0) + competitionState.config.prizes.participation;
    });
  }

  // Award win/draw bonuses
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

/**
 * Simulate a European match between two teams (helper).
 */
function simulateEuropeanMatch(homeTeam, awayTeam) {
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

/**
 * Ensure team has players for simulation
 */
function ensurePlayersExist(team) {
  if (team.players && team.players.length >= 11) return team;
  const rep = team.reputation || 70;
  return {
    ...team,
    id: team.teamId || team.id,
    name: team.teamName || team.name || 'Desconocido',
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
// PHASE ADVANCEMENT
// ============================================================

/**
 * Advance the European competition to the next phase.
 * Called after league phase completes, after playoffs, etc.
 * 
 * @param {Object} competitionState - Current competition state
 * @param {string} playerTeamId - Player's team ID
 * @returns {{ updatedState: Object, playerMatch: Object|null, messages: Array }}
 */
export function advanceEuropeanPhase(competitionState, playerTeamId) {
  if (!competitionState) return { updatedState: null, playerMatch: null, messages: [] };

  const messages = [];
  let state = { ...competitionState };
  let playerMatch = null;

  switch (state.phase) {
    case 'league': {
      // League phase complete → determine qualifications
      if (state.currentMatchday < 8) {
        return { updatedState: state, playerMatch: null, messages: [] };
      }

      const qualification = determineSwissQualification(state.standings);
      state.qualification = qualification;

      // Draw playoff round
      const playoffMatchups = drawPlayoffRound(
        qualification.playoffSeeded,
        qualification.playoffUnseeded
      );

      // Check if player team is in direct qualification or needs playoff
      const playerInDirect = qualification.direct.some(t => t.teamId === playerTeamId);
      const playerEliminated = qualification.eliminated.some(t => t.teamId === playerTeamId);
      const playerInPlayoff = [...qualification.playoffSeeded, ...qualification.playoffUnseeded]
        .some(t => t.teamId === playerTeamId);

      if (playerInDirect) {
        messages.push({
          type: 'european',
          title: `${state.config.icon} ${state.config.shortName}`,
          content: `¡Tu equipo se clasifica directamente para los octavos de final!`
        });
      } else if (playerInPlayoff) {
        messages.push({
          type: 'european',
          title: `${state.config.icon} ${state.config.shortName}`,
          content: `Tu equipo jugará la ronda de playoffs para acceder a octavos.`
        });
      } else if (playerEliminated) {
        messages.push({
          type: 'european',
          title: `${state.config.icon} ${state.config.shortName}`,
          content: `Tu equipo ha sido eliminado en la fase de liga.`
        });
      }

      // Award R16 prize to direct qualifiers
      const prizesMoney = { ...state.prizesMoney };
      qualification.direct.forEach(t => {
        prizesMoney[t.teamId] = (prizesMoney[t.teamId] || 0) + state.config.prizes.r16;
      });

      state = {
        ...state,
        phase: 'playoff',
        qualification,
        playoffMatchups,
        prizesMoney
      };

      // Auto-simulate non-player playoff matchups
      const playoffSim = simulateKnockoutRound(playoffMatchups, playerTeamId);
      state.playoffResults = playoffSim.results;
      if (playoffSim.playerMatchup) {
        playerMatch = playoffSim.playerMatchup;
      }
      break;
    }

    case 'playoff': {
      // Playoffs complete → draw R16
      // Guard: don't advance until ALL playoff matches are resolved
      const allPlayoffsResolved = state.playoffResults.length > 0 &&
        state.playoffResults.every(r => r.winner != null);
      if (!allPlayoffsResolved) {
        return { updatedState: state, playerMatch: null, messages: [] };
      }

      const playoffWinners = state.playoffResults
        .filter(r => r.winner)
        .map(r => r.winner);

      // Combine direct qualifiers + playoff winners for R16
      const r16Teams = [
        ...state.qualification.direct,
        ...playoffWinners
      ];

      const r16Matchups = drawKnockoutRound(r16Teams, { avoidSameLeague: true });
      
      // Award R16 prize to playoff winners
      const prizesMoney = { ...state.prizesMoney };
      playoffWinners.forEach(t => {
        prizesMoney[t.teamId] = (prizesMoney[t.teamId] || 0) + state.config.prizes.r16;
      });

      state = {
        ...state,
        phase: 'r16',
        r16Matchups,
        prizesMoney
      };

      // Auto-simulate non-player R16
      const r16Sim = simulateKnockoutRound(r16Matchups, playerTeamId);
      state.r16Results = r16Sim.results;
      if (r16Sim.playerMatchup) {
        playerMatch = r16Sim.playerMatchup;
      }
      break;
    }

    case 'r16': {
      // R16 complete → draw QF
      // Guard: don't advance until ALL R16 matches are resolved
      const allR16Resolved = state.r16Results.length > 0 &&
        state.r16Results.every(r => r.winner != null);
      if (!allR16Resolved) {
        return { updatedState: state, playerMatch: null, messages: [] };
      }

      const r16Winners = state.r16Results
        .filter(r => r.winner)
        .map(r => r.winner);

      const qfMatchups = drawKnockoutRound(r16Winners, { avoidSameLeague: true });
      
      const prizesMoney = { ...state.prizesMoney };
      r16Winners.forEach(t => {
        prizesMoney[t.teamId] = (prizesMoney[t.teamId] || 0) + state.config.prizes.qf;
      });

      state = {
        ...state,
        phase: 'qf',
        qfMatchups,
        prizesMoney
      };

      const qfSim = simulateKnockoutRound(qfMatchups, playerTeamId);
      state.qfResults = qfSim.results;
      if (qfSim.playerMatchup) {
        playerMatch = qfSim.playerMatchup;
      }
      break;
    }

    case 'qf': {
      // QF complete → draw SF
      // Guard: don't advance until ALL QF matches are resolved
      const allQFResolved = state.qfResults.length > 0 &&
        state.qfResults.every(r => r.winner != null);
      if (!allQFResolved) {
        return { updatedState: state, playerMatch: null, messages: [] };
      }

      const qfWinners = state.qfResults
        .filter(r => r.winner)
        .map(r => r.winner);

      const sfMatchups = drawKnockoutRound(qfWinners, { avoidSameLeague: false });
      
      const prizesMoney = { ...state.prizesMoney };
      qfWinners.forEach(t => {
        prizesMoney[t.teamId] = (prizesMoney[t.teamId] || 0) + state.config.prizes.sf;
      });

      state = {
        ...state,
        phase: 'sf',
        sfMatchups,
        prizesMoney
      };

      const sfSim = simulateKnockoutRound(sfMatchups, playerTeamId);
      state.sfResults = sfSim.results;
      if (sfSim.playerMatchup) {
        playerMatch = sfSim.playerMatchup;
      }
      break;
    }

    case 'sf': {
      // SF complete → Final
      // Guard: don't advance until ALL SF matches are resolved
      const allSFResolved = state.sfResults.length > 0 &&
        state.sfResults.every(r => r.winner != null);
      if (!allSFResolved) {
        return { updatedState: state, playerMatch: null, messages: [] };
      }

      const sfWinners = state.sfResults
        .filter(r => r.winner)
        .map(r => r.winner);

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

      state = {
        ...state,
        phase: 'final',
        finalMatchup,
        prizesMoney
      };

      // Check if player is in the final
      const playerInFinal = sfWinners.some(t => t.teamId === playerTeamId);
      if (playerInFinal) {
        playerMatch = finalMatchup;
      } else {
        // Auto-simulate final
        const finalResult = simulateKnockoutTie(finalMatchup);
        state.finalResult = finalResult;
        state.phase = 'completed';

        // Winner bonus
        if (finalResult.winner) {
          state.prizesMoney[finalResult.winner.teamId] =
            (state.prizesMoney[finalResult.winner.teamId] || 0) + state.config.prizes.winnerExtra;
        }

        messages.push({
          type: 'european',
          title: `${state.config.icon} ${state.config.shortName} — ¡Final!`,
          content: `${finalResult.winner?.teamName || 'Desconocido'} gana la ${state.config.name} (${finalResult.aggregate})`
        });
      }
      break;
    }

    case 'final': {
      // Final already played — mark completed
      state.phase = 'completed';
      break;
    }

    default:
      break;
  }

  return { updatedState: state, playerMatch, messages };
}

// ============================================================
// PLAYER MATCH COMPLETION
// ============================================================

/**
 * Record the result of a player's European match (league phase).
 * 
 * @param {Object} competitionState
 * @param {Object} matchResult - { homeTeamId, awayTeamId, homeScore, awayScore, events }
 * @param {number} matchday
 * @returns {Object} updated competition state
 */
export function recordPlayerLeagueResult(competitionState, matchResult, matchday) {
  const newResults = [...competitionState.results, {
    matchday,
    homeTeamId: matchResult.homeTeamId,
    awayTeamId: matchResult.awayTeamId,
    homeScore: matchResult.homeScore,
    awayScore: matchResult.awayScore,
    events: matchResult.events || []
  }];

  const newStandings = getSwissStandings(competitionState.teams, newResults);

  // Award win/draw bonus
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

/**
 * Record the result of a player's knockout match.
 * The matchResult has { homeTeamId, awayTeamId, homeScore, awayScore }.
 * We need to determine the winner from this single match result
 * and update the matchup in the round results.
 * 
 * @param {Object} competitionState
 * @param {Object} matchResult - { homeTeamId, awayTeamId, homeScore, awayScore }
 * @param {string} phase - Which phase: 'playoff', 'r16', 'qf', 'sf', 'final'
 * @returns {Object} updated competition state
 */
export function recordPlayerKnockoutResult(competitionState, matchResult, phase) {
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

  // Build team lookup
  const teamMap = new Map();
  state.teams.forEach(t => teamMap.set(t.teamId, t));

  // Determine winner from the match result
  const homeTeam = teamMap.get(matchResult.homeTeamId);
  const awayTeam = teamMap.get(matchResult.awayTeamId);
  
  let winner;
  if (matchResult.homeScore > matchResult.awayScore) {
    winner = homeTeam || { teamId: matchResult.homeTeamId, teamName: matchResult.homeTeamId };
  } else if (matchResult.awayScore > matchResult.homeScore) {
    winner = awayTeam || { teamId: matchResult.awayTeamId, teamName: matchResult.awayTeamId };
  } else {
    // Draw → decide by reputation (simplified penalty shootout)
    const homeRep = homeTeam?.reputation || 70;
    const awayRep = awayTeam?.reputation || 70;
    winner = Math.random() < (homeRep / (homeRep + awayRep)) ? homeTeam : awayTeam;
  }

  // Build completed matchup result
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
    // Find and replace the player's matchup in the round results
    state[key] = (state[key] || []).map(r => {
      // Match by team IDs (player is in one of the teams)
      const matchupTeamIds = [r.team1?.teamId, r.team2?.teamId];
      if (matchupTeamIds.includes(matchResult.homeTeamId) || matchupTeamIds.includes(matchResult.awayTeamId)) {
        if (!r.winner) {
          // This is the player's unresolved matchup
          return { ...r, ...completedMatchup, id: r.id };
        }
      }
      return r;
    });
  }

  return state;
}

// ============================================================
// CALENDAR HELPER
// ============================================================

/**
 * Get the European calendar — which weeks have matches.
 * 
 * @returns {Object} { week → { phase, matchday, isLeague, isKnockout } }
 */
export function getEuropeanCalendar() {
  const calendar = {};

  EUROPEAN_MATCHDAY_WEEKS.league.forEach((week, idx) => {
    calendar[week] = {
      phase: 'league',
      matchday: idx + 1,
      isLeague: true,
      isKnockout: false
    };
  });

  const knockoutPhases = ['playoff', 'r16', 'qf', 'sf', 'final'];
  knockoutPhases.forEach(phase => {
    EUROPEAN_MATCHDAY_WEEKS[phase].forEach((week, idx) => {
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

/**
 * Check if a team is still alive in a competition at a given phase.
 * 
 * @param {Object} competitionState
 * @param {string} teamId
 * @returns {boolean}
 */
export function isTeamAlive(competitionState, teamId) {
  if (!competitionState) return false;

  const phase = competitionState.phase;

  if (phase === 'league') return competitionState.teams.some(t => t.teamId === teamId);
  if (phase === 'completed') return false;

  // Check in qualification
  const q = competitionState.qualification;
  if (!q) return false;

  // Eliminated in league phase
  if (q.eliminated?.some(t => t.teamId === teamId)) return false;

  // Check each knockout phase
  const phaseOrder = ['playoff', 'r16', 'qf', 'sf', 'final'];
  const currentPhaseIdx = phaseOrder.indexOf(phase);

  // If we haven't reached this phase yet, team might still be alive
  for (let i = 0; i <= currentPhaseIdx; i++) {
    const p = phaseOrder[i];
    const resultsKey = p === 'final' ? 'finalResult' : `${p}Results`;
    const results = competitionState[resultsKey];
    
    if (!results) continue;

    if (p === 'final') {
      if (results && results.winner) {
        return results.winner.teamId === teamId;
      }
      return competitionState.finalMatchup &&
        (competitionState.finalMatchup.team1.teamId === teamId ||
         competitionState.finalMatchup.team2.teamId === teamId);
    }

    // Check if team lost in this phase
    const teamMatchup = results.find(r =>
      r.team1?.teamId === teamId || r.team2?.teamId === teamId
    );
    if (teamMatchup && teamMatchup.winner && teamMatchup.winner.teamId !== teamId) {
      return false; // Lost in this phase
    }
  }

  return true; // Still in
}

/**
 * Get which competition the player is in (if any) from full european state.
 * 
 * @param {Object} europeanState - Full european competitions state
 * @param {string} playerTeamId
 * @returns {{ competitionId: string, state: Object } | null}
 */
export function getPlayerCompetition(europeanState, playerTeamId) {
  if (!europeanState?.competitions) return null;

  for (const [compId, compState] of Object.entries(europeanState.competitions)) {
    if (!compState) continue;
    if (compState.teams.some(t => t.teamId === playerTeamId)) {
      return { competitionId: compId, state: compState };
    }
  }

  return null;
}
