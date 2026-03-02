// ============================================================
// WORLD CUP ENGINE — Tournament structure & match management
// ============================================================

/**
 * Generate World Cup tournament structure
 * @param {Array} teams - 32 national teams (sorted by FIFA ranking)
 * @param {string} playerTeamId - the team the player chose
 * @returns {Object} tournament state
 */
export function generateWorldCup(teams, playerTeamId) {
  // Seed pots (like real World Cup draw)
  // Pot 1: teams ranked 1-8 (+ host if applicable)
  // Pot 2: teams ranked 9-16
  // Pot 3: teams ranked 17-24
  // Pot 4: teams ranked 25-32
  const pots = [
    teams.slice(0, 8),
    teams.slice(8, 16),
    teams.slice(16, 24),
    teams.slice(24, 32),
  ];

  // Draw groups (8 groups of 4, one team from each pot)
  const groups = drawGroups(pots);

  // Generate group stage fixtures
  const groupFixtures = generateGroupFixtures(groups);

  return {
    teams: teams.slice(0, 32),
    playerTeamId,
    groups,
    groupFixtures,
    knockoutBracket: null, // generated after group stage
    phase: 'groups', // 'groups' | 'round16' | 'quarters' | 'semis' | 'final'
    currentMatchday: 0, // 0, 1, 2 for groups; then knockout rounds
    results: [],
    // Resource bars (Reigns-style)
    morale: 60,
    fitness: 75,
    pressure: 30,
    budget: 50,
    // Event tracking
    usedEvents: [],
    pendingChains: [],
    pendingChainDef: null,
    eventHistory: [],
  };
}

/**
 * Draw groups from seeding pots
 * Each group gets one team from each pot
 * Constraint: no two teams from same confederation in a group (except UEFA max 2)
 */
function drawGroups(pots) {
  const groups = Array.from({ length: 8 }, (_, i) => ({
    name: String.fromCharCode(65 + i), // A-H
    teams: [],
    table: [],
  }));

  // Simple draw: shuffle each pot, assign sequentially
  // (Real FIFA draw has more constraints, but this works for gameplay)
  for (const pot of pots) {
    const shuffled = shuffleArray([...pot]);
    shuffled.forEach((team, idx) => {
      groups[idx].teams.push(team.id);
    });
  }

  // Initialize table
  for (const group of groups) {
    group.table = group.teams.map(teamId => ({
      teamId,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0,
    }));
  }

  return groups;
}

/**
 * Generate round-robin fixtures for all groups
 * Each group plays 3 matchdays (every team plays every other team once)
 */
function generateGroupFixtures(groups) {
  const allFixtures = [];

  for (const group of groups) {
    const t = group.teams;
    // Standard round-robin for 4 teams: 3 matchdays
    const matchdays = [
      // Matchday 1
      [{ home: t[0], away: t[1], group: group.name, matchday: 0 },
       { home: t[2], away: t[3], group: group.name, matchday: 0 }],
      // Matchday 2
      [{ home: t[0], away: t[2], group: group.name, matchday: 1 },
       { home: t[3], away: t[1], group: group.name, matchday: 1 }],
      // Matchday 3
      [{ home: t[0], away: t[3], group: group.name, matchday: 2 },
       { home: t[1], away: t[2], group: group.name, matchday: 2 }],
    ];

    for (const md of matchdays) {
      for (const fixture of md) {
        allFixtures.push({
          ...fixture,
          played: false,
          homeScore: null,
          awayScore: null,
        });
      }
    }
  }

  return allFixtures;
}

/**
 * Get the player's next match
 */
export function getPlayerNextMatch(state) {
  const { playerTeamId, phase } = state;

  if (phase === 'groups') {
    return state.groupFixtures.find(f =>
      !f.played && (f.home === playerTeamId || f.away === playerTeamId)
    );
  }

  // Knockout
  if (state.knockoutBracket) {
    const roundKey = phase; // 'round16', 'quarters', 'semis', 'final'
    const round = state.knockoutBracket[roundKey];
    if (round) {
      return round.find(f =>
        !f.played && (f.home === playerTeamId || f.away === playerTeamId)
      );
    }
  }

  return null;
}

/**
 * Simulate all other matches in the current matchday (not the player's match)
 */
