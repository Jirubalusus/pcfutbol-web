// ============================================================
// RANKED SIMULATION — Full season simulation for Ranked 1v1
// Uses the real game engine (leagueEngine, cupSystem, etc.)
// ============================================================

import { initializeLeague, generateFixtures, simulateMatch } from './leagueEngine';
import { generateAIForm } from './formSystem';
import { calculateTeamStrength } from './gameShared';
import { EUROPEAN_SPOTS, LEAGUE_MATCHDAYS } from './seasonManager';

// ============================================================
// SIMULATE HALF SEASON
// Simulates jornadas 1 to midpoint
// ============================================================
export function simulateHalfSeason(leagueTeams, player1TeamId, player2TeamId, player1Config, player2Config, leagueId) {
  const totalMatchdays = LEAGUE_MATCHDAYS[leagueId] || 38;
  const midpoint = Math.floor(totalMatchdays / 2);
  
  // Initialize league
  const { table, fixtures } = initializeLeague(leagueTeams, null); // no single playerTeamId
  
  // Build team lookup
  const teamMap = {};
  leagueTeams.forEach(t => { teamMap[t.id] = t; });
  
  // H2H tracker
  const h2h = { player1: [], player2: [] };
  
  // Simulate first half
  const firstHalfFixtures = fixtures.filter(f => f.week <= midpoint);
  
  for (const fixture of firstHalfFixtures) {
    const homeTeam = teamMap[fixture.homeTeam];
    const awayTeam = teamMap[fixture.awayTeam];
    if (!homeTeam || !awayTeam) continue;
    
    // Determine form/tactics for player teams
    const context = buildMatchContext(fixture, homeTeam, awayTeam, player1TeamId, player2TeamId, player1Config, player2Config);
    
    let result;
    try {
      result = simulateMatch(
        fixture.homeTeam, fixture.awayTeam,
        homeTeam, awayTeam,
        context, {}, null
      );
    } catch (e) {
      result = { homeScore: Math.floor(Math.random() * 3), awayScore: Math.floor(Math.random() * 3), events: [] };
    }
    
    fixture.homeScore = result.homeScore ?? result.homeGoals ?? 0;
    fixture.awayScore = result.awayScore ?? result.awayGoals ?? 0;
    fixture.played = true;
    fixture.events = result.events || [];
    
    // Update table
    updateTable(table, fixture);
    
    // Track H2H
    trackH2H(fixture, player1TeamId, player2TeamId, h2h);
  }
  
  // Sort table
  sortTable(table);
  
  return {
    table: table.map(t => ({ ...t })),
    fixtures,
    h2h,
    midpoint,
    totalMatchdays,
    leagueId
  };
}

