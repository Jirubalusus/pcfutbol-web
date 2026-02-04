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
  name: 'Continental Champions Cup',
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
  name: 'Continental Shield',
  shortName: 'Continental Shield',
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
  name: 'Continental Trophy',
  shortName: 'Continental Trophy',
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
    name: 'Liga Ibérica',
    country: 'España',
    championsLeague: 4,
    europaLeague: 2,
    conferenceleague: 1
  },
  premierLeague: {
    leagueId: 'premierLeague',
    name: 'First League',
    country: 'Inglaterra',
    championsLeague: 4,
    europaLeague: 2,
    conferenceleague: 1
  },
  serieA: {
    leagueId: 'serieA',
    name: 'Calcio League',
    country: 'Italia',
    championsLeague: 4,
    europaLeague: 2,
    conferenceleague: 1
  },
  bundesliga: {
    leagueId: 'bundesliga',
    name: 'Erste Liga',
    country: 'Alemania',
    championsLeague: 4,
    europaLeague: 2,
    conferenceleague: 1
  },
  ligue1: {
    leagueId: 'ligue1',
    name: 'Division Première',
    country: 'Francia',
    championsLeague: 3,
    europaLeague: 1,
    conferenceleague: 1
  },
  eredivisie: {
    leagueId: 'eredivisie',
    name: 'Dutch First',
    country: 'Países Bajos',
    championsLeague: 2,
    europaLeague: 2,
    conferenceleague: 3
  },
  primeiraLiga: {
    leagueId: 'primeiraLiga',
    name: 'Liga Lusitana',
    country: 'Portugal',
    championsLeague: 2,
    europaLeague: 2,
    conferenceleague: 3
  },
  belgianPro: {
    leagueId: 'belgianPro',
    name: 'Belgian First',
    country: 'Bélgica',
    championsLeague: 1,
    europaLeague: 3,
    conferenceleague: 3
  },
  superLig: {
    leagueId: 'superLig',
    name: 'Anatolian League',
    country: 'Turquía',
    championsLeague: 1,
    europaLeague: 3,
    conferenceleague: 3
  },
  scottishPrem: {
    leagueId: 'scottishPrem',
    name: 'Highland League',
    country: 'Escocia',
    championsLeague: 1,
    europaLeague: 2,
    conferenceleague: 2
  },
  austrianBundesliga: {
    leagueId: 'austrianBundesliga',
    name: 'Erste Liga (AT)',
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
    name: 'Alpine League',
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
// EUROPEAN CALENDAR — Intercalated weeks system (v2)
// ============================================================
// European weeks are inserted as EXTRA weeks between league matchdays.
// Each week = exactly 1 match (either league OR European).
// Season expands from N to N+17 weeks when European comps are active.
// ============================================================

// Legacy static weeks — used as fallback for old saves without europeanCalendar
export const EUROPEAN_MATCHDAY_WEEKS = {
  league: [6, 9, 12, 15, 18, 21, 24, 27],   // 8 Swiss matchdays
  playoff: [31, 33],                           // 2-leg playoffs
  r16: [35, 37],                               // Round of 16
  qf: [39, 41],                                // Quarter-finals
  sf: [43, 45],                                // Semi-finals
  final: [47]                                  // Single-leg final
};

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
 * Uses legacy static weeks — prefer getPhaseForWeek() with calendar for new saves
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
 * Check if a given week has European matches (legacy static)
 */
export function isEuropeanWeek(week) {
  return ALL_EUROPEAN_WEEKS.includes(week);
}

// ============================================================
// NEW: Dynamic European Calendar (v2 — intercalated weeks)
// ============================================================

/**
 * Build an expanded season calendar that intercalates European AND cup weeks
 * between league matchdays. Each week has exactly 1 match type.
 *
 * Example for 38-matchday league with European + 6 cup rounds:
 *   Weeks 1-4: Liga J1-J4
 *   Week 5: 🏆 Champions Jornada 1
 *   Weeks 6-9: Liga J5-J8
 *   Week 10: 👑 Copa Ronda 1
 *   ... (total: 38 league + 17 European + 6 cup = 61 weeks)
 *
 * @param {number} totalLeagueMDs - Total league matchdays (34, 38, 42, etc.)
 * @param {Object} options - { hasEuropean: bool, cupRounds: number }
 * @returns {{ leagueWeekMap: number[], europeanWeeks: object, allEuropeanWeeks: number[], cupWeeks: number[], totalWeeks: number }}
 */
export function buildSeasonCalendar(totalLeagueMDs, { hasEuropean = false, cupRounds = 0 } = {}) {
  // Posiciones de rondas de copa: distribuidas uniformemente en la temporada
  const cupAfterMD = [];
  for (let i = 0; i < cupRounds; i++) {
    cupAfterMD.push(Math.round((i + 1) * totalLeagueMDs / (cupRounds + 1)));
  }

  const entries = [];
  let leagueMD = 0;
  let week = 0;
  let cupRoundIdx = 0;

  // Helper: insertar semana de copa si toca después de esta jornada de liga
  const tryInsertCup = () => {
    if (cupRoundIdx < cupAfterMD.length && leagueMD >= cupAfterMD[cupRoundIdx]) {
      week++;
      entries.push({ week, type: 'cup', cupRound: cupRoundIdx });
      cupRoundIdx++;
    }
  };

  if (hasEuropean) {
    // Gap between European matchdays during Swiss phase
    const gap = Math.floor(totalLeagueMDs / 9); // ~4 for 38, ~3 for 34

    // ── Swiss phase: 8 matchdays with `gap` league games between each ──
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < gap; j++) {
        if (leagueMD >= totalLeagueMDs) break;
        week++;
        leagueMD++;
        entries.push({ week, type: 'league', leagueMD });
        tryInsertCup();
      }
      week++;
      entries.push({ week, type: 'european', phase: 'league', matchday: i + 1 });
    }

    // ── Knockout phase: alternating 1 league + 1 European ──
    const knockouts = [
      ['playoff', 1], ['playoff', 2],
      ['r16', 1], ['r16', 2],
      ['qf', 1], ['qf', 2],
      ['sf', 1], ['sf', 2],
      ['final', 1]
    ];

    for (const [phase, md] of knockouts) {
      if (leagueMD < totalLeagueMDs) {
        week++;
        leagueMD++;
        entries.push({ week, type: 'league', leagueMD });
        tryInsertCup();
      }
      week++;
      entries.push({ week, type: 'european', phase, matchday: md });
    }

    // ── Any remaining league matchdays ──
    while (leagueMD < totalLeagueMDs) {
      week++;
      leagueMD++;
      entries.push({ week, type: 'league', leagueMD });
      tryInsertCup();
    }
  } else {
    // Sin competiciones europeas: solo liga + copa
    while (leagueMD < totalLeagueMDs) {
      week++;
      leagueMD++;
      entries.push({ week, type: 'league', leagueMD });
      tryInsertCup();
    }
  }

  // Insertar rondas de copa restantes (si no se insertaron durante la liga)
  while (cupRoundIdx < cupAfterMD.length) {
    week++;
    entries.push({ week, type: 'cup', cupRound: cupRoundIdx });
    cupRoundIdx++;
  }

  // ── Build outputs ──
  const europeanWeeks = { league: [], playoff: [], r16: [], qf: [], sf: [], final: [] };
  const leagueWeekMap = new Array(totalLeagueMDs);
  const cupWeeks = [];

  for (const entry of entries) {
    if (entry.type === 'european') {
      europeanWeeks[entry.phase].push(entry.week);
    } else if (entry.type === 'league') {
      leagueWeekMap[entry.leagueMD - 1] = entry.week;
    } else if (entry.type === 'cup') {
      cupWeeks.push(entry.week);
    }
  }

  const allEuropeanWeeks = Object.values(europeanWeeks).flat().sort((a, b) => a - b);

  return {
    leagueWeekMap,
    europeanWeeks,
    allEuropeanWeeks,
    cupWeeks,
    totalWeeks: week
  };
}

