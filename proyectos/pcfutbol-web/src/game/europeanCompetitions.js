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

export const DEFAULT_EUROPEAN_COMPETITION_IDS = ['championsLeague', 'europaLeague', 'conferenceleague'];

export function seasonIdFromStartYear(startYear) {
  const year = Number(startYear);
  if (!Number.isFinite(year)) return null;
  return `${year}-${String((year + 1) % 100).padStart(2, '0')}`;
}

export function parseEuropeanSeasonStartYear(seasonIdOrYear) {
  if (seasonIdOrYear == null || seasonIdOrYear === 'current') return null;
  if (typeof seasonIdOrYear === 'number') return Number.isFinite(seasonIdOrYear) ? seasonIdOrYear : null;
  const text = String(seasonIdOrYear).trim();
  const match = text.match(/^(\d{4})(?:[-/]\d{2,4})?$/);
  if (!match) return null;
  return Number(match[1]);
}

export function getEuropeanCompetitionIdsForSeason(seasonId, { historical = false } = {}) {
  if (!historical) return [...DEFAULT_EUROPEAN_COMPETITION_IDS];
  const startYear = parseEuropeanSeasonStartYear(seasonId);
  if (startYear == null || startYear >= 2021) return [...DEFAULT_EUROPEAN_COMPETITION_IDS];
  return ['championsLeague', 'europaLeague'];
}

export function getPersistedEuropeanCompetitionIds(europeanCompetitions) {
  if (!europeanCompetitions) return null;
  const persisted = Array.isArray(europeanCompetitions.activeCompetitionIds) && europeanCompetitions.activeCompetitionIds.length
    ? europeanCompetitions.activeCompetitionIds
    : (europeanCompetitions.competitions && typeof europeanCompetitions.competitions === 'object'
      ? Object.keys(europeanCompetitions.competitions)
      : null);
  if (!Array.isArray(persisted) || persisted.length === 0) return null;
  const persistedSet = new Set(persisted);
  return DEFAULT_EUROPEAN_COMPETITION_IDS.filter((compId) => persistedSet.has(compId));
}

/**
 * Whether a given European competition existed in a given season.
 * For non-historical / current play every competition is active.
 * For historical saves the Conference League (in-game "Continental Trophy")
 * only exists from 2021-22 onward.
 */
export function isCompetitionActiveForSeason(compId, seasonId, { historical = false } = {}) {
  return getEuropeanCompetitionIdsForSeason(seasonId, { historical }).includes(compId);
}

/**
 * Derive the European historical-era context for the *currently playing*
 * season from the persisted game state. This is the single source of truth
 * used by the league table, season outcome and Europe screens so that the
 * set of active competitions cannot drift between them.
 *
 * Only historical-database saves apply era rules; current/non-historical
 * play always exposes all three competitions.
 *
 * `databaseSeasonId` is pinned to the career's start dataset (e.g. '2008-09')
 * and never advances, so the live season is derived from
 * `careerStartSeason + (currentSeason - 1)` and only falls back to
 * `databaseSeasonId` when the start year is unavailable.
 *
 * @param {Object} state - game state
 * @returns {{ historical: boolean, seasonId: string|null, startYear: number|null, activeCompetitionIds: string[] }}
 */
export function getEuropeanEraContextFromState(state) {
  const historical = Boolean(state?.historicalDatabase);
  const persistedActiveCompetitionIds = getPersistedEuropeanCompetitionIds(state?.europeanCompetitions);
  if (!historical) {
    return {
      historical: false,
      seasonId: null,
      startYear: null,
      activeCompetitionIds: persistedActiveCompetitionIds || [...DEFAULT_EUROPEAN_COMPETITION_IDS]
    };
  }

  let startYear = null;
  const rawStart = Number(state?.careerStartSeason);
  if (Number.isFinite(rawStart)) {
    const offset = Math.max(0, (Number(state?.currentSeason) || 1) - 1);
    startYear = rawStart + offset;
  } else {
    startYear = parseEuropeanSeasonStartYear(state?.databaseSeasonId);
  }

  const seasonId = startYear != null
    ? seasonIdFromStartYear(startYear)
    : (state?.databaseSeasonId ?? null);
  const seasonActiveCompetitionIds = getEuropeanCompetitionIdsForSeason(seasonId, { historical: true });
  const activeCompetitionIds = persistedActiveCompetitionIds
    ? seasonActiveCompetitionIds.filter((compId) => persistedActiveCompetitionIds.includes(compId))
    : seasonActiveCompetitionIds;
  return { historical: true, seasonId, startYear, activeCompetitionIds };
}

