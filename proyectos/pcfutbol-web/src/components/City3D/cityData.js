/**
 * cityData.js — City level calculation, building configs, progression data
 */

// Building positions in the isometric city grid
export const BUILDING_CONFIGS = {
  stadium: {
    position: [0, 0, -12],
    size: [8, 5, 6],
    icon: '🏟️',
    label: 'Estadio',
    labelKey: 'city.stadium',
    minLevel: 1,
    color: '#2E7D32',
  },
  transferOffice: {
    position: [12, 0, -4],
    size: [3, 7, 3],
    icon: '🏢',
    label: 'Oficina de Fichajes',
    labelKey: 'city.transferOffice',
    minLevel: 1,
    color: '#1565C0',
  },
  trainingCenter: {
    position: [-12, 0, -4],
    size: [5, 3, 4],
    icon: '⚽',
    label: 'Centro de Entrenamiento',
    labelKey: 'city.trainingCenter',
    minLevel: 1,
    color: '#4CAF50',
  },
  museum: {
    position: [8, 0, 6],
    size: [3, 3, 3],
    icon: '🏆',
    label: 'Museo / Sala de Trofeos',
    labelKey: 'city.museum',
    minLevel: 2,
    color: '#FF8F00',
  },
  townHall: {
    position: [-8, 0, 8],
    size: [4, 4, 3],
    icon: '🏛️',
    label: 'Ayuntamiento',
    labelKey: 'city.townHall',
    minLevel: 1,
    color: '#6D4C41',
  },
  newspaperKiosk: {
    position: [4, 0, 8],
    size: [2, 2, 2],
    icon: '📰',
    label: 'Quiosco',
    labelKey: 'city.newspaperKiosk',
    minLevel: 1,
    color: '#E65100',
  },
  bank: {
    position: [14, 0, 6],
    size: [3, 4, 3],
    icon: '🏦',
    label: 'Banco',
    labelKey: 'city.bank',
    minLevel: 2,
    color: '#37474F',
  },
  medicalCenter: {
    position: [-14, 0, 4],
    size: [4, 3, 3],
    icon: '🏥',
    label: 'Centro Médico',
    labelKey: 'city.medicalCenter',
    minLevel: 1,
    color: '#C62828',
  },
  airport: {
    position: [-10, 0, 14],
    size: [5, 2, 4],
    icon: '✈️',
    label: 'Aeropuerto',
    labelKey: 'city.airport',
    minLevel: 3,
    color: '#0277BD',
  },
};

/**
 * Calculate city level (1-5) based on game progression
 * 1 = poor village, 5 = metropolis
 */
export function getCityLevel(state) {
  let score = 0;

  // League tier (lower = better)
  const tier = state.leagueTier || 3;
  if (tier <= 1) score += 3;
  else if (tier <= 2) score += 2;
  else score += 1;

  // Seasons played
  const seasons = state.currentSeason || 1;
  score += Math.min(seasons, 5);

  // Trophies
  const trophies = state.trophies?.length || 0;
  score += Math.min(trophies * 2, 6);

  // Facilities average
  const fac = state.facilities || {};
  const facAvg = Object.values(fac).reduce((a, b) => a + (b || 0), 0) / Math.max(Object.keys(fac).length, 1);
  score += Math.min(Math.floor(facAvg), 3);

  // Money
  const money = state.money || 0;
  if (money > 100000000) score += 3;
  else if (money > 30000000) score += 2;
  else if (money > 5000000) score += 1;

  // League position (if first, bonus)
  const pos = state.leagueTable?.findIndex(t => t.teamId === state.teamId) + 1;
  if (pos === 1) score += 2;
  else if (pos <= 3) score += 1;

  // Map score to level 1-5
  if (score >= 18) return 5;
  if (score >= 13) return 4;
  if (score >= 8) return 3;
  if (score >= 4) return 2;
  return 1;
}

/**
 * Get NPC count based on city level and league position
 */
export function getNPCCount(cityLevel, leaguePosition) {
  const base = cityLevel * 5;
  const posBonus = leaguePosition <= 3 ? 8 : leaguePosition <= 8 ? 4 : 0;
  return Math.min(base + posBonus, 40);
}

/**
 * Get weather for team's city (simplified)
 */
export function getCityWeather(teamName) {
  // Simple hash-based weather
  const hash = teamName?.split('').reduce((a, c) => a + c.charCodeAt(0), 0) || 0;
  const hour = new Date().getHours();
  const season = new Date().getMonth();
  
  if (season >= 11 || season <= 1) {
    // Winter
    return hash % 3 === 0 ? 'snow' : hash % 3 === 1 ? 'rain' : 'cloudy';
  }
  if (season >= 5 && season <= 8) {
    // Summer
    return hash % 4 === 0 ? 'cloudy' : 'sunny';
  }
  // Spring/Autumn
  return hash % 3 === 0 ? 'rain' : hash % 2 === 0 ? 'cloudy' : 'sunny';
}

/**
 * Day/night cycle based on real time
 */
export function getDayNightFactor() {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 8) return 0.5 + (hour - 6) / 4; // dawn
  if (hour >= 8 && hour < 18) return 1.0; // day
  if (hour >= 18 && hour < 20) return 1.0 - (hour - 18) / 4; // dusk
  return 0.3; // night
}

/**
 * Unlockable items based on achievements
 */
export function getUnlockables(state) {
  const unlocks = [];
  
  // Cup winner → statue
  if (state.trophies?.some(t => t.type === 'cup' || t.type === 'copa')) {
    unlocks.push({ type: 'statue', position: [0, 0, 0] });
  }
  
  // 100+ matches → mural
  const totalMatches = state.results?.length || 0;
  if (totalMatches >= 100) {
    unlocks.push({ type: 'mural', building: 'stadium' });
  }
  
  // Best player → graffiti
  if (state.team?.players?.length > 0) {
    const best = [...(state.team.players || [])].sort((a, b) => (b.overall || 0) - (a.overall || 0))[0];
    if (best && best.overall >= 85) {
      unlocks.push({ type: 'graffiti', playerName: best.name, building: 'trainingCenter' });
    }
  }
  
  return unlocks;
}
