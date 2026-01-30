// ============================================================
// EUROPEAN COMPETITIONS — Config & Qualification System
// ============================================================
// Defines Champions League, Europa League, Conference League
// with realistic prize money and league slot allocations.
// ============================================================

// ============================================================
// COMPETITION CONFIGS
// ============================================================

export const CHAMPIONS_LEAGUE = {
  id: 'championsLeague',
  name: 'UEFA Champions League',
  shortName: 'Champions',
  icon: '🏆',
  color: '#1a237e',
  teamsCount: 32,
  potsCount: 4,
  matchesPerTeam: 8,
  prizes: {
    participation: 15_000_000,
    winBonus: 2_800_000,
    drawBonus: 930_000,
    r16: 11_000_000,
    qf: 12_500_000,
    sf: 15_000_000,
    final: 18_500_000,
    winnerExtra: 4_500_000
  }
};

export const EUROPA_LEAGUE = {
  id: 'europaLeague',
  name: 'UEFA Europa League',
  shortName: 'Europa League',
  icon: '🥈',
  color: '#e65100',
  teamsCount: 32,
  potsCount: 4,
  matchesPerTeam: 8,
  prizes: {
    participation: 4_000_000,
    winBonus: 600_000,
    drawBonus: 200_000,
    r16: 1_200_000,
    qf: 1_800_000,
    sf: 2_800_000,
    final: 4_000_000,
    winnerExtra: 4_000_000
  }
};

export const CONFERENCE_LEAGUE = {
  id: 'conferenceleague',
  name: 'UEFA Conference League',
  shortName: 'Conference',
  icon: '🥉',
  color: '#2e7d32',
  teamsCount: 32,
  potsCount: 4,
  matchesPerTeam: 8,
  prizes: {
    participation: 3_000_000,
    winBonus: 500_000,
    drawBonus: 150_000,
    r16: 600_000,
    qf: 1_000_000,
    sf: 2_000_000,
    final: 3_000_000,
    winnerExtra: 3_000_000
  }
};

export const COMPETITIONS = {
  championsLeague: CHAMPIONS_LEAGUE,
  europaLeague: EUROPA_LEAGUE,
  conferenceleague: CONFERENCE_LEAGUE
};

// ============================================================
// LEAGUE SLOTS — How many teams each league sends per competition
// ============================================================
// Easily extensible: just add new leagues here.