export function getCompetitionConfigForSeason(compId, seasonId, { historical = false } = {}) {
  const base = COMPETITIONS[compId];
  if (!base) return null;
  if (!historical) return base;

  const startYear = parseEuropeanSeasonStartYear(seasonId);
  if (compId === 'championsLeague') {
    return { ...base, name: 'Champions League', shortName: 'Champions' };
  }
  if (compId === 'europaLeague') {
    if (startYear != null && startYear <= 2008) {
      return { ...base, name: 'UEFA Cup', shortName: 'UEFA' };
    }
    return { ...base, name: 'Europa League', shortName: 'Europa League' };
  }
  if (compId === 'conferenceleague' && startYear != null && startYear >= 2021) {
    return { ...base, name: 'Conference League', shortName: 'Conference' };
  }
  return base;
}

// ============================================================
// LEAGUE SLOTS — How many teams each European top-flight league
// sends per continental competition.
// ============================================================
// This is the single source of truth for European qualification.
// EUROPEAN_SPOTS (seasonManager) and LEAGUE_ZONES (LeagueTable) must
// derive their positions from here to avoid drift.
//
// Every league listed here MUST exist in LEAGUE_CONFIG with a real
// getTeams() that returns enough teams to fill its slots, otherwise
// the system will fail fast during qualification.
//
// Totals (enforced by validateLeagueSlots()): 32 CL, 32 EL, 32 ECL.
// ============================================================
export const LEAGUE_SLOTS = {
  // ── Elite tier (Big Five) ──
  laliga:             { leagueId: 'laliga',             name: 'Liga Ibérica',        country: 'España',       championsLeague: 4, europaLeague: 2, conferenceleague: 1 },
  premierLeague:      { leagueId: 'premierLeague',      name: 'First League',        country: 'Inglaterra',   championsLeague: 4, europaLeague: 2, conferenceleague: 1 },
  serieA:             { leagueId: 'serieA',             name: 'Calcio League',       country: 'Italia',       championsLeague: 4, europaLeague: 2, conferenceleague: 1 },
  bundesliga:         { leagueId: 'bundesliga',         name: 'Erste Liga',          country: 'Alemania',     championsLeague: 4, europaLeague: 2, conferenceleague: 1 },
  ligue1:             { leagueId: 'ligue1',             name: 'Division Première',   country: 'Francia',      championsLeague: 3, europaLeague: 2, conferenceleague: 1 },
  // ── Strong tier ──
  eredivisie:         { leagueId: 'eredivisie',         name: 'Dutch First',         country: 'Países Bajos', championsLeague: 2, europaLeague: 1, conferenceleague: 1 },
  primeiraLiga:       { leagueId: 'primeiraLiga',       name: 'Liga Lusitana',       country: 'Portugal',     championsLeague: 2, europaLeague: 1, conferenceleague: 1 },
  // ── Mid tier (one CL slot each) ──
  belgianPro:         { leagueId: 'belgianPro',         name: 'Belgian First',       country: 'Bélgica',      championsLeague: 1, europaLeague: 1, conferenceleague: 1 },
  superLig:           { leagueId: 'superLig',           name: 'Anatolian League',    country: 'Turquía',      championsLeague: 1, europaLeague: 1, conferenceleague: 1 },
  austrianBundesliga: { leagueId: 'austrianBundesliga', name: 'Erste Liga (AT)',     country: 'Austria',      championsLeague: 1, europaLeague: 1, conferenceleague: 1 },
  greekSuperLeague:   { leagueId: 'greekSuperLeague',   name: 'Super League',        country: 'Grecia',       championsLeague: 1, europaLeague: 1, conferenceleague: 1 },
  scottishPrem:       { leagueId: 'scottishPrem',       name: 'Highland League',     country: 'Escocia',      championsLeague: 1, europaLeague: 1, conferenceleague: 1 },
  ukrainePremier:     { leagueId: 'ukrainePremier',     name: 'Dnipro League',       country: 'Ucrania',      championsLeague: 1, europaLeague: 1, conferenceleague: 1 },
  czechLeague:        { leagueId: 'czechLeague',        name: 'Chance Liga',         country: 'Chequia',      championsLeague: 1, europaLeague: 1, conferenceleague: 1 },
  ekstraklasa:        { leagueId: 'ekstraklasa',        name: 'Vistula League',      country: 'Polonia',      championsLeague: 1, europaLeague: 1, conferenceleague: 1 },
  eliteserien:        { leagueId: 'eliteserien',        name: 'Fjord League',        country: 'Noruega',      championsLeague: 1, europaLeague: 1, conferenceleague: 1 },
  // ── Lower tier (champion goes to EL, no CL slot) ──
  danishSuperliga:    { leagueId: 'danishSuperliga',    name: 'Superligaen',         country: 'Dinamarca',    championsLeague: 0, europaLeague: 2, conferenceleague: 2 },
  swissSuperLeague:   { leagueId: 'swissSuperLeague',   name: 'Alpine League',       country: 'Suiza',        championsLeague: 0, europaLeague: 2, conferenceleague: 2 },
  croatianLeague:     { leagueId: 'croatianLeague',     name: 'HNL',                 country: 'Croacia',      championsLeague: 0, europaLeague: 2, conferenceleague: 2 },
  romaniaSuperliga:   { leagueId: 'romaniaSuperliga',   name: 'Carpathian League',   country: 'Rumania',      championsLeague: 0, europaLeague: 2, conferenceleague: 2 },
  allsvenskan:        { leagueId: 'allsvenskan',        name: 'Scandi League',       country: 'Suecia',       championsLeague: 0, europaLeague: 1, conferenceleague: 3 },
  hungaryNBI:         { leagueId: 'hungaryNBI',         name: 'Danube League',       country: 'Hungría',      championsLeague: 0, europaLeague: 1, conferenceleague: 3 },
  russiaPremier:      { leagueId: 'russiaPremier',      name: 'Volga League',        country: 'Rusia',        championsLeague: 0, europaLeague: 1, conferenceleague: 2 }
};

