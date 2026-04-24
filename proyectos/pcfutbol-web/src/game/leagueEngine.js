// League Engine v2.0 - Motor de simulación realista
import { simulateMatchV2 } from './matchSimulationV2';
import { generateAIForm } from './formSystem';

// Re-export shared constants/functions for backward compatibility
export { FORMATIONS, TACTICS, TACTICAL_MATCHUPS, getTacticalMatchupBonus, calculateTeamStrength } from './gameShared';

// ============== INICIALIZACIÓN DE LIGA ==============
export function initializeLeague(teams, playerTeamId) {
  const table = teams.map(team => ({
    teamId: team.id,
    teamName: team.name,
    shortName: team.shortName || team.name?.substring(0, 3).toUpperCase() || team.id,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
    form: [],
    homeForm: [],
    awayForm: [],
    isPlayer: team.id === playerTeamId,
    streak: 0, // Positive = wins, negative = losses
    morale: 70 // 0-100
  }));
  
  const fixtures = generateFixtures(teams, playerTeamId);
  
  return { table, fixtures };
}

// ============== GENERACIÓN DE CALENDARIO ==============
export function generateFixtures(teams, playerTeamId = null) {
  const teamIds = teams.map(t => t.id);
  const n = teamIds.length;
  const fixtures = [];
  
  // Shuffle team order so home/away pattern varies each new game
  const teamList = [...teamIds];
  for (let i = teamList.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [teamList[i], teamList[j]] = [teamList[j], teamList[i]];
  }
  if (n % 2 !== 0) teamList.push(null);
  
  const numTeams = teamList.length;
  const numRounds = numTeams - 1;
  const matchesPerRound = numTeams / 2;
  
  const rounds = [];
  
  for (let round = 0; round < numRounds; round++) {
    const roundMatches = [];
    
    for (let match = 0; match < matchesPerRound; match++) {
      const home = teamList[match];
      const away = teamList[numTeams - 1 - match];
      
      if (home && away) {
        roundMatches.push({
          id: `${round + 1}_${match}`,
          week: round + 1,
          homeTeam: home,
          awayTeam: away,
          homeScore: null,
          awayScore: null,
          played: false,
          events: []
        });
      }
    }
    
    rounds.push(roundMatches);
    const last = teamList.pop();
    teamList.splice(1, 0, last);
  }
  
  rounds.forEach(roundMatches => fixtures.push(...roundMatches));
  
  // Segunda vuelta
  const secondHalf = rounds.map((roundMatches, roundIdx) => 
    roundMatches.map((match, matchIdx) => ({
      ...match,
      id: `${numRounds + roundIdx + 1}_${matchIdx}`,
      week: numRounds + roundIdx + 1,
      homeTeam: match.awayTeam,
      awayTeam: match.homeTeam
    }))
  );
  
  secondHalf.forEach(roundMatches => fixtures.push(...roundMatches));
  
  // Enforce home/away alternation for player's team in first half
  // Check consecutive same-venue runs and swap where needed
  if (playerTeamId) {
    const playerFixtures = fixtures.filter(f => f.homeTeam === playerTeamId || f.awayTeam === playerTeamId);
    for (let i = 1; i < playerFixtures.length; i++) {
      const prev = playerFixtures[i - 1];
      const curr = playerFixtures[i];
      const prevHome = prev.homeTeam === playerTeamId;
      const currHome = curr.homeTeam === playerTeamId;
      // If same venue twice in a row, swap current match
      if (prevHome === currHome) {
        const idx = fixtures.indexOf(curr);
        if (idx !== -1) {
          fixtures[idx] = {
            ...curr,
            homeTeam: curr.awayTeam,
            awayTeam: curr.homeTeam
          };
        }
      }
    }
  }
  
  return fixtures;
}

// ============== SIMULACIÓN DE PARTIDO ==============
// Ahora usa el motor V2 más realista
export function simulateMatch(homeTeamId, awayTeamId, homeTeamData, awayTeamData, context = {}, playerTeamForm = {}, playerTeamId = null) {
  // Generate form for both teams
  const isHomePlayer = homeTeamData.id === playerTeamId;
  const isAwayPlayer = awayTeamData.id === playerTeamId;
  const homeForm = isHomePlayer ? playerTeamForm : generateAIForm(homeTeamData.players || []);
  const awayForm = isAwayPlayer ? playerTeamForm : generateAIForm(awayTeamData.players || []);
  
  // Add form data to context
  const updatedContext = {
    ...context,
    homeForm,
    awayForm,
    playerTeamId
  };
  // Usar el nuevo motor V2 que respeta jerarquías
  return simulateMatchV2(homeTeamId, awayTeamId, homeTeamData, awayTeamData, updatedContext);
}

