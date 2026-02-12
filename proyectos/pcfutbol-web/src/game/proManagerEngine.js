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
  const pool = [];
  
  for (const [leagueId, config] of Object.entries(LEAGUE_CONFIG)) {
    if (config.isGroupLeague) continue;
    const getter = allLeagueGetters[leagueId] || config.getTeams;
    if (!getter) continue;
    
    try {
      const teams = getter();
      if (!teams?.length) continue;
      for (const team of teams) {
        const avgOvr = getAvgOverall(team);
        // Only weak teams (max OVR based on prestige, starts very low)
        const maxOvr = 55 + prestige * 0.3;
        if (avgOvr <= maxOvr) {
          pool.push({ team, leagueId, leagueName: config.name });
        }
      }
    } catch { /* skip */ }
  }

  // Shuffle and pick 20
  const shuffled = pool.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 20).map(entry => ({
    ...entry,
    objective: getBoardObjective(getAvgOverall(entry.team), entry.leagueId, entry.team),
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
 * Generate season-end offers based on prestige
 */
export function generateSeasonEndOffers(prestige, currentLeagueId, currentTeamId, allLeagueGetters) {
  const offers = [];
  const eligibleLeagues = [];

  for (const [leagueId, config] of Object.entries(LEAGUE_CONFIG)) {
    if (!config.getTeams && !allLeagueGetters[leagueId]) continue;
    if (config.isGroupLeague) continue; // Skip group leagues for simplicity
    
    const tier = getLeagueTier(leagueId);
    
    // Prestige gates
    if (TOP_LEAGUES.has(leagueId) && prestige < 50) continue;
    if (MID_LEAGUES.has(leagueId) && prestige < 25) continue;
    
    // Low prestige → only lower tier leagues
    if (prestige < 20 && tier <= 2) continue;
    if (prestige < 35 && tier <= 1) continue;

    eligibleLeagues.push({ leagueId, config, tier });
  }

  // Pick 2-4 random leagues
  const shuffledLeagues = eligibleLeagues.sort(() => Math.random() - 0.5).slice(0, 4);

  for (const { leagueId, config } of shuffledLeagues) {
    try {
      const getter = allLeagueGetters[leagueId] || config.getTeams;
      if (!getter) continue;
      const teams = getter();
      if (!teams?.length) continue;

      // Filter teams by prestige
      const maxOvr = 60 + prestige * 0.35;
      const eligible = teams.filter(t => {
        if (t.id === currentTeamId) return false;
        return getAvgOverall(t) <= maxOvr;
      });

      if (eligible.length === 0) continue;
      const team = eligible[Math.floor(Math.random() * eligible.length)];
      
      offers.push({
        team,
        leagueId,
        leagueName: config.name,
        country: config.country,
        objective: getBoardObjective(getAvgOverall(team), leagueId, team),
      });
    } catch { /* skip */ }
  }

  return offers.slice(0, 3);
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