/**
 * Set of European league IDs recognised for continental qualification.
 * Use to tell European from South-American / Asian leagues.
 */
export const EUROPEAN_LEAGUE_IDS = new Set(Object.keys(LEAGUE_SLOTS));

/**
 * Return the ordered list of final-table positions that qualify for each
 * European competition in a given league. Derived directly from LEAGUE_SLOTS
 * so UI badges, season outcome and actual qualification cannot diverge.
 *
 * When `options` carries a historical season context in which the
 * Conference League did not yet exist (pre 2021-22), the `conference`
 * range is empty so no league row is coloured/legended for a competition
 * that should not exist. Called with no options it keeps the full
 * three-competition behaviour (current play and module-load defaults).
 *
 * @param {string} leagueId
 * @param {{ seasonId?: string|number|null, historical?: boolean, activeCompetitionIds?: string[] }} [options]
 * @returns {{ champions: number[], europaLeague: number[], conference: number[] } | null}
 */
export function getEuropeanPositionsForLeague(leagueId, options = {}) {
  const slots = LEAGUE_SLOTS[leagueId];
  if (!slots) return null;
  const cl = slots.championsLeague || 0;
  const el = slots.europaLeague || 0;
  const ecl = isConferenceActiveForOptions(options) ? (slots.conferenceleague || 0) : 0;
  const range = (start, count) => Array.from({ length: count }, (_, i) => start + i);
  return {
    champions: range(1, cl),
    europaLeague: range(cl + 1, el),
    conference: range(cl + el + 1, ecl)
  };
}

/**
 * Resolve whether the Conference League is active for a positions/slots
 * lookup. Accepts either an explicit `activeCompetitionIds` list or a
 * `{ seasonId, historical }` pair. With no signal at all it defaults to
 * active so current play and module-load callers are unaffected.
 */
function isConferenceActiveForOptions({ seasonId = null, historical = false, activeCompetitionIds = null } = {}) {
  if (Array.isArray(activeCompetitionIds)) return activeCompetitionIds.includes('conferenceleague');
  if (!historical) return true;
  return isCompetitionActiveForSeason('conferenceleague', seasonId, { historical: true });
}

/**
 * Validate that LEAGUE_SLOTS produce exactly 32 teams per competition.
 * Throws on drift. Called by consumers at module load to fail loud, early.
 */
export function validateLeagueSlots(slots = LEAGUE_SLOTS) {
  const totals = { championsLeague: 0, europaLeague: 0, conferenceleague: 0 };
  for (const s of Object.values(slots)) {
    totals.championsLeague += s.championsLeague || 0;
    totals.europaLeague += s.europaLeague || 0;
    totals.conferenceleague += s.conferenceleague || 0;
  }
  for (const [comp, expected] of Object.entries({ championsLeague: 32, europaLeague: 32, conferenceleague: 32 })) {
    if (totals[comp] !== expected) {
      throw new Error(`LEAGUE_SLOTS total for ${comp} is ${totals[comp]}, expected ${expected}`);
    }
  }
  return totals;
}

