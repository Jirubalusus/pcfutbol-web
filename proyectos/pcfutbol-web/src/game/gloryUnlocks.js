/**
 * Glory Mode — Unlock System
 * Cards are locked by default and unlocked via milestones (hitos).
 * Milestones don't reveal which card they unlock — it's a surprise.
 */

// Cards unlocked from the start (5 Tier B)
export const STARTER_CARDS = [
  'gladiator', 'goal_bonus', 'second_chance', 'wild_card', 'diplomat'
];

// Milestone definitions
// Each milestone has: id, name, description (shown to player), requirement check, cardId (hidden)
export const MILESTONES = [
  {
    id: 'survivor',
    name: 'Superviviente',
    description: 'Termina 1 temporada sin ser despedido',
    cardId: 'secret_clause',
    check: (stats) => (stats.seasonsCompleted || 0) >= 1,
  },
  {
    id: 'academy',
    name: 'Academia',
    description: 'Gana 3 partidos seguidos',
    cardId: 'golden_academy',
    check: (stats) => (stats.maxWinStreak || 0) >= 3,
  },
  {
    id: 'local_fame',
    name: 'Fama local',
    description: 'Consigue el ascenso por primera vez',
    cardId: 'fame',
    check: (stats) => (stats.promotions || 0) >= 1,
  },
  {
    id: 'home_fortress',
    name: 'Imbatible en casa',
    description: 'Gana 5 partidos en casa seguidos',
    cardId: 'cursed_stadium',
    check: (stats) => (stats.maxHomeWinStreak || 0) >= 5,
  },
  {
    id: 'scorer',
    name: 'Goleador',
    description: 'Mete 30+ goles en una temporada',
    cardId: 'max_speed',
    check: (stats) => (stats.bestSeasonGoals || 0) >= 30,
  },
  {
    id: 'wall',
    name: 'Muro defensivo',
    description: 'Deja 5 porterías a cero en una temporada',
    cardId: 'the_wall',
    check: (stats) => (stats.bestSeasonCleanSheets || 0) >= 5,
  },
  {
    id: 'negotiator',
    name: 'Negociador',
    description: 'Ficha 3 jugadores en un mismo mercado',
    cardId: 'legal_theft',
    check: (stats) => (stats.maxSigningsInWindow || 0) >= 3,
  },
  {
    id: 'strategist',
    name: 'Estratega',
    description: 'Gana un partido con 3+ goles de diferencia',
    cardId: 'tactical_wildcard',
    check: (stats) => (stats.biggestWinMargin || 0) >= 3,
  },
  {
    id: 'veteran',
    name: 'Veterano',
    description: 'Llega a la temporada 3',
    cardId: 'dr_miracles',
    check: (stats) => (stats.seasonsCompleted || 0) >= 2,
  },
  {
    id: 'youth',
    name: 'Cantera',
    description: 'Ten 3+ jugadores sub-21 en plantilla',
    cardId: 'local_legend',
    check: (stats) => (stats.maxYouthPlayers || 0) >= 3,
  },
  {
    id: 'climber',
    name: 'Escalador',
    description: 'Asciende 2 veces',
    cardId: 'fountain_of_youth',
    check: (stats) => (stats.promotions || 0) >= 2,
  },
  {
    id: 'unbeaten',
    name: 'Invicto',
    description: 'Encadena 10 partidos sin perder',
    cardId: 'penalty_master',
    check: (stats) => (stats.maxUnbeatenRun || 0) >= 10,
  },
  {
    id: 'chosen_one',
    name: 'El elegido',
    description: 'Llega a Segunda División',
    cardId: 'future_scout',
    check: (stats) => (stats.highestDivision || 4) <= 2,
  },
  {
    id: 'tycoon',
    name: 'Magnate',
    description: 'Acumula 2M€ en presupuesto',
    cardId: 'ghost_sheikh',
    check: (stats) => (stats.maxBudget || 0) >= 2000000,
  },
  {
    id: 'mad_scientist',
    name: 'Científico loco',
    description: 'Ten un jugador con 85+ OVR',
    cardId: 'perfect_clone',
    check: (stats) => (stats.bestPlayerOvr || 0) >= 85,
  },
  {
    id: 'champion',
    name: 'Campeón',
    description: 'Gana la liga',
    cardId: 'achilles_heel',
    check: (stats) => (stats.leaguesWon || 0) >= 1,
  },
  {
    id: 'underdog',
    name: 'Underdog',
    description: 'Gana a un equipo 10+ OVR superior',
    cardId: 'double_or_nothing',
    check: (stats) => (stats.biggestUpsetMargin || 0) >= 10,
  },
  {
    id: 'mercenary',
    name: 'Mercenario',
    description: 'Vende un jugador por 500K+',
    cardId: 'forced_swap',
    check: (stats) => (stats.biggestSale || 0) >= 500000,
  },
  {
    id: 'legend',
    name: 'Leyenda',
    description: 'Llega a La Liga',
    cardId: 'black_market',
    check: (stats) => (stats.highestDivision || 4) <= 1,
  },
  {
    id: 'primera',
    name: 'Primera',
    description: 'Asciende a Primera División',
    cardId: 'star_signing',
    check: (stats) => (stats.highestDivision || 4) <= 1,
  },
];

