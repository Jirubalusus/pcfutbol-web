// ============================================================
// PRO MANAGER ENGINE - Career mode logic
// Board confidence, prestige, objectives, offers
// ============================================================

import { LEAGUE_CONFIG } from './multiLeagueEngine';
import { getLeagueTier } from './leagueTiers';

// Countries with their flags and available leagues
export const COUNTRIES = [
  { id: 'spain', name: 'España', flag: '🇪🇸', leagues: ['segunda', 'primeraRFEF', 'segundaRFEF'] },
  { id: 'england', name: 'Inglaterra', flag: '🇬🇧', leagues: ['championship'] },
  { id: 'italy', name: 'Italia', flag: '🇮🇹', leagues: ['serieB'] },
  { id: 'germany', name: 'Alemania', flag: '🇩🇪', leagues: ['bundesliga2'] },
  { id: 'france', name: 'Francia', flag: '🇫🇷', leagues: ['ligue2'] },
  { id: 'portugal', name: 'Portugal', flag: '🇵🇹', leagues: ['primeiraLiga'] },
  { id: 'netherlands', name: 'Países Bajos', flag: '🇳🇱', leagues: ['eredivisie'] },
  { id: 'belgium', name: 'Bélgica', flag: '🇧🇪', leagues: ['belgianPro'] },
  { id: 'turkey', name: 'Turquía', flag: '🇹🇷', leagues: ['superLig'] },
  { id: 'scotland', name: 'Escocia', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', leagues: ['scottishPrem'] },
  { id: 'switzerland', name: 'Suiza', flag: '🇨🇭', leagues: ['swissSuperLeague'] },
  { id: 'austria', name: 'Austria', flag: '🇦🇹', leagues: ['austrianBundesliga'] },
  { id: 'greece', name: 'Grecia', flag: '🇬🇷', leagues: ['greekSuperLeague'] },
  { id: 'denmark', name: 'Dinamarca', flag: '🇩🇰', leagues: ['danishSuperliga'] },
  { id: 'croatia', name: 'Croacia', flag: '🇭🇷', leagues: ['croatianLeague'] },
  { id: 'czech', name: 'Chequia', flag: '🇨🇿', leagues: ['czechLeague'] },
  { id: 'argentina', name: 'Argentina', flag: '🇦🇷', leagues: ['argentinaPrimera'] },
  { id: 'brazil', name: 'Brasil', flag: '🇧🇷', leagues: ['brasileiraoA'] },
  { id: 'colombia', name: 'Colombia', flag: '🇨🇴', leagues: ['colombiaPrimera'] },
  { id: 'mexico', name: 'México', flag: '🇲🇽', leagues: ['ligaMX'] },
];

// Top-tier leagues — prestige >= 50 needed to get offers here
const TOP_LEAGUES = new Set(['laliga', 'premierLeague', 'serieA', 'bundesliga', 'ligue1']);
// Mid-tier leagues — prestige >= 25
const MID_LEAGUES = new Set(['eredivisie', 'primeiraLiga', 'belgianPro', 'superLig', 'brasileiraoA', 'argentinaPrimera', 'ligaMX']);

/**
 * Generate initial team offers from ALL leagues — 20 weak teams, no country filter
 */
export function generateInitialOffers(country, prestige, allLeagueGetters) {
  const allTeamsWithMeta = [];
  
  for (const [leagueId, config] of Object.entries(LEAGUE_CONFIG)) {
    if (config.isGroupLeague) continue;
    const getter = allLeagueGetters[leagueId] || config.getTeams;
    if (!getter) continue;
    
    try {
      const teams = getter();
      if (!teams?.length) continue;
      for (const team of teams) {
        const avgOvr = getAvgOverall(team);
        allTeamsWithMeta.push({ team, leagueId, leagueName: config.name, avgOvr });
      }
    } catch { /* skip */ }
  }

  // Filter by prestige-based max OVR (generous threshold)
  const maxOvr = 73 + (prestige > 30 ? (prestige - 30) * 0.5 : 0);
  let pool = allTeamsWithMeta.filter(t => t.avgOvr <= maxOvr);

  // Fallback: if not enough teams, pick the weakest available
  if (pool.length < 5 && allTeamsWithMeta.length > 0) {
    const sorted = [...allTeamsWithMeta].sort((a, b) => a.avgOvr - b.avgOvr);
    pool = sorted.slice(0, Math.max(20, pool.length));
  }

  // Shuffle and pick 5
  const shuffled = pool.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 5).map(entry => ({
    ...entry,
    objective: getBoardObjective(entry.avgOvr, entry.leagueId, entry.team),
  }));
}

/**
 * Get average overall of a team
 */
function getAvgOverall(team) {
  if (!team?.players?.length) return 65;
  return Math.round(team.players.reduce((s, p) => s + (p.overall || 65), 0) / team.players.length);
}