export function simulateMatchday(state, playerTeamId) {
  const newState = { ...state };

  if (state.phase === 'groups') {
    const matchday = state.currentMatchday;
    const fixtures = newState.groupFixtures.filter(f =>
      f.matchday === matchday && !f.played &&
      f.home !== playerTeamId && f.away !== playerTeamId
    );

    for (const fixture of fixtures) {
      const result = simulateNPCMatch(fixture, state.teams);
      fixture.played = true;
      fixture.homeScore = result.homeScore;
      fixture.awayScore = result.awayScore;
      updateGroupTable(newState, fixture);
    }
  } else if (state.knockoutBracket) {
    const round = newState.knockoutBracket[state.phase];
    if (round) {
      const fixtures = round.filter(f =>
        !f.played && f.home !== playerTeamId && f.away !== playerTeamId
      );
      for (const fixture of fixtures) {
        const result = simulateNPCMatch(fixture, state.teams, true);
        fixture.played = true;
        fixture.homeScore = result.homeScore;
        fixture.awayScore = result.awayScore;
        fixture.winner = result.winner;
        if (result.penalties) fixture.penalties = result.penalties;
      }
    }
  }

  return newState;
}

/**
 * Record the player's match result
 */
export function recordPlayerMatch(state, fixture, homeScore, awayScore, penalties) {
  const newState = { ...state };

  fixture.played = true;
  fixture.homeScore = homeScore;
  fixture.awayScore = awayScore;

  if (state.phase === 'groups') {
    updateGroupTable(newState, fixture);
  } else {
    // Knockout: determine winner
    if (homeScore !== awayScore) {
      fixture.winner = homeScore > awayScore ? fixture.home : fixture.away;
    } else if (penalties) {
      fixture.penalties = penalties;
      fixture.winner = penalties.winner;
    }
  }

  newState.results.push({ ...fixture });
  return newState;
}

/**
 * Update group table after a match result
 */
function updateGroupTable(state, fixture) {
  const group = state.groups.find(g => g.name === fixture.group);
  if (!group) return;

  const homeEntry = group.table.find(t => t.teamId === fixture.home);
  const awayEntry = group.table.find(t => t.teamId === fixture.away);
  if (!homeEntry || !awayEntry) return;

  homeEntry.played++;
  awayEntry.played++;
  homeEntry.goalsFor += fixture.homeScore;
  homeEntry.goalsAgainst += fixture.awayScore;
  awayEntry.goalsFor += fixture.awayScore;
  awayEntry.goalsAgainst += fixture.homeScore;

  if (fixture.homeScore > fixture.awayScore) {
    homeEntry.won++;
    homeEntry.points += 3;
    awayEntry.lost++;
  } else if (fixture.homeScore < fixture.awayScore) {
    awayEntry.won++;
    awayEntry.points += 3;
    homeEntry.lost++;
  } else {
    homeEntry.drawn++;
    awayEntry.drawn++;
    homeEntry.points += 1;
    awayEntry.points += 1;
  }

  // Sort table
  group.table.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const gdA = a.goalsFor - a.goalsAgainst;
    const gdB = b.goalsFor - b.goalsAgainst;
    if (gdB !== gdA) return gdB - gdA;
    return b.goalsFor - a.goalsFor;
  });
}

/**
 * Check if group stage is complete and generate knockout bracket
 */
export function checkGroupStageComplete(state) {
  const allGroupsPlayed = state.groupFixtures.every(f => f.played);
  if (!allGroupsPlayed) return state;

  // Get qualified teams: top 2 from each group
  const winners = [];
  const runnersUp = [];

  for (const group of state.groups) {
    winners.push({ teamId: group.table[0].teamId, group: group.name, position: 1 });
    runnersUp.push({ teamId: group.table[1].teamId, group: group.name, position: 2 });
  }

  // Standard World Cup bracket:
  // 1A vs 2B, 1C vs 2D, 1E vs 2F, 1G vs 2H (left bracket)
  // 1B vs 2A, 1D vs 2C, 1F vs 2E, 1H vs 2G (right bracket)
  const getWinner = (groupName) => winners.find(w => w.group === groupName).teamId;
  const getRunner = (groupName) => runnersUp.find(r => r.group === groupName).teamId;

  const round16 = [
    { home: getWinner('A'), away: getRunner('B'), played: false, homeScore: null, awayScore: null, winner: null, bracketSide: 'left' },
    { home: getWinner('C'), away: getRunner('D'), played: false, homeScore: null, awayScore: null, winner: null, bracketSide: 'left' },
    { home: getWinner('E'), away: getRunner('F'), played: false, homeScore: null, awayScore: null, winner: null, bracketSide: 'left' },
    { home: getWinner('G'), away: getRunner('H'), played: false, homeScore: null, awayScore: null, winner: null, bracketSide: 'left' },
    { home: getWinner('B'), away: getRunner('A'), played: false, homeScore: null, awayScore: null, winner: null, bracketSide: 'right' },
    { home: getWinner('D'), away: getRunner('C'), played: false, homeScore: null, awayScore: null, winner: null, bracketSide: 'right' },
    { home: getWinner('F'), away: getRunner('E'), played: false, homeScore: null, awayScore: null, winner: null, bracketSide: 'right' },
    { home: getWinner('H'), away: getRunner('G'), played: false, homeScore: null, awayScore: null, winner: null, bracketSide: 'right' },
  ];

  return {
    ...state,
    phase: 'round16',
    currentMatchday: 0,
    knockoutBracket: {
      round16,
      quarters: [],
      semis: [],
      final: [],
    },
  };
}

