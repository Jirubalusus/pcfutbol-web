// ============================================================
// KNOCKOUT ENGINE — Two-legged ties & single-leg finals
// ============================================================
// Handles draws, simulation of knockout rounds, and bracket
// progression for UEFA-style competitions.
// ============================================================

import { simulateMatch } from './leagueEngine';

/**
 * Shuffle array utility
 */
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ============================================================
// DRAW FUNCTIONS
// ============================================================

/**
 * Draw playoff round: 9th-16th (seeded) vs 17th-24th (unseeded).
 * Seeded teams have home advantage in second leg.
 * Avoids same-league clashes where possible.
 * 
 * @param {Array} seeded - 8 seeded teams (positions 9-16)
 * @param {Array} unseeded - 8 unseeded teams (positions 17-24)
 * @returns {Array} matchups [{ team1 (unseeded), team2 (seeded), id }]
 *   team1 plays first leg home, team2 plays second leg home
 */
export function drawPlayoffRound(seeded, unseeded) {
  const matchups = [];
  const usedUnseeded = new Set();

  const shuffledSeeded = shuffleArray(seeded);
  const shuffledUnseeded = shuffleArray(unseeded);

  for (const seed of shuffledSeeded) {
    // Prefer different-league opponent
    let opponent = shuffledUnseeded.find(u =>
      !usedUnseeded.has(u.teamId) && u.league !== seed.league
    );
    // Fallback: any available
    if (!opponent) {
      opponent = shuffledUnseeded.find(u => !usedUnseeded.has(u.teamId));
    }

    if (opponent) {
      usedUnseeded.add(opponent.teamId);
      matchups.push({
        id: `playoff_${matchups.length}`,
        team1: opponent,   // Unseeded — first leg home
        team2: seed,       // Seeded — second leg home
        leg1: null,
        leg2: null,
        winner: null,
        aggregate: null
      });
    }
  }

  return matchups;
}

/**
 * Draw a knockout round (R16 onwards).
 * Random draw, avoiding same-league clashes where possible.
 * 
 * @param {Array} teams - Teams to pair up
 * @param {Object} options - { avoidSameLeague: boolean, isFinal: boolean }
 * @returns {Array} matchups
 */
export function drawKnockoutRound(teams, options = {}) {
  const { avoidSameLeague = true, isFinal = false } = options;
  const matchups = [];
  const shuffled = shuffleArray(teams);
  const used = new Set();

  for (const team of shuffled) {
    if (used.has(team.teamId)) continue;

    // Find opponent
    let opponent = null;
    if (avoidSameLeague) {
      opponent = shuffled.find(t =>
        t.teamId !== team.teamId &&
        !used.has(t.teamId) &&
        t.league !== team.league
      );
    }
    if (!opponent) {
      opponent = shuffled.find(t =>
        t.teamId !== team.teamId && !used.has(t.teamId)
      );
    }

    if (opponent) {
      used.add(team.teamId);
      used.add(opponent.teamId);
      matchups.push({
        id: `ko_${matchups.length}`,
        team1: team,       // First leg home
        team2: opponent,   // Second leg home
        isFinal: isFinal,
        leg1: null,
        leg2: null,
        winner: null,
        aggregate: null
      });
    }
  }

  return matchups;
}

// ============================================================
// SIMULATION FUNCTIONS
// ============================================================

/**
 * Simulate a single match between two teams.
 * Returns { homeScore, awayScore, events, stats }
 * 
 * @param {Object} homeTeam - Full team data
 * @param {Object} awayTeam - Full team data
 * @returns {Object} match result
 */
function simulateSingleMatch(homeTeam, awayTeam) {
  // Use the existing simulateMatch from leagueEngine
  // It needs teamIds and teamData
  const homeId = homeTeam.teamId || homeTeam.id;
  const awayId = awayTeam.teamId || awayTeam.id;

  // Ensure teams have players for simulation
  const homeData = ensureTeamHasPlayers(homeTeam);
  const awayData = ensureTeamHasPlayers(awayTeam);

  const result = simulateMatch(homeId, awayId, homeData, awayData, {
    importance: 'crucial',
    attendanceFillRate: 0.85 // European nights tend to be well-attended
  });

  return result;
}

/**
 * Ensure a team has players for simulation (generate synthetic if needed)
 */
function ensureTeamHasPlayers(team) {
  if (team.players && team.players.length >= 11) return team;

  const reputation = team.reputation || 70;
  return {
    ...team,
    id: team.teamId || team.id,
    name: team.teamName || team.name || 'Unknown',
    players: Array.from({ length: 18 }, (_, i) => ({
      name: `Jugador ${i + 1}`,
      position: ['GK', 'CB', 'CB', 'CB', 'RB', 'LB', 'CM', 'CM', 'CDM', 'CAM', 'RM', 'LM', 'RW', 'LW', 'ST', 'ST', 'CF', 'GK'][i],
      overall: Math.round(reputation + (Math.random() * 10 - 5)),
      age: 22 + Math.floor(Math.random() * 10),
      stamina: 80 + Math.floor(Math.random() * 15)
    }))
  };
}