// ============================================================
// SIMULATE FULL SEASON (second half + cups)
// Takes the state from half season and completes it
// ============================================================
export function simulateFullSeason(halfSeasonState, leagueTeams, player1TeamId, player2TeamId, player1Config, player2Config) {
  const { table, fixtures, h2h, midpoint, totalMatchdays, leagueId } = halfSeasonState;
  
  const teamMap = {};
  leagueTeams.forEach(t => { teamMap[t.id] = t; });
  
  // Simulate second half
  const secondHalfFixtures = fixtures.filter(f => f.week > midpoint && !f.played);
  
  for (const fixture of secondHalfFixtures) {
    const homeTeam = teamMap[fixture.homeTeam];
    const awayTeam = teamMap[fixture.awayTeam];
    if (!homeTeam || !awayTeam) continue;
    
    const context = buildMatchContext(fixture, homeTeam, awayTeam, player1TeamId, player2TeamId, player1Config, player2Config);
    
    let result;
    try {
      result = simulateMatch(
        fixture.homeTeam, fixture.awayTeam,
        homeTeam, awayTeam,
        context, {}, null
      );
    } catch (e) {
      result = { homeScore: Math.floor(Math.random() * 3), awayScore: Math.floor(Math.random() * 3), events: [] };
    }
    
    fixture.homeScore = result.homeScore ?? result.homeGoals ?? 0;
    fixture.awayScore = result.awayScore ?? result.awayGoals ?? 0;
    fixture.played = true;
    fixture.events = result.events || [];
    
    updateTable(table, fixture);
    trackH2H(fixture, player1TeamId, player2TeamId, h2h);
  }
  
  sortTable(table);
  
  // Determine league positions
  const p1Pos = table.findIndex(t => t.teamId === player1TeamId) + 1;
  const p2Pos = table.findIndex(t => t.teamId === player2TeamId) + 1;
  
  // Simulate cup (simplified: knockout bracket with real match engine)
  const cupResult = simulateCup(leagueTeams, teamMap, player1TeamId, player2TeamId);
  
  // Determine European competition results based on league position
  // Only for leagues that have European/continental spots (not second divisions)
  const europeanSpots = EUROPEAN_SPOTS[leagueId] || {};
  const hasEuropean = europeanSpots.champions || europeanSpots.europaLeague || europeanSpots.conference || europeanSpots.libertadores || europeanSpots.sudamericana;
  const p1European = hasEuropean ? getEuropeanCompetition(p1Pos, europeanSpots) : null;
  const p2European = hasEuropean ? getEuropeanCompetition(p2Pos, europeanSpots) : null;
  
  // Simulate European competitions (simplified probability based on team strength)
  const p1EuropeanResult = p1European ? simulateEuropeanRun(teamMap[player1TeamId], p1European) : null;
  const p2EuropeanResult = p2European ? simulateEuropeanRun(teamMap[player2TeamId], p2European) : null;
  
  return {
    table,
    player1: {
      teamId: player1TeamId,
      teamName: teamMap[player1TeamId]?.name,
      leaguePosition: p1Pos,
      leaguePoints: table.find(t => t.teamId === player1TeamId)?.points || 0,
      liga: p1Pos === 1,
      copa: cupResult.winner === player1TeamId,
      championsLeague: p1EuropeanResult?.won && p1European === 'champions',
      europaLeague: p1EuropeanResult?.won && p1European === 'europaLeague',
      conference: p1EuropeanResult?.won && p1European === 'conference',
      libertadores: p1EuropeanResult?.won && p1European === 'libertadores',
      sudamericana: p1EuropeanResult?.won && p1European === 'sudamericana',
      supercopa: false, // Simplified: not simulated
      europeanCompetition: p1European,
      europeanRound: p1EuropeanResult?.round || null,
      h2hResults: h2h.player1,
      h2hWins: h2h.player1.filter(r => r.goalsFor > r.goalsAgainst).length,
      finishedAboveRival: p1Pos < p2Pos,
      cupRound: cupResult.runs[player1TeamId] || 'R1',
    },
    player2: {
      teamId: player2TeamId,
      teamName: teamMap[player2TeamId]?.name,
      leaguePosition: p2Pos,
      leaguePoints: table.find(t => t.teamId === player2TeamId)?.points || 0,
      liga: p2Pos === 1,
      copa: cupResult.winner === player2TeamId,
      championsLeague: p2EuropeanResult?.won && p2European === 'champions',
      europaLeague: p2EuropeanResult?.won && p2European === 'europaLeague',
      conference: p2EuropeanResult?.won && p2European === 'conference',
      libertadores: p2EuropeanResult?.won && p2European === 'libertadores',
      sudamericana: p2EuropeanResult?.won && p2European === 'sudamericana',
      supercopa: false,
      europeanCompetition: p2European,
      europeanRound: p2EuropeanResult?.round || null,
      h2hResults: h2h.player2,
      h2hWins: h2h.player2.filter(r => r.goalsFor > r.goalsAgainst).length,
      finishedAboveRival: p2Pos < p1Pos,
      cupRound: cupResult.runs[player2TeamId] || 'R1',
    }
  };
}

// ============================================================
// HELPERS
// ============================================================

function buildMatchContext(fixture, homeTeam, awayTeam, p1Id, p2Id, p1Config, p2Config) {
  const context = {
    homeFormation: '4-3-3',
    awayFormation: '4-3-3',
    homeTactic: 'balanced',
    awayTactic: 'balanced',
    homeMorale: 70,
    awayMorale: 70,
  };
  
  // Apply player configs
  if (fixture.homeTeam === p1Id && p1Config) {
    context.homeFormation = p1Config.formation || '4-3-3';
    context.homeTactic = p1Config.tactic || 'balanced';
    context.homeMorale = p1Config.morale || 75;
  } else if (fixture.homeTeam === p2Id && p2Config) {
    context.homeFormation = p2Config.formation || '4-3-3';
    context.homeTactic = p2Config.tactic || 'balanced';
    context.homeMorale = p2Config.morale || 75;
  }
  
  if (fixture.awayTeam === p1Id && p1Config) {
    context.awayFormation = p1Config.formation || '4-3-3';
    context.awayTactic = p1Config.tactic || 'balanced';
    context.awayMorale = p1Config.morale || 75;
  } else if (fixture.awayTeam === p2Id && p2Config) {
    context.awayFormation = p2Config.formation || '4-3-3';
    context.awayTactic = p2Config.tactic || 'balanced';
    context.awayMorale = p2Config.morale || 75;
  }
  
  return context;
}

