// ============================================================
// SWISS SYSTEM — Draw engine for UEFA league phase
// ============================================================
// Implements the new UEFA format: 32 teams, 4 pots of 8,
// 8 matches each (2 per pot: 1 home, 1 away). No same-league clashes.
// ============================================================

/**
 * Divide teams into 4 pots of 8, sorted by reputation/overall
 * @param {Array} teams - Array of team objects (must have reputation or overall)
 * @returns {Array[]} 4 arrays of 8 teams each
 */
export function createPots(teams) {
  // Sort by reputation (primary), then overall (secondary)
  const sorted = [...teams].sort((a, b) => {
    const repDiff = (b.reputation || 0) - (a.reputation || 0);
    if (repDiff !== 0) return repDiff;
    return (b.overall || 0) - (a.overall || 0);
  });

  const potSize = 8;
  const pots = [];
  for (let i = 0; i < 4; i++) {
    pots.push(sorted.slice(i * potSize, (i + 1) * potSize));
  }
  return pots;
}

/**
 * Seeded shuffle — Fisher-Yates with optional seed for reproducibility
 */
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function hasCompleteFixtureSlate(fixtures, teams, expectedMatches) {
  const counts = new Map(teams.map(t => [t.teamId, 0]));
  const seenPairs = new Set();
  for (const fixture of fixtures) {
    if (!counts.has(fixture.homeTeamId) || !counts.has(fixture.awayTeamId)) return false;
    const pairKey = [fixture.homeTeamId, fixture.awayTeamId].sort().join('::');
    if (seenPairs.has(pairKey)) return false;
    seenPairs.add(pairKey);
    counts.set(fixture.homeTeamId, counts.get(fixture.homeTeamId) + 1);
    counts.set(fixture.awayTeamId, counts.get(fixture.awayTeamId) + 1);
  }
  return [...counts.values()].every(count => count === expectedMatches);
}

function hasOneMatchPerTeamPerMatchday(matchdays, teams) {
  const expected = new Set(teams.map(t => t.teamId));
  return matchdays.every(matchday => {
    const played = new Set();
    for (const fixture of matchday) {
      if (played.has(fixture.homeTeamId) || played.has(fixture.awayTeamId)) return false;
      played.add(fixture.homeTeamId);
      played.add(fixture.awayTeamId);
    }
    return played.size === expected.size && [...expected].every(teamId => played.has(teamId));
  });
}

function generateBalancedFallbackMatchdays(teams, numMatchdays) {
  const ordered = shuffleArray(teams);
  const fixed = ordered[0];
  let rotating = ordered.slice(1);
  const matchdays = [];

  for (let round = 0; round < numMatchdays; round++) {
    const roundTeams = [fixed, ...rotating];
    const fixtures = [];
    for (let i = 0; i < roundTeams.length / 2; i++) {
      const a = roundTeams[i];
      const b = roundTeams[roundTeams.length - 1 - i];
      const aHome = (round + i) % 2 === 0;
      fixtures.push({
        homeTeamId: aHome ? a.teamId : b.teamId,
        awayTeamId: aHome ? b.teamId : a.teamId,
        homeTeamName: aHome ? (a.teamName || a.name) : (b.teamName || b.name),
        awayTeamName: aHome ? (b.teamName || b.name) : (a.teamName || a.name),
        matchday: round + 1,
        homePot: null,
        awayPot: null
      });
    }
    matchdays.push(fixtures);
    rotating = [rotating[rotating.length - 1], ...rotating.slice(0, -1)];
  }

  return matchdays;
}

/**
 * Generate the Swiss-system draw for 32 teams.
 * Each team plays 8 matches: 2 from each pot (1 home, 1 away).
 * No team plays against a team from the same league.
 * 
 * @param {Array} teams - 32 team objects with { teamId, league, reputation, ... }
 * @returns {{ matchdays: Array[], pots: Array[] }}
 *   matchdays: 8 arrays of fixtures [{ homeTeamId, awayTeamId, matchday }]
 *   pots: the 4 pots used
 */