/**
 * Build league getters from the current career universe instead of static data.
 * ProManager offers and team switches must respect promotions/relegations already
 * applied to the save; static getters are only used to hydrate metadata/players.
 */
export function buildCareerLeagueGetters(state = {}, baseGetters = {}) {
  const staticTeamsById = new Map();
  for (const getter of Object.values(baseGetters || {})) {
    try {
      (getter?.() || []).forEach(team => {
        if (team?.id && !staticTeamsById.has(team.id)) staticTeamsById.set(team.id, team);
      });
    } catch { /* skip broken static getter */ }
  }

  const getCareerTable = (leagueId) => {
    if (leagueId === state.playerLeagueId && Array.isArray(state.leagueTable) && state.leagueTable.length > 0) {
      return state.leagueTable;
    }
    const otherLeague = state.otherLeagues?.[leagueId];
    if (Array.isArray(otherLeague?.table) && otherLeague.table.length > 0) return otherLeague.table;
    return null;
  };

  const leagueIds = new Set([
    ...Object.keys(baseGetters || {}),
    state.playerLeagueId,
    ...Object.keys(state.otherLeagues || {})
  ].filter(Boolean));

  const careerGetters = {};
  for (const leagueId of leagueIds) {
    careerGetters[leagueId] = () => {
      const table = getCareerTable(leagueId);
      if (!table) return baseGetters?.[leagueId]?.() || [];

      return table.map(entry => {
        const teamId = entry.teamId || entry.id;
        const base = staticTeamsById.get(teamId) || {};
        return {
          ...base,
          id: teamId,
          name: entry.teamName || base.name || teamId,
          shortName: entry.shortName || base.shortName || (entry.teamName || teamId)?.substring?.(0, 3)?.toUpperCase?.() || teamId,
          reputation: base.reputation || entry.reputation || 2,
          overall: base.overall || entry.overall || 65,
          players: base.players || entry.players || [],
          budget: base.budget || entry.budget,
          leagueId,
        };
      });
    };
  }
  return careerGetters;
}

/**
 * Determine board objective based on team strength relative to league
 */
export function getBoardObjective(teamOverall, leagueId, team) {
  const config = LEAGUE_CONFIG[leagueId];
  if (!config) return { type: 'mid_table', positionTarget: 10, label: 'proManager.objectives.midTable' };

  const totalTeams = config.teams || 20;
  const tier = getLeagueTier(leagueId);

  // Estimate relative strength: reputation + overall
  const rep = team?.reputation || 3;
  const strength = teamOverall + rep * 3;

  if (strength >= 88) {
    return { type: 'win_league', positionTarget: 1, label: 'proManager.objectives.winLeague' };
  } else if (strength >= 83) {
    return { type: 'top_2', positionTarget: 2, label: 'proManager.objectives.topTwo' };
  } else if (strength >= 78) {
    const target = Math.min(Math.ceil(totalTeams * 0.25), 6);
    return { type: 'european', positionTarget: target, label: 'proManager.objectives.european', labelParams: { position: target } };
  } else if (strength >= 73) {
    const target = Math.ceil(totalTeams * 0.5);
    return { type: 'top_half', positionTarget: target, label: 'proManager.objectives.topHalf' };
  } else {
    const relZone = config.zones?.relegation;
    const safePos = relZone ? Math.min(...relZone) - 1 : totalTeams - 3;
    return { type: 'avoid_relegation', positionTarget: safePos, label: 'proManager.objectives.avoidRelegation' };
  }
}

/**
 * Calculate board confidence after a match
 */
export function calculateBoardConfidence(currentConfidence, params) {
  const { 
    matchResult, // 'win' | 'draw' | 'loss'
    leaguePosition, 
    objective, 
    totalTeams = 20,
    winStreak = 0, 
    lossStreak = 0 
  } = params;

  let delta = 0;

  // Match result impact
  if (matchResult === 'win') delta += 3;
  else if (matchResult === 'draw') delta += 0;
  else if (matchResult === 'loss') delta -= 4;

  // Position vs objective
  const posTarget = objective?.positionTarget || Math.ceil(totalTeams / 2);
  const posDiff = leaguePosition - posTarget;
  
  if (posDiff <= 0) {
    // Meeting or exceeding objective
    delta += 2;
  } else if (posDiff <= 3) {
    // Slightly below
    delta -= 1;
  } else if (posDiff <= 6) {
    delta -= 3;
  } else {
    delta -= 5;
  }

  // Streaks
  if (winStreak >= 3) delta += 2;
  if (winStreak >= 5) delta += 3;
  if (lossStreak >= 3) delta -= 3;
  if (lossStreak >= 5) delta -= 5;

  const newConfidence = Math.max(0, Math.min(100, currentConfidence + delta));
  return newConfidence;
}