/**
 * Advance knockout bracket after a round is complete
 */
export function advanceKnockout(state) {
  const bracket = state.knockoutBracket;
  if (!bracket) return state;

  const { phase } = state;

  if (phase === 'round16') {
    const r16 = bracket.round16;
    if (!r16.every(f => f.played)) return state;

    const quarters = [];
    for (let i = 0; i < r16.length; i += 2) {
      quarters.push({
        home: r16[i].winner,
        away: r16[i + 1].winner,
        played: false,
        homeScore: null,
        awayScore: null,
        winner: null,
        bracketSide: r16[i].bracketSide,
      });
    }

    return { ...state, phase: 'quarters', knockoutBracket: { ...bracket, quarters } };
  }

  if (phase === 'quarters') {
    const qf = bracket.quarters;
    if (!qf.every(f => f.played)) return state;

    const semis = [];
    for (let i = 0; i < qf.length; i += 2) {
      semis.push({
        home: qf[i].winner,
        away: qf[i + 1].winner,
        played: false,
        homeScore: null,
        awayScore: null,
        winner: null,
      });
    }

    return { ...state, phase: 'semis', knockoutBracket: { ...bracket, semis } };
  }

  if (phase === 'semis') {
    const sf = bracket.semis;
    if (!sf.every(f => f.played)) return state;

    const final = [{
      home: sf[0].winner,
      away: sf[1].winner,
      played: false,
      homeScore: null,
      awayScore: null,
      winner: null,
      isFinal: true,
    }];

    return { ...state, phase: 'final', knockoutBracket: { ...bracket, final } };
  }

  return state;
}

/**
 * Check if player is eliminated
 */
export function isPlayerEliminated(state) {
  const { playerTeamId, phase } = state;

  if (phase === 'groups') {
    // Check after all 3 matchdays
    const playerGroup = state.groups.find(g => g.teams.includes(playerTeamId));
    if (!playerGroup) return true;
    const allPlayed = state.groupFixtures.filter(f => f.group === playerGroup.name).every(f => f.played);
    if (!allPlayed) return false;
    const position = playerGroup.table.findIndex(t => t.teamId === playerTeamId);
    return position > 1; // Only top 2 qualify
  }

  // Knockout: check if player's match was played and they lost
  if (state.knockoutBracket) {
    const round = state.knockoutBracket[phase];
    if (round) {
      const playerMatch = round.find(f =>
        f.played && (f.home === playerTeamId || f.away === playerTeamId)
      );
      if (playerMatch && playerMatch.winner !== playerTeamId) return true;
    }
  }

  return false;
}

/**
 * Check if player won the World Cup
 */
export function isWorldCupWinner(state) {
  if (state.phase !== 'final') return false;
  const final = state.knockoutBracket?.final?.[0];
  return final?.played && final.winner === state.playerTeamId;
}

// ── Helpers ──

function simulateNPCMatch(fixture, teams, isKnockout = false) {
  const homeTeam = teams.find(t => t.id === fixture.home);
  const awayTeam = teams.find(t => t.id === fixture.away);

  const homeRating = homeTeam?.rating || 70;
  const awayRating = awayTeam?.rating || 70;

  // Simple goal simulation based on ratings
  const homeExpected = (homeRating / 100) * 2.5 + 0.3; // home advantage
  const awayExpected = (awayRating / 100) * 2.0;

  const homeScore = poissonRandom(homeExpected);
  const awayScore = poissonRandom(awayExpected);

  const result = { homeScore, awayScore };

  if (isKnockout && homeScore === awayScore) {
    // Penalties — simulate fair 5-round shootout
    let homePen = 0, awayPen = 0;
    for (let i = 0; i < 5; i++) {
      if (Math.random() < 0.75) homePen++;
      if (Math.random() < 0.75) awayPen++;
    }
    // Sudden death if tied
    while (homePen === awayPen) {
      const hGoal = Math.random() < 0.75;
      const aGoal = Math.random() < 0.75;
      if (hGoal) homePen++;
      if (aGoal) awayPen++;
    }
    result.penalties = {
      home: homePen,
      away: awayPen,
      winner: homePen > awayPen ? fixture.home : fixture.away,
    };
    result.winner = result.penalties.winner;
  } else {
    result.winner = homeScore > awayScore ? fixture.home : fixture.away;
  }

  return result;
}

function poissonRandom(lambda) {
  let L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  return k - 1;
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