export function generateSwissDraw(teams) {
  // Don't mutate the input array
  teams = [...teams];
  if (teams.length < 32) {
    console.warn(`Swiss draw: expected 32 teams, got ${teams.length}. Padding with placeholder teams.`);
    // Pad with placeholder teams if needed
    while (teams.length < 32) {
      teams.push({
        teamId: `placeholder_${teams.length}`,
        teamName: `Placeholder ${teams.length + 1}`,
        shortName: `PLH`,
        league: `placeholder_league_${teams.length}`,
        reputation: 50,
        overall: 50,
        players: []
      });
    }
  }

  const pots = createPots(teams);

  // Find which pot a team belongs to
  const teamPot = new Map();
  pots.forEach((pot, potIdx) => {
    pot.forEach(t => teamPot.set(t.teamId, potIdx));
  });

  // Generate fixtures: each team plays 8 matches (2 per pot, 1 home 1 away per pot)
  let fixtures = generateConstrainedFixtures(teams, pots, teamPot);
  
  // The constrained generator is intentionally heuristic. If it cannot build a complete
  // 8-match slate for all clubs, use a guaranteed balanced Swiss-style fallback so the
  // European engine never creates missing player matchdays.
  if (!hasCompleteFixtureSlate(fixtures, teams, 8)) {
    console.warn('Swiss draw: constrained fixture generation incomplete; using balanced fallback draw.');
    const matchdays = generateBalancedFallbackMatchdays(teams, 8);
    return { matchdays, pots };
  }

  // Distribute fixtures across 8 matchdays
  const matchdays = distributeToMatchdays(fixtures, 8);

  if (!hasOneMatchPerTeamPerMatchday(matchdays, teams)) {
    console.warn('Swiss draw: fixture distribution incomplete; using balanced fallback draw.');
    return { matchdays: generateBalancedFallbackMatchdays(teams, 8), pots };
  }

  return { matchdays, pots };
}

/**
 * Generate constrained fixtures:
 * - Each team plays exactly 8 matches (2 per pot, 1 home 1 away per pot)
 * - No same-league opponents (soft constraint — relaxed if impossible)
 */