/**
 * Simulate a two-legged knockout tie.
 * 
 * @param {Object} matchup - { team1, team2, isFinal }
 *   team1 = first leg home, team2 = second leg home
 * @param {Object} playerContext - { playerTeamId, isPlayerMatch, playerFormation, playerTactic, playerLineup }
 *   If isPlayerMatch is true, we DON'T simulate — we return null to signal
 *   the player needs to play the match interactively.
 * @returns {Object} Updated matchup with results, or null if player needs to play
 */
export function simulateKnockoutTie(matchup, playerContext = {}) {
  const { team1, team2, isFinal } = matchup;

  if (isFinal) {
    // Single match — "neutral" venue, but team1 is nominally home
    const result = simulateSingleMatch(team1, team2);
    
    let winner;
    if (result.homeScore > result.awayScore) {
      winner = team1;
    } else if (result.awayScore > result.homeScore) {
      winner = team2;
    } else {
      // Draw in final → extra time / penalties (simplified: coin flip weighted by reputation)
      const t1Rep = team1.reputation || 70;
      const t2Rep = team2.reputation || 70;
      const t1Chance = t1Rep / (t1Rep + t2Rep);
      winner = Math.random() < t1Chance ? team1 : team2;
    }

    return {
      ...matchup,
      leg1: {
        homeTeamId: team1.teamId,
        awayTeamId: team2.teamId,
        homeScore: result.homeScore,
        awayScore: result.awayScore,
        events: result.events
      },
      leg2: null,
      winner,
      aggregate: `${result.homeScore}-${result.awayScore}`,
      isFinalResult: true
    };
  }

  // Two-legged tie
  // Leg 1: team1 home
  const leg1Result = simulateSingleMatch(team1, team2);
  // Leg 2: team2 home
  const leg2Result = simulateSingleMatch(team2, team1);

  const team1Agg = leg1Result.homeScore + leg2Result.awayScore;
  const team2Agg = leg1Result.awayScore + leg2Result.homeScore;

  let winner;
  if (team1Agg > team2Agg) {
    winner = team1;
  } else if (team2Agg > team1Agg) {
    winner = team2;
  } else {
    // Away goals rule (legacy but we keep it for drama)
    const team1Away = leg2Result.awayScore;
    const team2Away = leg1Result.awayScore;
    if (team1Away > team2Away) {
      winner = team1;
    } else if (team2Away > team1Away) {
      winner = team2;
    } else {
      // Penalties: weighted coin flip
      const t1Rep = team1.reputation || 70;
      const t2Rep = team2.reputation || 70;
      winner = Math.random() < (t1Rep / (t1Rep + t2Rep)) ? team1 : team2;
    }
  }

  return {
    ...matchup,
    leg1: {
      homeTeamId: team1.teamId,
      awayTeamId: team2.teamId,
      homeScore: leg1Result.homeScore,
      awayScore: leg1Result.awayScore,
      events: leg1Result.events
    },
    leg2: {
      homeTeamId: team2.teamId,
      awayTeamId: team1.teamId,
      homeScore: leg2Result.homeScore,
      awayScore: leg2Result.awayScore,
      events: leg2Result.events
    },
    winner,
    aggregate: `${team1Agg}-${team2Agg}`
  };
}

/**
 * Simulate an entire knockout round (all matchups).
 * Skips matchups involving the player's team (those need interactive play).
 * 
 * @param {Array} matchups - Array of matchup objects
 * @param {string} playerTeamId - The player's team ID (to skip)
 * @returns {{ results: Array, winners: Array, playerMatchup: Object|null }}
 */
export function simulateKnockoutRound(matchups, playerTeamId = null) {
  const results = [];
  const winners = [];
  let playerMatchup = null;

  for (const matchup of matchups) {
    const involvesPlayer = playerTeamId && (
      matchup.team1.teamId === playerTeamId || matchup.team2.teamId === playerTeamId
    );

    if (involvesPlayer) {
      // Don't simulate — player needs to play this
      playerMatchup = matchup;
      results.push(matchup);
    } else {
      // Auto-simulate
      const result = simulateKnockoutTie(matchup);
      results.push(result);
      winners.push(result.winner);
    }
  }

  return { results, winners, playerMatchup };
}

/**
 * After player completes their knockout match, add the result.
 * 
 * @param {Array} roundResults - Current round results
 * @param {Object} playerResult - Completed player matchup with winner
 * @returns {{ results: Array, winners: Array }}
 */
export function completeKnockoutRoundWithPlayerResult(roundResults, playerResult) {
  const results = roundResults.map(r =>
    r.id === playerResult.id ? playerResult : r
  );
  const winners = results.filter(r => r.winner).map(r => r.winner);
  return { results, winners };
}