// Fail loudly at module load if the table ever drifts.
validateLeagueSlots();

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
 * Ensure every LEAGUE_SLOTS league has a standings array long enough to
 * fill its slot allocation. Missing or too-short entries are bootstrapped
 * from `getTeamsForLeague(leagueId)` sorted by reputation (desc). The
 * real teams are used — no synthetic fillers — but their ordering is a
 * reputation-based proxy when no live table exists yet (e.g. first
 * qualification of the game, or a save that predates a new league).
 *
 * Does NOT mutate the input. Returns a new map.
 *
 * @param {Object} leagueStandings - { leagueId: Array<StandingsRow> }
 * @param {(leagueId: string) => Array<Team>|undefined} getTeamsForLeague
 * @returns {Object} patched standings
 */
export function ensureEuropeanLeagueStandings(leagueStandings, getTeamsForLeague) {
  const out = { ...leagueStandings };
  for (const [leagueId, slots] of Object.entries(LEAGUE_SLOTS)) {
    const needed = (slots.championsLeague || 0) + (slots.europaLeague || 0) + (slots.conferenceleague || 0);
    const existing = Array.isArray(out[leagueId]) ? out[leagueId] : null;
    if (existing && existing.length >= needed) continue;

    const rawTeams = (typeof getTeamsForLeague === 'function' ? getTeamsForLeague(leagueId) : null) || [];
    if (rawTeams.length < needed) {
      // Leave as-is; qualifyTeamsForEurope will throw with a precise message.
      continue;
    }
    const sorted = [...rawTeams].sort((a, b) => (b.reputation || 70) - (a.reputation || 70));
    out[leagueId] = sorted.map((t, idx) => ({
      teamId: t.id || t.teamId,
      teamName: t.name || t.teamName,
      shortName: t.shortName || '',
      reputation: t.reputation || 70,
      overall: t.overall || 70,
      leaguePosition: idx + 1
    }));
  }
  return out;
}

/**
 * Build a qualified-team record from a standings entry.
 */
function buildQualifiedTeam(entry, leagueId, position, allTeamsMap) {
  const teamData = allTeamsMap[entry.teamId] || {};
  return {
    teamId: entry.teamId,
    teamName: entry.teamName || teamData.name || entry.teamId,
    shortName: entry.shortName || teamData.shortName || '',
    league: leagueId,
    leaguePosition: position,
    reputation: teamData.reputation || entry.reputation || 70,
    overall: teamData.overall || entry.overall || 70,
    players: teamData.players || [],
    ...teamData
  };
}

/**
 * Takes final standings from all European top-flight leagues and returns
 * qualified teams for each continental competition. Fails fast (throws)
 * if any LEAGUE_SLOTS league is missing from the standings or does not
 * have enough teams to cover its slot allocation, or if the aggregate
 * team count does not reach the 32-per-competition target.
 *
 * @param {Object} leagueStandings - { leagueId: [{ teamId, teamName, ... }] }
 *   Each entry is the sorted league table (position 1 = index 0).
 * @param {Object} allTeamsMap - Map/object of teamId → full team data.
 * @returns {{ championsLeague: Array, europaLeague: Array, conferenceleague: Array }}
 */