function generateConstrainedFixtures(teams, pots, teamPot) {
  const fixtures = [];
  const teamFixtureCount = new Map();
  const teamOpponents = new Map(); // teamId → Set of opponentIds
  const teamPotHome = new Map();   // teamId → { potIdx: count }
  const teamPotAway = new Map();   // teamId → { potIdx: count }

  teams.forEach(t => {
    teamFixtureCount.set(t.teamId, 0);
    teamOpponents.set(t.teamId, new Set());
    const homeMap = {};
    const awayMap = {};
    for (let p = 0; p < 4; p++) {
      homeMap[p] = 0;
      awayMap[p] = 0;
    }
    teamPotHome.set(t.teamId, homeMap);
    teamPotAway.set(t.teamId, awayMap);
  });

  // Build team lookup
  const teamMap = new Map();
  teams.forEach(t => teamMap.set(t.teamId, t));

  // Process pot by pot: assign 2 matches per team from each pot
  for (let targetPotIdx = 0; targetPotIdx < 4; targetPotIdx++) {
    const potTeams = pots[targetPotIdx];

    // Each team in the competition needs 2 opponents from this pot (1H, 1A)
    // Teams IN this pot also need 2 opponents from THIS pot (intra-pot)
    for (const team of shuffleArray(teams)) {
      const myPot = teamPot.get(team.teamId);
      const opponents = teamOpponents.get(team.teamId);
      const homeCount = teamPotHome.get(team.teamId);
      const awayCount = teamPotAway.get(team.teamId);

      // How many more fixtures does this team need from targetPot?
      const neededHome = 1 - homeCount[targetPotIdx];
      const neededAway = 1 - awayCount[targetPotIdx];

      // Find valid opponents from targetPot
      const candidates = shuffleArray(potTeams).filter(c => {
        if (c.teamId === team.teamId) return false;
        if (opponents.has(c.teamId)) return false;
        if (teamFixtureCount.get(c.teamId) >= 8) return false;
        return true;
      });

      // Prefer different-league opponents
      const preferredCandidates = candidates.filter(c => c.league !== team.league);
      const pool = preferredCandidates.length > 0 ? preferredCandidates : candidates;

      // Assign home fixture from this pot
      if (neededHome > 0 && pool.length > 0) {
        const opp = pool.shift();
        if (opp) {
          const oppAwayCount = teamPotAway.get(opp.teamId);
          const oppOwnPot = teamPot.get(opp.teamId);
          
          // Check opponent can be away (must need an away match vs this pot AND have room)
          if (oppAwayCount[myPot] < 1 && teamFixtureCount.get(opp.teamId) < 8) {
            fixtures.push({
              homeTeamId: team.teamId,
              awayTeamId: opp.teamId,
              homePot: myPot,
              awayPot: teamPot.get(opp.teamId)
            });
            homeCount[targetPotIdx]++;
            oppAwayCount[myPot] = (oppAwayCount[myPot] || 0) + 1;
            opponents.add(opp.teamId);
            teamOpponents.get(opp.teamId).add(team.teamId);
            teamFixtureCount.set(team.teamId, teamFixtureCount.get(team.teamId) + 1);
            teamFixtureCount.set(opp.teamId, teamFixtureCount.get(opp.teamId) + 1);
          }
        }
      }

      // Assign away fixture from this pot
      const remainingPool = pool.filter(c => 
        !opponents.has(c.teamId) && 
        c.teamId !== team.teamId &&
        teamFixtureCount.get(c.teamId) < 8
      );
      if (neededAway > 0 && remainingPool.length > 0) {
        const opp = remainingPool[0];
        if (opp) {
          const oppHomeCount = teamPotHome.get(opp.teamId);
          
          // Check opponent can be home (must need a home match vs this pot)
          if (oppHomeCount[myPot] < 1) {
            fixtures.push({
              homeTeamId: opp.teamId,
              awayTeamId: team.teamId,
              homePot: teamPot.get(opp.teamId),
              awayPot: myPot
            });
            awayCount[targetPotIdx]++;
            oppHomeCount[myPot] = (oppHomeCount[myPot] || 0) + 1;
            opponents.add(opp.teamId);
            teamOpponents.get(opp.teamId).add(team.teamId);
            teamFixtureCount.set(team.teamId, teamFixtureCount.get(team.teamId) + 1);
            teamFixtureCount.set(opp.teamId, teamFixtureCount.get(opp.teamId) + 1);
          }
        }
      }
    }
  }

  // Fill any teams with < 8 fixtures with extra matches
  const underScheduled = teams.filter(t => teamFixtureCount.get(t.teamId) < 8);
  for (const team of underScheduled) {
    const opponents = teamOpponents.get(team.teamId);
    const needed = 8 - teamFixtureCount.get(team.teamId);
    
    const candidates = shuffleArray(teams).filter(c => {
      if (c.teamId === team.teamId) return false;
      if (opponents.has(c.teamId)) return false;
      if (teamFixtureCount.get(c.teamId) >= 8) return false;
      return true;
    });

    for (let i = 0; i < needed && i < candidates.length; i++) {
      const opp = candidates[i];
      const isHome = Math.random() > 0.5;
      fixtures.push({
        homeTeamId: isHome ? team.teamId : opp.teamId,
        awayTeamId: isHome ? opp.teamId : team.teamId,
        homePot: teamPot.get(isHome ? team.teamId : opp.teamId),
        awayPot: teamPot.get(isHome ? opp.teamId : team.teamId)
      });
      opponents.add(opp.teamId);
      teamOpponents.get(opp.teamId).add(team.teamId);
      teamFixtureCount.set(team.teamId, teamFixtureCount.get(team.teamId) + 1);
      teamFixtureCount.set(opp.teamId, teamFixtureCount.get(opp.teamId) + 1);
    }
  }

  return fixtures;
}

/**
 * Distribute fixtures evenly across N matchdays.
 * Each team plays at most 1 match per matchday.
 * 
 * @param {Array} fixtures
 * @param {number} numMatchdays
 * @returns {Array[]} array of matchday arrays
 */
