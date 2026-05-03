// ============================================================
// SOUTH AMERICAN COMPETITIONS — Config & Qualification System
// ============================================================
// Defines Copa Libertadores and Copa Sudamericana
// with realistic prize money and league slot allocations.
// ============================================================

// ============================================================
// COMPETITION CONFIGS
// ============================================================

export const COPA_LIBERTADORES = {
  id: 'copaLibertadores',
  name: 'South American Champions Cup',
  shortName: 'Libertadores',
  icon: '🏆',
  color: '#1a237e',
  teamsCount: 32,
  potsCount: 4,
  matchesPerTeam: 8,
  prizes: {
    participation: 3_000_000,
    winBonus: 1_000_000,
    drawBonus: 330_000,
    r16: 1_500_000,
    qf: 2_000_000,
    sf: 2_500_000,
    final: 6_000_000,
    winnerExtra: 6_000_000
  }
};

export const COPA_SUDAMERICANA = {
  id: 'copaSudamericana',
  name: 'Copa Sudamericana',
  shortName: 'Sudamericana',
  icon: '🥈',
  color: '#e65100',
  teamsCount: 32,
  potsCount: 4,
  matchesPerTeam: 8,
  prizes: {
    participation: 900_000,
    winBonus: 300_000,
    drawBonus: 100_000,
    r16: 500_000,
    qf: 700_000,
    sf: 1_000_000,
    final: 2_000_000,
    winnerExtra: 4_000_000
  }
};

export const SA_COMPETITIONS = {
  copaLibertadores: COPA_LIBERTADORES,
  copaSudamericana: COPA_SUDAMERICANA
};

// ============================================================
// LEAGUE SLOTS — How many teams each SA league sends
// ============================================================

export const SA_LEAGUE_SLOTS = {
  argentinaPrimera: {
    leagueId: 'argentinaPrimera',
    name: 'Liga Profesional',
    country: 'Argentina',
    copaLibertadores: 6,
    copaSudamericana: 6
  },
  brasileiraoA: {
    leagueId: 'brasileiraoA',
    name: 'Série A',
    country: 'Brasil',
    copaLibertadores: 6,
    copaSudamericana: 6
  },
  colombiaPrimera: {
    leagueId: 'colombiaPrimera',
    name: 'Liga BetPlay',
    country: 'Colombia',
    copaLibertadores: 4,
    copaSudamericana: 4
  },
  chilePrimera: {
    leagueId: 'chilePrimera',
    name: 'Primera División',
    country: 'Chile',
    copaLibertadores: 3,
    copaSudamericana: 3
  },
  uruguayPrimera: {
    leagueId: 'uruguayPrimera',
    name: 'Primera División',
    country: 'Uruguay',
    copaLibertadores: 3,
    copaSudamericana: 3
  },
  ecuadorLigaPro: {
    leagueId: 'ecuadorLigaPro',
    name: 'LigaPro',
    country: 'Ecuador',
    copaLibertadores: 3,
    copaSudamericana: 3
  },
  paraguayPrimera: {
    leagueId: 'paraguayPrimera',
    name: 'División de Honor',
    country: 'Paraguay',
    copaLibertadores: 3,
    copaSudamericana: 3
  },
  peruLiga1: {
    leagueId: 'peruLiga1',
    name: 'Liga 1',
    country: 'Perú',
    copaLibertadores: 2,
    copaSudamericana: 2
  },
  boliviaPrimera: {
    leagueId: 'boliviaPrimera',
    name: 'División Profesional',
    country: 'Bolivia',
    copaLibertadores: 1,
    copaSudamericana: 2
  },
  venezuelaPrimera: {
    leagueId: 'venezuelaPrimera',
    name: 'Liga FUTVE',
    country: 'Venezuela',
    copaLibertadores: 1,
    copaSudamericana: 2
  }
};

// ============================================================
// SOUTH AMERICAN CALENDAR — Intercalated weeks (same pattern as European)
// ============================================================

export const SA_MATCHDAY_WEEKS = {
  league: [6, 9, 12, 15, 18, 21, 24, 27],
  playoff: [31, 33],
  r16: [35, 37],
  qf: [39, 41],
  sf: [43, 45],
  final: [47]
};