/**
 * Get board message based on confidence level
 */
export function getBoardMessage(confidence) {
  if (confidence >= 80) return { type: 'happy', key: 'proManager.board.happy' };
  if (confidence >= 60) return { type: 'neutral', key: 'proManager.board.neutral' };
  if (confidence >= 30) return { type: 'concerned', key: 'proManager.board.concerned' };
  if (confidence >= 10) return { type: 'warning', key: 'proManager.board.warning' };
  return { type: 'fired', key: 'proManager.board.fired' };
}

/**
 * Evaluate season result against objective
 */
export function evaluateSeason(position, objective, cupResult) {
  const target = objective?.positionTarget || 10;
  
  let result = 'failed';
  let prestigeChange = 0;

  if (position <= target) {
    if (position === 1) {
      result = 'champion';
      prestigeChange = 20;
    } else if (position <= Math.max(1, target - 2)) {
      result = 'exceeded';
      prestigeChange = 15;
    } else {
      result = 'met';
      prestigeChange = 8;
    }
  } else if (position <= target + 2) {
    result = 'close';
    prestigeChange = -3;
  } else {
    result = 'failed';
    prestigeChange = -8;
  }

  // Cup bonus
  if (cupResult === 'winner') prestigeChange += 10;
  else if (cupResult === 'finalist') prestigeChange += 5;
  else if (cupResult === 'semifinal') prestigeChange += 2;

  return { result, prestigeChange };
}

/**
 * Update prestige based on season result
 */
export function updatePrestige(currentPrestige, seasonEval, wasFired = false) {
  let newPrestige = currentPrestige + seasonEval.prestigeChange;
  if (wasFired) newPrestige -= 15;
  return Math.max(0, Math.min(100, newPrestige));
}

/**
 * Calculate how much a successful season should improve the manager's market.
 * The score is intentionally explicit so promotion/cups can improve offers even
 * when the normal objective evaluation only says "met".
 */
export function calculateOfferMomentum({ seasonEvalResult, promoted = false, cupResult = null, europeanResult = null, position = null } = {}) {
  let score = 0;

  if (seasonEvalResult === 'champion') score += 3;
  else if (seasonEvalResult === 'exceeded') score += 2;
  else if (seasonEvalResult === 'met') score += 1;

  if (promoted) score += 3;
  if (position === 1) score += 2;

  if (cupResult === 'winner') score += 3;
  else if (cupResult === 'finalist') score += 2;
  else if (cupResult === 'semifinal') score += 1;

  const europeanText = String(europeanResult || '').toLowerCase();
  if (['winner', 'campeon', 'campeón', 'champion'].some(token => europeanText.includes(token))) score += 4;
  else if (['final', 'semifinal'].some(token => europeanText.includes(token))) score += 2;

  const level = score >= 7 ? 'elite'
    : score >= 5 ? 'breakthrough'
      : score >= 3 ? 'strong'
        : score >= 1 ? 'positive'
          : 'normal';

  return { score, level };
}

/**
 * Generate season-end offers based on prestige and season momentum.
 */
