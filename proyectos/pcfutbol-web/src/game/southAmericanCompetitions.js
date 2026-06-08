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

// NOTE: `copaLibertadores` / `copaSudamericana` are per-country TARGETS, not a
// hard pre-cap quota. qualifyTeamsForSouthAmerica() drains them in *waves*
// (every country's 1st berth, then every country's 2nd, …) up to the
// competition size, so the cap truncates the highest table positions of the
// biggest countries first and NEVER silently drops a whole small federation
// (Bolivia/Venezuela) just because it sits last in declaration order.
//
// Every CONMEBOL country sends more than its champion to the Libertadores so a
// runner-up still has a continental path (the historical 2008-09 reality, and
// the bug Pablo hit playing a Bolivian side).
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
    copaLibertadores: 4,
    copaSudamericana: 4
  },
  uruguayPrimera: {
    leagueId: 'uruguayPrimera',
    name: 'Primera División',
    country: 'Uruguay',
    copaLibertadores: 4,
    copaSudamericana: 4
  },
  ecuadorLigaPro: {
    leagueId: 'ecuadorLigaPro',
    name: 'LigaPro',
    country: 'Ecuador',
    copaLibertadores: 4,
    copaSudamericana: 4
  },
  paraguayPrimera: {
    leagueId: 'paraguayPrimera',
    name: 'División de Honor',
    country: 'Paraguay',
    copaLibertadores: 4,
    copaSudamericana: 4
  },
  peruLiga1: {
    leagueId: 'peruLiga1',
    name: 'Liga 1',
    country: 'Perú',
    copaLibertadores: 4,
    copaSudamericana: 4
  },
  boliviaPrimera: {
    leagueId: 'boliviaPrimera',
    name: 'División Profesional',
    country: 'Bolivia',
    copaLibertadores: 2,
    copaSudamericana: 3
  },
  venezuelaPrimera: {
    leagueId: 'venezuelaPrimera',
    name: 'Liga FUTVE',
    country: 'Venezuela',
    copaLibertadores: 2,
    copaSudamericana: 3
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
 * Reorder a league's final standings so the Apertura and Clausura champions sit
 * at the very front, ahead of the accumulated-table order.
 *
 * In the South American Apertura/Clausura leagues represented in-game
 * (Paraguay, Bolivia, Uruguay, …) the champion of EACH short tournament earns a
 * guaranteed Copa Libertadores berth; the remaining continental places are then
 * filled from the Accumulated (anual) table. Because the slot assignment below
 * just walks the standings top-down, moving the two champions to the front makes
 * them claim the first Libertadores berths and lets the accumulated order fill
 * the rest — exactly the real qualification rule.
 *
 * No-op (returns the original array) when no champion ids are supplied or none
 * are found in the table, so a single-league season — e.g. Bolivia 2025, which
 * Wikipedia notes used NO aggregate table — is never forced into the A/C rule.
 *
 * @param {Array} standings - league final table (accumulated for A/C leagues)
 * @param {Array<string>} championIds - [aperturaChampionId, clausuraChampionId]
 * @returns {Array} possibly-reordered shallow copy (or the original if untouched)
 */
function reorderAperturaClausuraChampionsFirst(standings, championIds) {
  if (!Array.isArray(standings) || standings.length === 0) return standings;
  if (!Array.isArray(championIds) || championIds.length === 0) return standings;
  const seen = new Set();
  const champions = [];
  for (const championId of championIds) {
    if (!championId || seen.has(championId)) continue;
    const row = standings.find(s => (s.teamId || s.id) === championId);
    if (row) {
      champions.push(row);
      seen.add(championId);
    }
  }
  if (champions.length === 0) return standings;
  const rest = standings.filter(s => !seen.has(s.teamId || s.id));
  return [...champions, ...rest];
}

function buildSAEntry(entry, leagueId, position, allTeamsMap) {
  const id = entry.teamId || entry.id;
  const teamData = allTeamsMap[id] || {};
  return {
    ...teamData,
    teamId: id,
    teamName: entry.teamName || teamData.name || teamData.teamName || id,
    shortName: entry.shortName || teamData.shortName || '',
    league: leagueId,
    leaguePosition: position,
    reputation: teamData.reputation ?? entry.reputation ?? 70,
    overall: teamData.overall ?? entry.overall ?? 70,
    players: teamData.players || entry.players || []
  };
}

/**
 * Takes final standings from all SA leagues and returns qualified teams
 * for Copa Libertadores and Copa Sudamericana, taken strictly from each
 * league's *table position* (not reputation).
 *
 * Allocation is done in WAVES rather than a flat slice: the function first
 * collects every league's 1st continental berth, then every league's 2nd, and
 * so on, up to the competition size. This guarantees:
 *   - every league with standings is represented before the cap truncates
 *     anyone (Bolivia/Venezuela are never silently dropped by being last in
 *     declaration order — the old `.slice(0, 32)` bug);
 *   - the cap removes the *lowest-priority* berths (the highest table positions
 *     of the biggest countries), which is the fair, deterministic outcome;
 *   - no team is duplicated inside a competition, and a Libertadores team can
 *     never also appear in the Sudamericana field.
 *
 * @param {Object} leagueStandings - { leagueId: [{ teamId, teamName, ... }] }
 * @param {Object} allTeamsMap - Map/object of teamId → full team data
 * @param {Object} [options]
 * @param {string} [options.playerLeagueId] - prioritised first within each wave
 *        so the player's federation is never the one truncated by the cap.
 * @param {Object} [options.aperturaClausuraChampions] - { leagueId: [aperturaChampionId, clausuraChampionId] }.
 *        For Apertura/Clausura leagues these two champions are pulled to the
 *        front of the league's table so they take the first Libertadores berths,
 *        with the remaining places filled from the Accumulated order. Omit (or
 *        pass none) for single-league seasons so no A/C rule is forced.
 * @returns {{ copaLibertadores: Array, copaSudamericana: Array }}
 */
export function qualifyTeamsForSouthAmerica(leagueStandings, allTeamsMap = {}, options = {}) {
  const { playerLeagueId = null, aperturaClausuraChampions = {} } = options;
  const leagueIds = Object.keys(SA_LEAGUE_SLOTS);

  // Stable priority order: player league first, then declaration order.
  const order = leagueIds
    .map((leagueId, index) => ({ leagueId, index }))
    .sort((a, b) => {
      const aPlayer = a.leagueId === playerLeagueId ? 0 : 1;
      const bPlayer = b.leagueId === playerLeagueId ? 0 : 1;
      return aPlayer - bPlayer || a.index - b.index;
    })
    .map(o => o.leagueId);

  // Per-league ordered candidate columns for each competition.
  const columns = { copaLibertadores: {}, copaSudamericana: {} };
  for (const leagueId of leagueIds) {
    const slots = SA_LEAGUE_SLOTS[leagueId];
    const rawStandings = leagueStandings[leagueId];
    if (!rawStandings || rawStandings.length === 0) {
      columns.copaLibertadores[leagueId] = [];
      columns.copaSudamericana[leagueId] = [];
      continue;
    }
    // Apertura/Clausura champions (when known) claim the first Libertadores
    // berths ahead of the raw accumulated order; a no-op for single-league seasons.
    const standings = reorderAperturaClausuraChampionsFirst(
      rawStandings,
      aperturaClausuraChampions[leagueId]
    );
    const cl = [];
    for (let i = 0; i < slots.copaLibertadores && i < standings.length; i++) {
      cl.push(buildSAEntry(standings[i], leagueId, i + 1, allTeamsMap));
    }
    const sud = [];
    const sudStart = slots.copaLibertadores;
    for (let i = sudStart; i < sudStart + slots.copaSudamericana && i < standings.length; i++) {
      sud.push(buildSAEntry(standings[i], leagueId, i + 1, allTeamsMap));
    }
    columns.copaLibertadores[leagueId] = cl;
    columns.copaSudamericana[leagueId] = sud;
  }

  const drainWaves = (compColumns, cap, excludeIds) => {
    const out = [];
    const used = new Set();
    const maxLen = Math.max(0, ...Object.values(compColumns).map(c => c.length));
    for (let wave = 0; wave < maxLen && out.length < cap; wave++) {
      for (const leagueId of order) {
        if (out.length >= cap) break;
        const candidate = compColumns[leagueId][wave];
        if (!candidate) continue;
        const id = candidate.teamId;
        if (!id || used.has(id) || excludeIds.has(id)) continue;
        used.add(id);
        out.push(candidate);
      }
    }
    return { teams: out, used };
  };

  const libertadores = drainWaves(columns.copaLibertadores, COPA_LIBERTADORES.teamsCount, new Set());
  // A Libertadores entrant must never also sit in the Sudamericana field.
  const sudamericana = drainWaves(columns.copaSudamericana, COPA_SUDAMERICANA.teamsCount, libertadores.used);

  return {
    copaLibertadores: libertadores.teams,
    copaSudamericana: sudamericana.teams
  };
}

/**
 * Centralised SA field builder used by every entry point (first-season
 * bootstrap and season rollover, across normal / contrarreloj / ProManager).
 * Wraps {@link qualifyTeamsForSouthAmerica} and applies the shared, previously
 * copy-pasted post-processing in ONE place:
 *   1. table-position qualification (player included by his real finish);
 *   2. global de-duplication so no club is in both competitions;
 *   3. optional top-up to the competition size from `fillerPool`.
 *
 * For historical saves the caller passes a `fillerPool` drawn from the active
 * historical universe (NOT the static current-era clubs), so a 2008-09 Bolivian
 * draw is never contaminated with 2025/26 teams. Pass `allowFillers: false`
 * (or an empty pool) to leave the field at exactly the qualified count.
 *
 * @param {Object} params
 * @param {Object} params.leagueStandings - { leagueId: finalTable[] }
 * @param {Object} [params.allTeamsMap]   - id → full team for metadata enrichment
 * @param {Array}  [params.fillerPool]    - SA teams eligible to top up short fields
 * @param {string} [params.playerLeagueId]
 * @param {Object} [params.aperturaClausuraChampions] - { leagueId: [aperturaChampionId, clausuraChampionId] }
 *        forwarded to {@link qualifyTeamsForSouthAmerica} so each Apertura/Clausura
 *        champion takes a guaranteed Libertadores berth.
 * @param {boolean}[params.allowFillers=true]
 * @returns {{ copaLibertadores: Array, copaSudamericana: Array }}
 */
export function buildSouthAmericanQualifiedTeams({
  leagueStandings = {},
  allTeamsMap = {},
  fillerPool = [],
  playerLeagueId = null,
  aperturaClausuraChampions = {},
  allowFillers = true
} = {}) {
  const qualified = qualifyTeamsForSouthAmerica(leagueStandings, allTeamsMap, {
    playerLeagueId,
    aperturaClausuraChampions
  });

  // Global de-dup across both competitions (defensive — qualify already keeps
  // them disjoint, but fillers below must respect it too).
  const used = new Set();
  for (const compId of ['copaLibertadores', 'copaSudamericana']) {
    qualified[compId] = (qualified[compId] || []).filter(team => {
      const id = team.teamId || team.id;
      if (!id || used.has(id)) return false;
      used.add(id);
      return true;
    });
  }

  if (allowFillers && fillerPool && fillerPool.length > 0) {
    const fillers = fillerPool
      .filter(t => {
        const id = t?.id || t?.teamId;
        return id && !used.has(id);
      })
      .sort((a, b) => (b.reputation || b.overall || 0) - (a.reputation || a.overall || 0));

    for (const compId of ['copaLibertadores', 'copaSudamericana']) {
      const cap = SA_COMPETITIONS[compId].teamsCount;
      while (qualified[compId].length < cap && fillers.length > 0) {
        const t = fillers.shift();
        const id = t.id || t.teamId;
        if (!id || used.has(id)) continue;
        used.add(id);
        qualified[compId].push({
          ...t,
          teamId: id,
          teamName: t.name || t.teamName || id,
          shortName: t.shortName || '',
          league: t.league || t.leagueId || 'unknown',
          leaguePosition: 0,
          reputation: t.reputation || 60,
          overall: t.overall || 65,
          players: t.players || []
        });
      }
    }
  }

  // Hard cap safety.
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