/**
 * Backward-compatible wrapper: builds calendar with European weeks only (no cup).
 * @param {number} totalLeagueMDs
 * @returns {{ leagueWeekMap: number[], europeanWeeks: object, allEuropeanWeeks: number[], cupWeeks: number[], totalWeeks: number }}
 */
export function buildEuropeanCalendar(totalLeagueMDs) {
  return buildSeasonCalendar(totalLeagueMDs, { hasEuropean: true, cupRounds: 0 });
}

/**
 * Check if a week is a cup week using the season calendar.
 */
export function isCupWeek(week, calendar) {
  return calendar?.cupWeeks?.includes(week) || false;
}

/**
 * Get the cup round index for a given week (0-based).
 * Returns null if not a cup week.
 */
export function getCupRoundForWeek(week, calendar) {
  if (!calendar?.cupWeeks) return null;
  const idx = calendar.cupWeeks.indexOf(week);
  return idx >= 0 ? idx : null;
}

/**
 * Remap fixture weeks using the league-week map from buildEuropeanCalendar.
 * Fixtures generated with sequential weeks (1,2,3...) get remapped to skip European weeks.
 *
 * @param {Array} fixtures - Fixture objects with { week, ... }
 * @param {number[]} leagueWeekMap - from buildEuropeanCalendar().leagueWeekMap
 * @returns {Array} - Fixtures with updated week numbers
 */
export function remapFixturesForEuropean(fixtures, leagueWeekMap) {
  return fixtures.map(f => {
    const newWeek = leagueWeekMap[f.week - 1]; // f.week is 1-indexed
    return newWeek != null ? { ...f, week: newWeek } : f;
  });
}

/**
 * Get European phase for a week using dynamic calendar (v2).
 * @param {number} week
 * @param {object} calendar - output of buildEuropeanCalendar()
 * @returns {{ phase: string, matchday: number } | null}
 */
export function getPhaseForWeek(week, calendar) {
  if (!calendar || !calendar.europeanWeeks) return null;
  for (const [phase, weeks] of Object.entries(calendar.europeanWeeks)) {
    const idx = weeks.indexOf(week);
    if (idx !== -1) {
      return { phase, matchday: idx + 1 };
    }
  }
  return null;
}

/**
 * Check if a week is European using dynamic calendar (v2).
 * Falls back to legacy static check if no calendar provided.
 */
export function isEuropeanWeekDynamic(week, calendar) {
  if (calendar && calendar.allEuropeanWeeks) {
    return calendar.allEuropeanWeeks.includes(week);
  }
  return isEuropeanWeek(week);
}

/**
 * Get European phase for a week, supporting both v2 calendar and legacy.
 */
export function getPhaseForWeekCompat(week, calendar) {
  if (calendar) return getPhaseForWeek(week, calendar);
  return getEuropeanPhaseForWeek(week);
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