export function qualifyTeamsForEurope(leagueStandings, allTeamsMap = {}) {
  const qualified = {
    championsLeague: [],
    europaLeague: [],
    conferenceleague: []
  };

  const missing = [];
  for (const [leagueId, slots] of Object.entries(LEAGUE_SLOTS)) {
    const standings = leagueStandings[leagueId];
    const needed = (slots.championsLeague || 0) + (slots.europaLeague || 0) + (slots.conferenceleague || 0);
    if (!Array.isArray(standings) || standings.length < needed) {
      missing.push(`${leagueId} (needed ${needed}, got ${standings?.length ?? 0})`);
      continue;
    }

    let cursor = 0;
    for (let i = 0; i < slots.championsLeague; i++, cursor++) {
      qualified.championsLeague.push(buildQualifiedTeam(standings[cursor], leagueId, cursor + 1, allTeamsMap));
    }
    for (let i = 0; i < slots.europaLeague; i++, cursor++) {
      qualified.europaLeague.push(buildQualifiedTeam(standings[cursor], leagueId, cursor + 1, allTeamsMap));
    }
    for (let i = 0; i < slots.conferenceleague; i++, cursor++) {
      qualified.conferenceleague.push(buildQualifiedTeam(standings[cursor], leagueId, cursor + 1, allTeamsMap));
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `qualifyTeamsForEurope: standings missing or too short for ${missing.length} European league(s): ${missing.join(', ')}`
    );
  }
  for (const [compId, teams] of Object.entries(qualified)) {
    if (teams.length !== 32) {
      throw new Error(`qualifyTeamsForEurope: ${compId} produced ${teams.length} teams, expected 32`);
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

// ============================================================
// PRIZE → SPENDABLE CASH ALLOCATION (game balance)
// ============================================================
// The nominal prize figures above are realistic-ish gross continental
// revenue. They are still tracked in full per team (prizesMoney) so prize
// tables, season summaries and messages can quote the headline number.
//
// But crediting the FULL gross prize straight into the playable transfer
// balance breaks career progression for small clubs: a single Champions
// participation fee (15M) dwarfs a typical Segunda/promoted-side budget
// (3M–15M), so one European run would instantly make an underdog richer
// than half of LaLiga and trivialise the climb.
//
// In reality the board only frees a SHARE of continental revenue into the
// spendable transfer kitty — the rest is swallowed by the operating cost of
// the campaign (wage/appearance bonuses, travel, infrastructure, debt) and
// by directors keeping a buffer. Elite clubs run their European campaigns at
// near break-even against those costs and reputationally need to reinvest in
// the squad, so almost all of the prize reaches the transfer balance. Smaller
// clubs bank a larger fraction against operating costs, so less reaches it.
//
// We model that as a deterministic, monotonic, bounded multiplier on the cash
// CREDITED to `money`, keyed off club reputation (a stable proxy for club
// size; budget swings as you spend, reputation does not).

// Reputation anchors for the cashflow share. At/below LOW_REP a club only
// frees MIN_SHARE of continental cash; at/above HIGH_REP it frees the full
// MAX_SHARE. Linear in between — no cliffs.
const PRIZE_CASHFLOW_LOW_REP = 60;   // small/promoted side
const PRIZE_CASHFLOW_HIGH_REP = 85;  // established elite
const PRIZE_CASHFLOW_MIN_SHARE = 0.4; // underdog floor — Europe still rewards
const PRIZE_CASHFLOW_MAX_SHARE = 1.0; // elite ceiling — never above full payout

/**
 * Board/operational allocation: what fraction of a continental prize a club of
 * the given profile actually releases into spendable transfer cash.
 *
 * Deterministic, monotonic in reputation, bounded in
 * [PRIZE_CASHFLOW_MIN_SHARE, PRIZE_CASHFLOW_MAX_SHARE]. Big clubs are never
 * punished below full payout; small clubs are softened, not starved.
 *
 * @param {{ reputation?: number }} team - the player's club (state.team)
 * @returns {number} multiplier in [MIN_SHARE, MAX_SHARE]
 */
export function getEuropeanPrizeCashflowMultiplier(team = {}) {
  const rep = Number.isFinite(team?.reputation) ? team.reputation : 70;
  if (rep <= PRIZE_CASHFLOW_LOW_REP) return PRIZE_CASHFLOW_MIN_SHARE;
  if (rep >= PRIZE_CASHFLOW_HIGH_REP) return PRIZE_CASHFLOW_MAX_SHARE;
  const t = (rep - PRIZE_CASHFLOW_LOW_REP) / (PRIZE_CASHFLOW_HIGH_REP - PRIZE_CASHFLOW_LOW_REP);
  return PRIZE_CASHFLOW_MIN_SHARE + t * (PRIZE_CASHFLOW_MAX_SHARE - PRIZE_CASHFLOW_MIN_SHARE);
}

/**
 * Convert a gross continental prize delta into the spendable cash a club of the
 * given profile actually banks. Rounded to whole euros so balances stay clean.
 *
 * @param {number} grossPrize - nominal prize delta (from prizesMoney tracking)
 * @param {{ reputation?: number }} team - the player's club
 * @returns {number} spendable cash to add to `money`
 */
export function applyEuropeanPrizeCashflow(grossPrize, team) {
  if (!grossPrize || grossPrize <= 0) return 0;
  return Math.round(grossPrize * getEuropeanPrizeCashflowMultiplier(team));
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