export const ALL_SA_WEEKS = [
  ...SA_MATCHDAY_WEEKS.league,
  ...SA_MATCHDAY_WEEKS.playoff,
  ...SA_MATCHDAY_WEEKS.r16,
  ...SA_MATCHDAY_WEEKS.qf,
  ...SA_MATCHDAY_WEEKS.sf,
  ...SA_MATCHDAY_WEEKS.final
];

// ============================================================
// HELPER: Check if a league is South American
// ============================================================

export const SA_LEAGUE_IDS = new Set(Object.keys(SA_LEAGUE_SLOTS));

export function isSouthAmericanLeague(leagueId) {
  return SA_LEAGUE_IDS.has(leagueId);
}

// ============================================================
// QUALIFICATION FUNCTION
// ============================================================

/**
 * Takes final standings from all SA leagues and returns qualified teams
 * for Copa Libertadores and Copa Sudamericana.
 * 
 * @param {Object} leagueStandings - { leagueId: [{ teamId, teamName, ... }] }
 * @param {Object} allTeamsMap - Map/object of teamId → full team data
 * @returns {{ copaLibertadores: Array, copaSudamericana: Array }}
 */
export function qualifyTeamsForSouthAmerica(leagueStandings, allTeamsMap = {}) {
  const qualified = {
    copaLibertadores: [],
    copaSudamericana: []
  };

  for (const [leagueId, slots] of Object.entries(SA_LEAGUE_SLOTS)) {
    const standings = leagueStandings[leagueId];
    if (!standings || standings.length === 0) continue;

    // Copa Libertadores slots
    for (let i = 0; i < slots.copaLibertadores && i < standings.length; i++) {
      const entry = standings[i];
      const teamData = allTeamsMap[entry.teamId] || {};
      qualified.copaLibertadores.push({
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

    // Copa Sudamericana slots (starts after Libertadores slots)
    const sudStart = slots.copaLibertadores;
    for (let i = sudStart; i < sudStart + slots.copaSudamericana && i < standings.length; i++) {
      const entry = standings[i];
      const teamData = allTeamsMap[entry.teamId] || {};
      qualified.copaSudamericana.push({
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

  // The declared country slots can overshoot the playable competition size.
  // Keep deterministic priority order (league slot order + table position) but never
  // initialize more teams than the format supports.
  qualified.copaLibertadores = qualified.copaLibertadores.slice(0, COPA_LIBERTADORES.teamsCount);
  qualified.copaSudamericana = qualified.copaSudamericana.slice(0, COPA_SUDAMERICANA.teamsCount);

  return qualified;
}

/**
 * Calculate total prize money earned by a team in an SA competition
 * @param {Object} competition - COPA_LIBERTADORES / COPA_SUDAMERICANA
 * @param {Object} teamResults - { wins, draws, phasesReached: [...], isWinner }
 * @returns {number} total prize money in USD
 */
export function calculateSAPrizeMoney(competition, teamResults) {
  const prizes = competition.prizes;
  let total = prizes.participation;

  total += (teamResults.wins || 0) * prizes.winBonus;
  total += (teamResults.draws || 0) * prizes.drawBonus;

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

  if (teamResults.isWinner) {
    total += prizes.winnerExtra;
  }

  return total;
}

/**
 * Get SA competition config by id
 */
export function getSACompetitionById(competitionId) {
  return SA_COMPETITIONS[competitionId] || null;
}

/**
 * Check if a team is qualified for any SA competition
 * @param {string} teamId
 * @param {Object} qualifiedTeams - output of qualifyTeamsForSouthAmerica
 * @returns {{ competition: string, competitionData: Object } | null}
 */
export function getTeamSACompetition(teamId, qualifiedTeams) {
  for (const [compId, teams] of Object.entries(qualifiedTeams)) {
    if (teams.some(t => t.teamId === teamId)) {
      return { competition: compId, competitionData: SA_COMPETITIONS[compId] };
    }
  }
  return null;
}