function updateTable(table, fixture) {
  const home = table.find(t => t.teamId === fixture.homeTeam);
  const away = table.find(t => t.teamId === fixture.awayTeam);
  if (!home || !away) return;
  
  const hs = fixture.homeScore || 0;
  const as = fixture.awayScore || 0;
  
  home.played = (home.played || 0) + 1;
  away.played = (away.played || 0) + 1;
  home.goalsFor = (home.goalsFor || 0) + hs;
  home.goalsAgainst = (home.goalsAgainst || 0) + as;
  away.goalsFor = (away.goalsFor || 0) + as;
  away.goalsAgainst = (away.goalsAgainst || 0) + hs;
  
  if (hs > as) {
    home.won = (home.won || 0) + 1;
    home.points = (home.points || 0) + 3;
    away.lost = (away.lost || 0) + 1;
  } else if (hs < as) {
    away.won = (away.won || 0) + 1;
    away.points = (away.points || 0) + 3;
    home.lost = (home.lost || 0) + 1;
  } else {
    home.drawn = (home.drawn || 0) + 1;
    away.drawn = (away.drawn || 0) + 1;
    home.points = (home.points || 0) + 1;
    away.points = (away.points || 0) + 1;
  }
  
  home.goalDifference = (home.goalsFor || 0) - (home.goalsAgainst || 0);
  away.goalDifference = (away.goalsFor || 0) - (away.goalsAgainst || 0);
}

function sortTable(table) {
  table.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    return b.goalsFor - a.goalsFor;
  });
}

function trackH2H(fixture, p1Id, p2Id, h2h) {
  const isP1Home = fixture.homeTeam === p1Id && fixture.awayTeam === p2Id;
  const isP1Away = fixture.awayTeam === p1Id && fixture.homeTeam === p2Id;
  
  if (isP1Home) {
    h2h.player1.push({ goalsFor: fixture.homeScore, goalsAgainst: fixture.awayScore, home: true });
    h2h.player2.push({ goalsFor: fixture.awayScore, goalsAgainst: fixture.homeScore, home: false });
  } else if (isP1Away) {
    h2h.player1.push({ goalsFor: fixture.awayScore, goalsAgainst: fixture.homeScore, home: false });
    h2h.player2.push({ goalsFor: fixture.homeScore, goalsAgainst: fixture.awayScore, home: true });
  }
}

function getEuropeanCompetition(position, spots) {
  if (spots.champions?.includes(position)) return 'champions';
  if (spots.europaLeague?.includes(position)) return 'europaLeague';
  if (spots.conference?.includes(position)) return 'conference';
  if (spots.libertadores?.includes(position)) return 'libertadores';
  if (spots.sudamericana?.includes(position)) return 'sudamericana';
  return null;
}

// Simplified European run: probability based on team average overall
function simulateEuropeanRun(team, competition) {
  if (!team) return { won: false, round: null };
  
  const avgOverall = team.players 
    ? team.players.reduce((sum, p) => sum + (p.overall || 70), 0) / Math.max(1, team.players.length)
    : 70;
  
  // Rounds: Group → R16 → QF → SF → Final
  const rounds = ['Group', 'R16', 'QF', 'SF', 'Final'];
  const isTop = competition === 'champions' || competition === 'libertadores';
  
  // Base advance probability per round (decreasing)
  const baseProbs = isTop 
    ? [0.65, 0.50, 0.40, 0.35, 0.30]  // Champions/Libertadores harder
    : [0.75, 0.60, 0.50, 0.40, 0.35];  // Europa/Conference/Sudamericana easier
  
  // Team strength modifier: higher overall = better chance
  const strengthMod = (avgOverall - 70) / 100; // e.g., 80 overall = +0.10
  
  let lastRound = null;
  for (let i = 0; i < rounds.length; i++) {
    const prob = Math.min(0.95, Math.max(0.05, baseProbs[i] + strengthMod));
    if (Math.random() < prob) {
      lastRound = rounds[i];
    } else {
      return { won: false, round: lastRound || rounds[i] };
    }
  }
  
  return { won: true, round: 'Winner' };
}