// ============== ACTUALIZACIÓN DE CLASIFICACIÓN ==============
export function updateTable(table, homeTeamId, awayTeamId, homeScore, awayScore) {
  const newTable = table.map(entry => {
    if (entry.teamId === homeTeamId) {
      const won = homeScore > awayScore ? 1 : 0;
      const drawn = homeScore === awayScore ? 1 : 0;
      const lost = homeScore < awayScore ? 1 : 0;
      const points = won * 3 + drawn;
      const result = homeScore > awayScore ? 'W' : homeScore < awayScore ? 'L' : 'D';
      const form = [...entry.form, result].slice(-5);
      const homeForm = [...(entry.homeForm || []), result].slice(-5);
      
      // Actualizar racha y moral
      let streak = entry.streak || 0;
      let morale = entry.morale || 70;
      
      if (won) {
        streak = streak >= 0 ? streak + 1 : 1;
        morale = Math.min(100, morale + 5);
      } else if (lost) {
        streak = streak <= 0 ? streak - 1 : -1;
        morale = Math.max(20, morale - 8);
      } else {
        streak = 0;
        morale = Math.max(40, Math.min(85, morale - 2));
      }
      
      return {
        ...entry,
        played: entry.played + 1,
        won: entry.won + won,
        drawn: entry.drawn + drawn,
        lost: entry.lost + lost,
        goalsFor: entry.goalsFor + homeScore,
        goalsAgainst: entry.goalsAgainst + awayScore,
        goalDifference: entry.goalDifference + homeScore - awayScore,
        points: entry.points + points,
        form,
        homeForm,
        streak,
        morale
      };
    }
    
    if (entry.teamId === awayTeamId) {
      const won = awayScore > homeScore ? 1 : 0;
      const drawn = homeScore === awayScore ? 1 : 0;
      const lost = awayScore < homeScore ? 1 : 0;
      const points = won * 3 + drawn;
      const result = awayScore > homeScore ? 'W' : awayScore < homeScore ? 'L' : 'D';
      const form = [...entry.form, result].slice(-5);
      const awayForm = [...(entry.awayForm || []), result].slice(-5);
      
      let streak = entry.streak || 0;
      let morale = entry.morale || 70;
      
      if (won) {
        streak = streak >= 0 ? streak + 1 : 1;
        morale = Math.min(100, morale + 7); // Ganar fuera da más moral
      } else if (lost) {
        streak = streak <= 0 ? streak - 1 : -1;
        morale = Math.max(20, morale - 5); // Perder fuera es más normal
      } else {
        streak = 0;
        morale = Math.max(40, Math.min(85, morale));
      }
      
      return {
        ...entry,
        played: entry.played + 1,
        won: entry.won + won,
        drawn: entry.drawn + drawn,
        lost: entry.lost + lost,
        goalsFor: entry.goalsFor + awayScore,
        goalsAgainst: entry.goalsAgainst + homeScore,
        goalDifference: entry.goalDifference + awayScore - homeScore,
        points: entry.points + points,
        form,
        awayForm,
        streak,
        morale
      };
    }
    
    return entry;
  });
  
  return sortTable(newTable);
}

export function sortTable(table) {
  return [...table].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    // Alphabetical tiebreaker (ascending)
    return (a.teamName || a.teamId || '').localeCompare(b.teamName || b.teamId || '');
  });
}

// ============== UTILIDADES ==============
export function getWeekFixtures(fixtures, week) {
  return fixtures.filter(f => f.week === week);
}

export function getNextFixture(fixtures, teamId, currentWeek) {
  return fixtures.find(f => 
    f.week >= currentWeek && 
    !f.played && 
    (f.homeTeam === teamId || f.awayTeam === teamId)
  );
}

export function simulateWeekMatches(fixtures, table, week, playerTeamId, allTeams) {
  let updatedTable = [...table];
  
  const updatedFixtures = fixtures.map(fixture => {
    if (fixture.played || fixture.week !== week) return fixture;
    if (fixture.homeTeam === playerTeamId || fixture.awayTeam === playerTeamId) return fixture;
    
    const homeTeam = allTeams.find(t => t.id === fixture.homeTeam);
    const awayTeam = allTeams.find(t => t.id === fixture.awayTeam);
    
    if (!homeTeam || !awayTeam) return fixture;
    
    // Obtener moral de la clasificación
    const homeEntry = updatedTable.find(t => t.teamId === fixture.homeTeam);
    const awayEntry = updatedTable.find(t => t.teamId === fixture.awayTeam);
    
    // For AI vs AI matches, both teams are AI so no playerTeamForm needed
    // Add random tactics and momentum for variety
    const aiTactics = ['balanced', 'attacking', 'defensive', 'possession', 'counter'];
    const pickTactic = () => aiTactics[Math.floor(Math.random() * aiTactics.length)];
    const result = simulateMatch(fixture.homeTeam, fixture.awayTeam, homeTeam, awayTeam, {
      homeMorale: homeEntry?.morale || 70,
      awayMorale: awayEntry?.morale || 70,
      homeTactic: pickTactic(),
      awayTactic: pickTactic(),
      homeSeasonMomentum: homeEntry?.streak || 0,
      awaySeasonMomentum: awayEntry?.streak || 0
    }, {}, null); // No player team, so both get AI form
    
    updatedTable = updateTable(updatedTable, fixture.homeTeam, fixture.awayTeam, result.homeScore, result.awayScore);
    
    return {
      ...fixture,
      played: true,
      homeScore: result.homeScore,
      awayScore: result.awayScore,
      events: result.events,
      stats: result.stats
    };
  });
  
  return { fixtures: updatedFixtures, table: updatedTable };
}

export function getWeekResults(fixtures, week) {
  return fixtures.filter(f => f.week === week && f.played);
}