function distributeToMatchdays(fixtures, numMatchdays) {
  const teamIds = Array.from(new Set(fixtures.flatMap(f => [f.homeTeamId, f.awayTeamId])));

  // A UEFA league-phase draw needs every team to have exactly one fixture per matchday.
  // The old greedy fallback put clashes into the least-full day when it got stuck, which
  // could leave the player's team without a match on some matchdays. Try shuffled greedy
  // schedules until all days are conflict-free and balanced; fall back only after that.
  for (let attempt = 0; attempt < 250; attempt++) {
    const matchdays = Array.from({ length: numMatchdays }, () => []);
    const teamMatchday = new Map(teamIds.map(id => [id, new Set()]));
    const ordered = shuffleArray(fixtures).sort((a, b) => {
      const aFlex = numMatchdays - (teamMatchday.get(a.homeTeamId)?.size || 0) - (teamMatchday.get(a.awayTeamId)?.size || 0);
      const bFlex = numMatchdays - (teamMatchday.get(b.homeTeamId)?.size || 0) - (teamMatchday.get(b.awayTeamId)?.size || 0);
      return aFlex - bFlex;
    });
    let failed = false;

    for (const fixture of ordered) {
      const homeUsed = teamMatchday.get(fixture.homeTeamId);
      const awayUsed = teamMatchday.get(fixture.awayTeamId);
      const candidates = Array.from({ length: numMatchdays }, (_, idx) => idx)
        .filter(md => !homeUsed.has(md) && !awayUsed.has(md))
        .sort((a, b) => matchdays[a].length - matchdays[b].length || a - b);

      if (!candidates.length) {
        failed = true;
        break;
      }

      const md = candidates[0];
      matchdays[md].push({ ...fixture, matchday: md + 1 });
      homeUsed.add(md);
      awayUsed.add(md);
    }

    if (failed) continue;

    const valid = teamIds.every(teamId => {
      const used = teamMatchday.get(teamId);
      return used && used.size === numMatchdays;
    }) && matchdays.every(md => new Set(md.flatMap(f => [f.homeTeamId, f.awayTeamId])).size === md.length * 2);

    if (valid) return matchdays;
  }

  // Last-resort legacy behaviour: keep the game running, but make the warning explicit.
  console.warn('Swiss draw: could not distribute fixtures into clash-free matchdays after retries.');
  const matchdays = Array.from({ length: numMatchdays }, () => []);
  for (const [idx, fixture] of fixtures.entries()) {
    const md = idx % numMatchdays;
    matchdays[md].push({ ...fixture, matchday: md + 1 });
  }
  return matchdays;
}

// ============================================================
// STANDINGS
// ============================================================

/**
 * Compute Swiss standings from match results.
 * 
 * @param {Array} teams - All 32 teams in the competition
 * @param {Array} results - Array of { homeTeamId, awayTeamId, homeScore, awayScore }
 * @returns {Array} Sorted standings array
 */
export function getSwissStandings(teams, results) {
  // Initialize standings
  const standingsMap = new Map();
  teams.forEach(t => {
    standingsMap.set(t.teamId, {
      teamId: t.teamId,
      teamName: t.teamName || t.name || t.teamId,
      shortName: t.shortName || '',
      league: t.league || '',
      reputation: t.reputation || 70,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0
    });
  });

  // Process results
  for (const r of results) {
    const home = standingsMap.get(r.homeTeamId);
    const away = standingsMap.get(r.awayTeamId);
    if (!home || !away) continue;

    home.played++;
    away.played++;
    home.goalsFor += r.homeScore;
    home.goalsAgainst += r.awayScore;
    away.goalsFor += r.awayScore;
    away.goalsAgainst += r.homeScore;

    if (r.homeScore > r.awayScore) {
      home.won++;
      home.points += 3;
      away.lost++;
    } else if (r.homeScore < r.awayScore) {
      away.won++;
      away.points += 3;
      home.lost++;
    } else {
      home.drawn++;
      away.drawn++;
      home.points += 1;
      away.points += 1;
    }
  }

  // Update goal difference and sort
  const standings = Array.from(standingsMap.values());
  standings.forEach(s => {
    s.goalDifference = s.goalsFor - s.goalsAgainst;
  });

  // Sort: points DESC, goal difference DESC, goals scored DESC, reputation DESC
  standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return (b.reputation || 0) - (a.reputation || 0);
  });

  return standings;
}

// ============================================================
// QUALIFICATION FROM SWISS PHASE
// ============================================================

/**
 * Determine qualification from Swiss standings (32 teams):
 * - 1st–8th → Round of 16 directly
 * - 9th–24th → Playoff round (seeded vs unseeded)
 * - 25th–32nd → Eliminated
 * 
 * @param {Array} standings - Sorted Swiss standings
 * @returns {{ direct: Array, playoffSeeded: Array, playoffUnseeded: Array, eliminated: Array }}
 */
export function determineSwissQualification(standings) {
  return {
    direct: standings.slice(0, 8),              // Direct to R16
    playoffSeeded: standings.slice(8, 16),       // 9th-16th (seeded in playoffs)
    playoffUnseeded: standings.slice(16, 24),    // 17th-24th (unseeded in playoffs)
    eliminated: standings.slice(24)              // 25th-32nd out
  };
}