// Simplified cup simulation: knockout bracket
function simulateCup(allTeams, teamMap, p1Id, p2Id) {
  // Shuffle teams for bracket
  const teamIds = allTeams.map(t => t.id).sort(() => Math.random() - 0.5);
  const runs = {};
  teamIds.forEach(id => { runs[id] = 'R1'; });
  
  let remaining = [...teamIds];
  let roundNum = 1;
  const roundNames = ['R1', 'R2', 'R3', 'QF', 'SF', 'Final'];
  
  while (remaining.length > 1) {
    const nextRound = [];
    const roundName = roundNames[Math.min(roundNum - 1, roundNames.length - 1)];
    
    // Pad to even
    if (remaining.length % 2 !== 0) {
      // Bye for last team
      const bye = remaining.pop();
      nextRound.push(bye);
    }
    
    for (let i = 0; i < remaining.length; i += 2) {
      const homeId = remaining[i];
      const awayId = remaining[i + 1];
      if (!awayId) { nextRound.push(homeId); continue; }
      
      const homeTeam = teamMap[homeId];
      const awayTeam = teamMap[awayId];
      
      if (!homeTeam || !awayTeam) {
        nextRound.push(homeId);
        continue;
      }
      
      const result = simulateMatch(homeId, awayId, homeTeam, awayTeam, {
        importance: roundNum >= 4 ? 'crucial' : 'normal'
      }, {}, null);
      
      // BUG 13 fix: use homeScore/awayScore with fallback
      const homeGoals = result.homeScore ?? result.homeGoals ?? 0;
      const awayGoals = result.awayScore ?? result.awayGoals ?? 0;
      let winnerId;
      if (homeGoals > awayGoals) {
        winnerId = homeId;
      } else if (awayGoals > homeGoals) {
        winnerId = awayId;
      } else {
        // Penalties: 50/50 with slight home advantage
        winnerId = Math.random() < 0.55 ? homeId : awayId;
      }
      
      nextRound.push(winnerId);
      const nextRoundName = roundNames[Math.min(roundNum, roundNames.length - 1)];
      runs[winnerId] = nextRoundName;
    }
    
    remaining = nextRound;
    roundNum++;
    
    // Safety: max 10 rounds
    if (roundNum > 10) break;
  }
  
  return { winner: remaining[0] || null, runs };
}

// ============================================================
// APPLY TRANSFERS TO TEAMS (BUG 6 fix)
// Moves players between cloned teams based on recorded transfers
// ============================================================
export function applyTransfersToTeams(teams, matchData) {
  const allTransfers = [
    ...(matchData.transfers?.player1 || []),
    ...(matchData.transfers?.player2 || []),
  ];
  const teamMap = {};
  teams.forEach(t => { teamMap[t.name] = t; });
  
  for (const transfer of allTransfers) {
    const fromTeam = teamMap[transfer.from];
    const toTeam = teamMap[transfer.to];
    if (!fromTeam || !toTeam) continue;
    
    const playerIdx = (fromTeam.players || []).findIndex(p => p.name === transfer.player);
    if (playerIdx === -1) continue;
    
    const [player] = fromTeam.players.splice(playerIdx, 1);
    if (!toTeam.players) toTeam.players = [];
    toTeam.players.push(player);
  }
}

// ============================================================
// TRANSFER SIMULATION (Ranked Quick Mode)
// Instant accept/reject based on team reputation and player value
// ============================================================
export function attemptTransfer(buyerTeam, sellerTeam, player, allTeams) {
  if (!buyerTeam || !sellerTeam || !player) {
    return { success: false, reason: 'Datos incompletos' };
  }
  
  // Calculate player market value (simplified)
  const baseValue = (player.overall || 70) * 50000;
  const ageModifier = player.age <= 24 ? 1.5 : player.age <= 28 ? 1.2 : player.age <= 32 ? 0.8 : 0.4;
  const value = Math.round(baseValue * ageModifier);
  
  // Can buyer afford it?
  const buyerBudget = buyerTeam.transferBudget || buyerTeam.budget || 5000000;
  if (value > buyerBudget) {
    return { success: false, reason: 'Presupuesto insuficiente', value };
  }
  
  // Reputation check: top players less likely to join worse teams
  const buyerRep = buyerTeam.reputation || 3;
  const sellerRep = sellerTeam.reputation || 3;
  const repDiff = buyerRep - sellerRep;
  
  // Base acceptance probability
  let acceptProb = 0.5;
  acceptProb += repDiff * 0.15; // Better club = more likely
  acceptProb += (player.overall < 75) ? 0.15 : -0.10; // Worse players easier to sign
  acceptProb += (player.age > 30) ? 0.10 : 0; // Older players more available
  
  // Clamp
  acceptProb = Math.max(0.10, Math.min(0.90, acceptProb));
  
  const accepted = Math.random() < acceptProb;
  
  return {
    success: accepted,
    reason: accepted ? 'Fichaje aceptado' : 'El jugador ha rechazado la oferta',
    value,
    probability: Math.round(acceptProb * 100)
  };
}

// Execute transfer: move player between teams
export function executeTransfer(buyerTeam, sellerTeam, player) {
  // Remove from seller
  if (sellerTeam.players) {
    sellerTeam.players = sellerTeam.players.filter(p => p.name !== player.name);
  }
  // Add to buyer
  if (buyerTeam.players) {
    buyerTeam.players.push({ ...player });
  }
  return true;
}