/**
 * Get all unlocked card IDs based on starter cards + completed milestones
 */
export function getUnlockedCards(completedMilestoneIds = []) {
  const unlocked = new Set(STARTER_CARDS);
  for (const m of MILESTONES) {
    if (completedMilestoneIds.includes(m.id)) {
      unlocked.add(m.cardId);
    }
  }
  return [...unlocked];
}

/**
 * Check all milestones against current stats, return newly completed ones
 */
export function checkMilestones(stats, alreadyCompleted = []) {
  const newlyCompleted = [];
  for (const m of MILESTONES) {
    if (!alreadyCompleted.includes(m.id) && m.check(stats)) {
      newlyCompleted.push(m.id);
    }
  }
  return newlyCompleted;
}

/**
 * Build stats object from game state for milestone checking
 */
export function buildGloryStats(state) {
  const gloryData = state.gloryData || {};
  const fixtures = state.fixtures || [];
  const teamId = state.teamId;
  const players = state.team?.players || [];

  // Win/unbeaten streaks
  const playedFixtures = fixtures
    .filter(f => f.played && (f.homeTeam === teamId || f.awayTeam === teamId))
    .sort((a, b) => a.week - b.week);

  let currentWinStreak = 0, maxWinStreak = 0;
  let currentUnbeaten = 0, maxUnbeatenRun = 0;
  let currentHomeWinStreak = 0, maxHomeWinStreak = 0;
  let seasonGoals = 0, cleanSheets = 0;
  let biggestWinMargin = 0;

  for (const f of playedFixtures) {
    const isHome = f.homeTeam === teamId;
    const myGoals = isHome ? f.homeScore : f.awayScore;
    const theirGoals = isHome ? f.awayScore : f.homeScore;
    const won = myGoals > theirGoals;
    const lost = myGoals < theirGoals;

    seasonGoals += myGoals;
    if (theirGoals === 0) cleanSheets++;
    if (won) biggestWinMargin = Math.max(biggestWinMargin, myGoals - theirGoals);

    // Win streak
    if (won) { currentWinStreak++; maxWinStreak = Math.max(maxWinStreak, currentWinStreak); }
    else currentWinStreak = 0;

    // Unbeaten
    if (!lost) { currentUnbeaten++; maxUnbeatenRun = Math.max(maxUnbeatenRun, currentUnbeaten); }
    else currentUnbeaten = 0;

    // Home win streak
    if (isHome && won) { currentHomeWinStreak++; maxHomeWinStreak = Math.max(maxHomeWinStreak, currentHomeWinStreak); }
    else if (isHome) currentHomeWinStreak = 0;
  }

  // Division tier
  const divIndex = ['laliga', 'segunda', 'primeraRFEF', 'segundaRFEF'].indexOf(gloryData.division);
  const highestDivision = divIndex >= 0 ? divIndex + 1 : 4;

  // Best player OVR
  const bestPlayerOvr = players.reduce((max, p) => Math.max(max, p.overall || 0), 0);

  // Youth count
  const youthCount = players.filter(p => (p.age || 99) <= 21).length;

  // History-based stats
  const history = gloryData.history || [];
  const promotions = history.filter(h => h.promoted).length;
  const seasonsCompleted = history.length;
  const leaguesWon = history.filter(h => h.position === 1).length;

  return {
    seasonsCompleted,
    promotions,
    maxWinStreak: Math.max(maxWinStreak, gloryData._stats?.maxWinStreak || 0),
    maxHomeWinStreak: Math.max(maxHomeWinStreak, gloryData._stats?.maxHomeWinStreak || 0),
    maxUnbeatenRun: Math.max(maxUnbeatenRun, gloryData._stats?.maxUnbeatenRun || 0),
    bestSeasonGoals: Math.max(seasonGoals, gloryData._stats?.bestSeasonGoals || 0),
    bestSeasonCleanSheets: Math.max(cleanSheets, gloryData._stats?.bestSeasonCleanSheets || 0),
    biggestWinMargin: Math.max(biggestWinMargin, gloryData._stats?.biggestWinMargin || 0),
    maxSigningsInWindow: gloryData._stats?.maxSigningsInWindow || 0,
    maxYouthPlayers: Math.max(youthCount, gloryData._stats?.maxYouthPlayers || 0),
    highestDivision: Math.min(highestDivision, gloryData._stats?.highestDivision || 4),
    maxBudget: Math.max(state.money || 0, gloryData._stats?.maxBudget || 0),
    bestPlayerOvr: Math.max(bestPlayerOvr, gloryData._stats?.bestPlayerOvr || 0),
    leaguesWon: Math.max(leaguesWon, gloryData._stats?.leaguesWon || 0),
    biggestUpsetMargin: gloryData._stats?.biggestUpsetMargin || 0,
    biggestSale: gloryData._stats?.biggestSale || 0,
  };
}