// LEAGUE_SLOTS — 32 teams per competition
// CL: 4+4+4+4+3+2+2+1+1+1+1+1+1+1+1+1 = 32
// EL: 2+2+2+2+1+2+2+3+3+2+2+2+2+2+1+2 = 32
// ECL: 1+1+1+1+1+3+3+3+3+2+2+2+2+2+2+3 = 32
export const LEAGUE_SLOTS = {
  laliga: {
    leagueId: 'laliga',
    name: 'La Liga',
    country: 'España',
    championsLeague: 4,
    europaLeague: 2,
    conferenceleague: 1
  },
  premierLeague: {
    leagueId: 'premierLeague',
    name: 'Premier League',
    country: 'Inglaterra',
    championsLeague: 4,
    europaLeague: 2,
    conferenceleague: 1
  },
  serieA: {
    leagueId: 'serieA',
    name: 'Serie A',
    country: 'Italia',
    championsLeague: 4,
    europaLeague: 2,
    conferenceleague: 1
  },
  bundesliga: {
    leagueId: 'bundesliga',
    name: 'Bundesliga',
    country: 'Alemania',
    championsLeague: 4,
    europaLeague: 2,
    conferenceleague: 1
  },
  ligue1: {
    leagueId: 'ligue1',
    name: 'Ligue 1',
    country: 'Francia',
    championsLeague: 3,
    europaLeague: 1,
    conferenceleague: 1
  },
  eredivisie: {
    leagueId: 'eredivisie',
    name: 'Eredivisie',
    country: 'Países Bajos',
    championsLeague: 2,
    europaLeague: 2,
    conferenceleague: 3
  },
  primeiraLiga: {
    leagueId: 'primeiraLiga',
    name: 'Primeira Liga',
    country: 'Portugal',
    championsLeague: 2,
    europaLeague: 2,
    conferenceleague: 3
  },
  belgianPro: {
    leagueId: 'belgianPro',
    name: 'Jupiler Pro League',
    country: 'Bélgica',
    championsLeague: 1,
    europaLeague: 3,
    conferenceleague: 3
  },
  superLig: {
    leagueId: 'superLig',
    name: 'Süper Lig',
    country: 'Turquía',
    championsLeague: 1,
    europaLeague: 3,
    conferenceleague: 3
  },
  scottishPrem: {
    leagueId: 'scottishPrem',
    name: 'Scottish Premiership',
    country: 'Escocia',
    championsLeague: 1,
    europaLeague: 2,
    conferenceleague: 2
  },
  austrianBundesliga: {
    leagueId: 'austrianBundesliga',
    name: 'Bundesliga (AT)',
    country: 'Austria',
    championsLeague: 1,
    europaLeague: 2,
    conferenceleague: 2
  },
  greekSuperLeague: {
    leagueId: 'greekSuperLeague',
    name: 'Super League',
    country: 'Grecia',
    championsLeague: 1,
    europaLeague: 2,
    conferenceleague: 2
  },
  swissSuperLeague: {
    leagueId: 'swissSuperLeague',
    name: 'Super League (CH)',
    country: 'Suiza',
    championsLeague: 1,
    europaLeague: 2,
    conferenceleague: 2
  },
  danishSuperliga: {
    leagueId: 'danishSuperliga',
    name: 'Superligaen',
    country: 'Dinamarca',
    championsLeague: 1,
    europaLeague: 2,
    conferenceleague: 2
  },
  croatianLeague: {
    leagueId: 'croatianLeague',
    name: 'HNL',
    country: 'Croacia',
    championsLeague: 1,
    europaLeague: 1,
    conferenceleague: 2
  },
  czechLeague: {
    leagueId: 'czechLeague',
    name: 'Chance Liga',
    country: 'Chequia',
    championsLeague: 1,
    europaLeague: 2,
    conferenceleague: 3
  }
};

// ============================================================
// EUROPEAN CALENDAR — When European matches happen
// ============================================================

export const EUROPEAN_MATCHDAY_WEEKS = {
  league: [6, 9, 12, 15, 18, 21, 24, 27],   // 8 Swiss matchdays
  playoff: [31, 33],                           // 2-leg playoffs
  r16: [35, 37],                               // Round of 16
  qf: [39, 41],                                // Quarter-finals
  sf: [43, 45],                                // Semi-finals
  final: [47]                                  // Single-leg final
};

// Flat list of all European weeks for quick lookup
export const ALL_EUROPEAN_WEEKS = [
  ...EUROPEAN_MATCHDAY_WEEKS.league,
  ...EUROPEAN_MATCHDAY_WEEKS.playoff,
  ...EUROPEAN_MATCHDAY_WEEKS.r16,
  ...EUROPEAN_MATCHDAY_WEEKS.qf,
  ...EUROPEAN_MATCHDAY_WEEKS.sf,
  ...EUROPEAN_MATCHDAY_WEEKS.final
];

/**
 * Get which phase a given week belongs to (if any)
 * @param {number} week
 * @returns {{ phase: string, matchday: number } | null}
 */
export function getEuropeanPhaseForWeek(week) {
  for (const [phase, weeks] of Object.entries(EUROPEAN_MATCHDAY_WEEKS)) {
    const idx = weeks.indexOf(week);
    if (idx !== -1) {
      return { phase, matchday: idx + 1 };
    }
  }
  return null;
}

/**
 * Check if a given week has European matches
 */
export function isEuropeanWeek(week) {
  return ALL_EUROPEAN_WEEKS.includes(week);
}

// ============================================================
// QUALIFICATION FUNCTION
// ============================================================

/**
 * Takes final standings from all leagues and returns qualified teams
 * for each European competition.
 * 
 * @param {Object} leagueStandings - { leagueId: [{ teamId, teamName, ... }] }
 *   Each entry is the sorted league table (position 1 = index 0).
 * @param {Object} allTeamsMap - Map/object of teamId → full team data
 *   (with reputation, overall, league, etc.)
 * @returns {{ championsLeague: Array, europaLeague: Array, conferenceleague: Array }}
 */