export function generateSeasonEndOffers(prestige, currentLeagueId, currentTeamId, allLeagueGetters = {}, options = {}) {
  const wasFired = !!options.wasFired;
  const rawMomentum = Number(options.performanceBoost ?? options.offerMomentum?.score ?? 0);
  const performanceBoost = wasFired ? 0 : Math.max(0, Math.min(10, rawMomentum));
  const effectivePrestige = Math.max(0, Math.min(100, prestige + performanceBoost * 7));
  const minOffers = wasFired ? (options.minOffers || 5) : (performanceBoost >= 5 ? 4 : performanceBoost >= 3 ? 3 : 0);
  const maxOffers = wasFired ? (options.maxOffers || 6) : (options.maxOffers || (performanceBoost >= 5 ? 5 : performanceBoost >= 3 ? 4 : 3));
  const candidates = [];

  for (const [leagueId, config] of Object.entries(LEAGUE_CONFIG)) {
    if (!config.getTeams && !allLeagueGetters[leagueId]) continue;
    if (config.isGroupLeague) continue; // Skip group leagues for simplicity
    
    const tier = getLeagueTier(leagueId);
    
    // Prestige gates. Successful seasons temporarily boost market access, while
    // dismissals still force a downward, realistic market.
    if (!wasFired) {
      if (TOP_LEAGUES.has(leagueId) && effectivePrestige < 50) continue;
      if (MID_LEAGUES.has(leagueId) && effectivePrestige < 25) continue;
      if (effectivePrestige < 20 && tier <= 2) continue;
      if (effectivePrestige < 35 && tier <= 1) continue;
    } else if (prestige < 35 && tier <= 1) {
      continue;
    }

    try {
      const getter = allLeagueGetters[leagueId] || config.getTeams;
      if (!getter) continue;
      const teams = getter();
      if (!teams?.length) continue;

      const maxOvr = wasFired
        ? Math.max(58, Math.min(72, 58 + prestige * 0.24))
        : 60 + effectivePrestige * 0.35 + performanceBoost * 1.6;

      for (const team of teams) {
        if (!team || team.id === currentTeamId) continue;
        const avgOvr = getAvgOverall(team);
        candidates.push({ team, leagueId, config, avgOvr, tier, underCap: avgOvr <= maxOvr });
      }
    } catch { /* skip */ }
  }

  const uniqueByTeam = (items) => {
    const seen = new Set();
    return items.filter(item => {
      const id = item.team?.id;
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  };

  let pool = uniqueByTeam(candidates.filter(c => c.underCap));

  if (wasFired) {
    // Smaller, realistic offers first. If the cap is too strict for a dynamic save,
    // backfill with the weakest available clubs so dismissal never dead-ends.
    pool = pool.sort((a, b) => a.avgOvr - b.avgOvr || b.tier - a.tier);
    if (pool.length < minOffers) {
      const extras = uniqueByTeam(candidates)
        .filter(c => !pool.some(p => p.team.id === c.team.id))
        .sort((a, b) => a.avgOvr - b.avgOvr || b.tier - a.tier);
      pool = [...pool, ...extras];
    }
  } else if (performanceBoost > 0) {
    // Good seasons should feel like a career step up: prioritize the strongest
    // reachable clubs, then add tiny randomness only inside equal strength bands.
    pool = pool.sort((a, b) =>
      b.avgOvr - a.avgOvr || a.tier - b.tier || Math.random() - 0.5
    );
    if (pool.length < minOffers) {
      const extras = uniqueByTeam(candidates)
        .filter(c => !pool.some(p => p.team.id === c.team.id))
        .sort((a, b) => b.avgOvr - a.avgOvr || a.tier - b.tier);
      pool = [...pool, ...extras];
    }
  } else {
    pool = pool.sort(() => Math.random() - 0.5);
  }

  const picked = pool.slice(0, maxOffers);

  return picked.map(({ team, leagueId, config, avgOvr }, index) => {
    // Ensure team has budget and reputation
    if (!team.budget) {
      if (avgOvr >= 78) team.budget = 80_000_000 + Math.floor(Math.random() * 40_000_000);
      else if (avgOvr >= 72) team.budget = 30_000_000 + Math.floor(Math.random() * 30_000_000);
      else if (avgOvr >= 65) team.budget = 10_000_000 + Math.floor(Math.random() * 15_000_000);
      else team.budget = 3_000_000 + Math.floor(Math.random() * 7_000_000);
    }
    if (!team.reputation) {
      team.reputation = Math.min(5, Math.max(1, Math.round(avgOvr / 16)));
    }

    const upgradedOffer = performanceBoost > 0 && index < Math.min(2, maxOffers);

    return {
      team,
      leagueId,
      leagueName: config.name,
      country: config.country,
      objective: getBoardObjective(avgOvr, leagueId, team),
      avgOvr,
      marketTier: upgradedOffer ? (performanceBoost >= 5 ? 'headline' : 'improved') : 'standard',
      performanceBoost,
    };
  });
}
export function shouldEndProManagerCareerAfterDismissal(currentSeason, dismissalHistory = [], windowSeasons = 2) {
  if (!Array.isArray(dismissalHistory) || dismissalHistory.length === 0) return false;
  const current = Number(currentSeason) || 1;
  const lastDismissal = dismissalHistory
    .map(Number)
    .filter(Number.isFinite)
    .sort((a, b) => b - a)[0];
  if (!lastDismissal) return false;
  return current - lastDismissal <= windowSeasons;
}

/**
 * Get confidence reset value after season end
 */
export function getSeasonEndConfidence(seasonEvalResult) {
  switch (seasonEvalResult) {
    case 'champion': return 90;
    case 'exceeded': return 85;
    case 'met': return 70;
    case 'close': return 55;
    case 'failed': return 40;
    default: return 60;
  }
}

/**
 * Create initial ProManager career state
 */
export function createProManagerCareer(managerName) {
  return {
    prestige: 10,
    boardConfidence: 60,
    objective: null,
    seasonsManaged: 0,
    totalWins: 0,
    totalDraws: 0,
    totalLosses: 0,
    totalMatches: 0,
    titles: 0,
    careerHistory: [],
    winStreak: 0,
    lossStreak: 0,
    managerName: managerName || 'Manager',
    currentTeamId: null,
    currentLeagueId: null,
    fired: false,
  };
}