export function qualifyTeamsForEurope(leagueStandings, allTeamsMap = {}) {
  const qualified = {
    championsLeague: [],
    europaLeague: [],
    conferenceleague: []
  };

  for (const [leagueId, slots] of Object.entries(LEAGUE_SLOTS)) {
    const standings = leagueStandings[leagueId];
    if (!standings || standings.length === 0) continue;

    // Champions League slots
    for (let i = 0; i < slots.championsLeague && i < standings.length; i++) {
      const entry = standings[i];
      const teamData = allTeamsMap[entry.teamId] || {};
      qualified.championsLeague.push({
        teamId: entry.teamId,
        teamName: entry.teamName || teamData.name || entry.teamId,
        shortName: entry.shortName || teamData.shortName || '',
        league: leagueId,
        leaguePosition: i + 1,
        reputation: teamData.reputation || entry.reputation || 70,
        overall: teamData.overall || entry.overall || 70,
        players: teamData.players || [],
        ...teamData // spread full team data
      });
    }

    // Europa League slots
    const elStart = slots.championsLeague;
    for (let i = elStart; i < elStart + slots.europaLeague && i < standings.length; i++) {
      const entry = standings[i];
      const teamData = allTeamsMap[entry.teamId] || {};
      qualified.europaLeague.push({
        teamId: entry.teamId,
        teamName: entry.teamName || teamData.name || entry.teamId,
        shortName: entry.shortName || teamData.shortName || '',
        league: leagueId,
        leaguePosition: i + 1,
        reputation: teamData.reputation || entry.reputation || 70,
        overall: teamData.overall || entry.overall || 70,
        players: teamData.players || [],
        ...teamData
      });
    }

    // Conference League slots
    const eclStart = elStart + slots.europaLeague;
    for (let i = eclStart; i < eclStart + slots.conferenceleague && i < standings.length; i++) {
      const entry = standings[i];
      const teamData = allTeamsMap[entry.teamId] || {};
      qualified.conferenceleague.push({
        teamId: entry.teamId,
        teamName: entry.teamName || teamData.name || entry.teamId,
        shortName: entry.shortName || teamData.shortName || '',
        league: leagueId,
        leaguePosition: i + 1,
        reputation: teamData.reputation || entry.reputation || 70,
        overall: teamData.overall || entry.overall || 70,
        players: teamData.players || [],
        ...teamData
      });
    }
  }

  return qualified;
}

/**
 * Calculate total prize money earned by a team in a competition
 * @param {Object} competition - CHAMPIONS_LEAGUE / EUROPA_LEAGUE / CONFERENCE_LEAGUE
 * @param {Object} teamResults - { wins, draws, phasesReached: ['league','playoff','r16','qf','sf','final'], isWinner }
 * @returns {number} total prize money in euros
 */
export function calculatePrizeMoney(competition, teamResults) {
  const prizes = competition.prizes;
  let total = prizes.participation;

  // League phase win/draw bonuses
  total += (teamResults.wins || 0) * prizes.winBonus;
  total += (teamResults.draws || 0) * prizes.drawBonus;

  // Knockout phase bonuses
  const phaseMap = {
    r16: prizes.r16,
    qf: prizes.qf,
    sf: prizes.sf,
    final: prizes.final
  };

  const phasesReached = teamResults.phasesReached || [];
  for (const phase of phasesReached) {
    if (phaseMap[phase]) {
      total += phaseMap[phase];
    }
  }

  // Winner bonus
  if (teamResults.isWinner) {
    total += prizes.winnerExtra;
  }

  return total;
}

/**
 * Get competition config by id
 */
export function getCompetitionById(competitionId) {
  return COMPETITIONS[competitionId] || null;
}

/**
 * Check if a team is qualified for any European competition
 * @param {string} teamId
 * @param {Object} qualifiedTeams - output of qualifyTeamsForEurope
 * @returns {{ competition: string, competitionData: Object } | null}
 */
export function getTeamEuropeanCompetition(teamId, qualifiedTeams) {
  for (const [compId, teams] of Object.entries(qualifiedTeams)) {
    if (teams.some(t => t.teamId === teamId)) {
      return { competition: compId, competitionData: COMPETITIONS[compId] };
    }
  }
  return null;
}
