/**
 * Draft Engine — Ranked Draft mode logic
 * Pure functions, no React dependencies.
 */

import {
  getLaLigaTeams, getSegundaTeams, getPremierTeams, getSerieATeams,
  getBundesligaTeams, getLigue1Teams, getEredivisieTeams, getPrimeiraLigaTeams,
  getChampionshipTeams, getBelgianProTeams, getSuperLigTeams, getScottishPremTeams,
  getSerieBTeams, getBundesliga2Teams, getLigue2Teams, getArgentinaTeams,
  getBrasileiraoTeams, getColombiaTeams, getChileTeams, getUruguayTeams,
  getLigaMXTeams, LEAGUES,
} from '../data/teamsFirestore';

import { DRAFT_LEAGUE_TEAMS } from './draftLeagueTeams';

// ============================================================
// CONSTANTS
// ============================================================

export const TARGET_TEAM_OVR = 85; // Target average, actual range ~80-90
export const DRAFT_TIME_SECONDS = 180;
export const CHANGES_TIME_SECONDS = 60;
export const FORMATION_PICK_SECONDS = 15;
export const SQUAD_SIZE = 11;
export const BENCH_SIZE = 3;
export const TOTAL_PICKS = 14;

// ============================================================
// FORMATIONS
// ============================================================

export const DRAFT_FORMATIONS = [
  { id: '4-3-3',   name: '4-3-3',   positions: ['GK', 'RB', 'CB', 'CB', 'LB', 'CM', 'CM', 'CM', 'RW', 'ST', 'LW'] },
  { id: '4-4-2',   name: '4-4-2',   positions: ['GK', 'RB', 'CB', 'CB', 'LB', 'RM', 'CM', 'CM', 'LM', 'ST', 'ST'] },
  { id: '3-5-2',   name: '3-5-2',   positions: ['GK', 'CB', 'CB', 'CB', 'RM', 'CM', 'CDM', 'CM', 'LM', 'ST', 'ST'] },
  { id: '4-2-3-1', name: '4-2-3-1', positions: ['GK', 'RB', 'CB', 'CB', 'LB', 'CDM', 'CDM', 'CAM', 'RW', 'ST', 'LW'] },
  { id: '5-3-2',   name: '5-3-2',   positions: ['GK', 'RB', 'CB', 'CB', 'CB', 'LB', 'CM', 'CM', 'CM', 'ST', 'ST'] },
  { id: '3-4-3',   name: '3-4-3',   positions: ['GK', 'CB', 'CB', 'CB', 'RM', 'CM', 'CM', 'LM', 'RW', 'ST', 'LW'] },
  { id: '4-5-1',   name: '4-5-1',   positions: ['GK', 'RB', 'CB', 'CB', 'LB', 'RM', 'CM', 'CDM', 'CM', 'LM', 'ST'] },
  { id: '4-1-4-1', name: '4-1-4-1', positions: ['GK', 'RB', 'CB', 'CB', 'LB', 'CDM', 'RM', 'CAM', 'CAM', 'LM', 'ST'] },
];

// ============================================================
// POSITION COMPATIBILITY
// ============================================================

// Map English formation positions → Spanish data positions (teamsFirestore normalizes to Spanish)
const EN_TO_ES = {
  'GK': 'POR', 'CB': 'DFC', 'LB': 'LB', 'RB': 'RB',
  'LWB': 'LB', 'RWB': 'RB', 'CDM': 'MCD', 'CM': 'MC',
  'CAM': 'MCO', 'LM': 'MI', 'RM': 'MD', 'LW': 'EI',
  'RW': 'ED', 'CF': 'CF', 'ST': 'DC',
};

// Also reverse: Spanish → English (for display/compat)
const ES_TO_EN = {};
for (const [en, es] of Object.entries(EN_TO_ES)) {
  if (!ES_TO_EN[es]) ES_TO_EN[es] = en;
}

function positionMatches(playerPos, targetPos) {
  if (playerPos === targetPos) return true;
  // Player has Spanish pos, target is English
  if (EN_TO_ES[targetPos] === playerPos) return true;
  // Player has English pos, target is Spanish
  if (EN_TO_ES[playerPos] === targetPos) return true;
  return false;
}

const POSITION_GROUPS = {
  GK: ['GK', 'POR'],
  DEF: ['CB', 'DFC', 'LB', 'RB', 'LWB', 'RWB'],
  MID: ['CDM', 'MCD', 'CM', 'MC', 'CAM', 'MCO', 'LM', 'MI', 'RM', 'MD'],
  FWD: ['LW', 'EI', 'RW', 'ED', 'ST', 'DC', 'CF'],
};

function getPositionGroup(pos) {
  for (const [group, positions] of Object.entries(POSITION_GROUPS)) {
    if (positions.includes(pos)) return group;
  }
  return 'MID'; // fallback
}

function isPositionCompatible(playerPos, targetPos) {
  if (playerPos === targetPos) return true;
  return getPositionGroup(playerPos) === getPositionGroup(targetPos);
}

// ============================================================
// HELPERS
// ============================================================

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ============================================================
// GET ALL PLAYERS FROM ALL LEAGUES
// ============================================================

function getAllLeaguePlayers() {
  const leagueGetters = [
    getLaLigaTeams, getSegundaTeams, getPremierTeams, getSerieATeams,
    getBundesligaTeams, getLigue1Teams, getEredivisieTeams, getPrimeiraLigaTeams,
    getChampionshipTeams, getBelgianProTeams, getSuperLigTeams, getScottishPremTeams,
    getSerieBTeams, getBundesliga2Teams, getLigue2Teams, getArgentinaTeams,
    getBrasileiraoTeams, getColombiaTeams, getChileTeams, getUruguayTeams,
    getLigaMXTeams,
  ];

  const allPlayers = [];
  for (const getter of leagueGetters) {
    const teams = getter();
    if (!teams) continue;
    for (const team of teams) {
      if (!team.players) continue;
      for (const player of team.players) {
        const draftId = `${team.id}_${player.name || player.id || allPlayers.length}`;
        const leagueKey = team.league || team.leagueId || '';
        const leagueInfo = LEAGUES[leagueKey] || {};
        allPlayers.push({
          ...player,
          id: draftId,
          teamId: team.id,
          teamName: team.name || team.shortName,
          league: leagueKey,
          leagueName: leagueInfo.name || leagueKey,
          country: player.nationality || leagueInfo.country || '',
        });
      }
    }
  }
  return allPlayers;
}

// ============================================================
// DRAW FORMATIONS
// ============================================================

/**
 * Return `count` random formations from DRAFT_FORMATIONS.
 */
export function drawFormations(count = 3) {
  return shuffle(DRAFT_FORMATIONS).slice(0, count);
}

// ============================================================
// DRAW PLAYERS FOR POSITION
// ============================================================

/**
 * Draw 3 player cards for a given position, balanced to target team OVR.
 *
 * @param {string} position - Target position (e.g. 'CB', 'ST')
 * @param {string[]} pickedPlayerIds - Already picked player IDs to exclude
 * @param {object[]} currentPicks - Already picked player objects (need .overall)
 * @param {number} totalPicks - Total picks needed (default 14)
 * @param {number} targetOvr - Target average OVR (default 84)
 * @returns {object[]} Array of 3 player objects
 */
export function drawPlayersForPosition(position, pickedPlayerIds = [], currentPicks = [], totalPicks = TOTAL_PICKS, targetOvr = TARGET_TEAM_OVR) {
  const allPlayers = getAllLeaguePlayers();
  const pickedSet = new Set(pickedPlayerIds);

  console.log(`🎴 drawPlayersForPosition: pos=${position}, allPlayers=${allPlayers.length}, picked=${pickedSet.size}`);

  // Calculate OVR budget
  const sumPickedOvr = currentPicks.reduce((sum, p) => sum + (p.overall || 0), 0);
  const remainingSlots = totalPicks - currentPicks.length;
  const remainingBudget = targetOvr * totalPicks - sumPickedOvr;
  const idealOvr = remainingSlots > 0 ? Math.round(remainingBudget / remainingSlots) : targetOvr;

  // Clamp ideal OVR to 80-90 range (wide pool of players)
  const clampedIdeal = Math.max(75, Math.min(92, idealOvr));

  // Filter players: EXACT position match only, excluding already picked
  const exact = allPlayers.filter(p =>
    !pickedSet.has(p.id) && p.overall && positionMatches(p.position, position)
  );

  // Fallback: if fewer than 3 exact, allow same position group
  const compatible = exact.length >= 3 ? exact : allPlayers.filter(p =>
    !pickedSet.has(p.id) && p.overall && isPositionCompatible(p.position, position)
  );

  const pool = exact.length >= 3 ? exact : compatible;

  console.log(`🎴 pos=${position}, exact=${exact.length}, pool=${pool.length}, idealOvr=${clampedIdeal}`);

  // Pick 3 DISTINCT players from different OVR ranges
  const shuffled = shuffle([...pool]);
  const result = [];
  const usedIds = new Set();

  // 3 tiers: star / solid / budget — wide spread for variety
  const tierRanges = [
    { min: 87, max: 94 },   // Star pick
    { min: 82, max: 88 },   // Solid pick
    { min: 76, max: 83 },   // Budget pick
  ];

  for (const tier of tierRanges) {
    const candidates = shuffled.filter(p =>
      !usedIds.has(p.id) && p.overall >= tier.min && p.overall <= tier.max
    );
    if (candidates.length > 0) {
      result.push(candidates[0]);
      usedIds.add(candidates[0].id);
    }
  }

  // Fill remaining — widen OVR range fully but keep position compatibility
  if (result.length < 3) {
    for (const p of shuffled) {
      if (result.length >= 3) break;
      if (!usedIds.has(p.id)) {
        result.push(p);
        usedIds.add(p.id);
      }
    }
  }

  console.log(`🎴 result=${result.length} cards: ${result.map(p => `${p.name}(${p.overall})`).join(', ')}`);

  return result.slice(0, 3);
}

// ============================================================
// SYNERGIES
// ============================================================

/**
 * Calculate synergy bonuses for a set of players.
 * - 3+ from same league → +3 OVR
 * - 3+ from same team → +5 OVR (stacks)
 */
export function calculateSynergies(players) {
  const bonuses = [];

  // Count by league
  const leagueCounts = {};
  const teamCounts = {};
  for (const p of players) {
    if (p.league) {
      leagueCounts[p.league] = (leagueCounts[p.league] || 0) + 1;
    }
    if (p.teamId) {
      teamCounts[p.teamId] = (teamCounts[p.teamId] || 0) + 1;
    }
  }

  // Determine which leagues/teams trigger synergy
  const synergyLeagues = new Set(
    Object.entries(leagueCounts).filter(([, c]) => c >= 3).map(([l]) => l)
  );
  const synergyTeams = new Set(
    Object.entries(teamCounts).filter(([, c]) => c >= 3).map(([t]) => t)
  );

  for (const league of synergyLeagues) {
    const info = LEAGUES[league] || {};
    bonuses.push({ type: 'league', leagues: [league], name: info.name || league, bonus: 3 });
  }
  for (const teamId of synergyTeams) {
    const teamPlayer = players.find(p => p.teamId === teamId);
    bonuses.push({ type: 'team', teams: [teamId], name: teamPlayer?.teamName || teamId, bonus: 5 });
  }

  // Apply bonuses
  const modifiedPlayers = players.map(p => {
    let ovrBonus = 0;
    if (p.league && synergyLeagues.has(p.league)) ovrBonus += 3;
    if (p.teamId && synergyTeams.has(p.teamId)) ovrBonus += 5;
    if (ovrBonus === 0) return { ...p };
    return {
      ...p,
      overall: Math.min(99, (p.overall || 0) + ovrBonus),
      synergyBonus: ovrBonus,
    };
  });

  return { bonuses, modifiedPlayers };
}

// ============================================================
// GENERATE DRAFT LEAGUE AI TEAMS
// ============================================================

const FIRST_NAMES = [
  'Adrián', 'Marcos', 'Pablo', 'Hugo', 'Álvaro', 'Diego', 'Sergio', 'Carlos',
  'Álex', 'Rubén', 'Javi', 'Dani', 'Iker', 'Raúl', 'Óscar', 'Lucas',
  'Mario', 'David', 'Pedro', 'Antonio', 'Mateo', 'Leo', 'Nico', 'Izan',
  'Joel', 'Gael', 'Unai', 'Pol', 'Arnau', 'Jan', 'Thiago', 'Bruno',
  'Samuel', 'Eric', 'Biel', 'Marc', 'Enzo', 'Liam', 'Noah', 'Oliver',
];

const LAST_NAMES = [
  'García', 'López', 'Martínez', 'Fernández', 'González', 'Rodríguez', 'Sánchez', 'Pérez',
  'Gómez', 'Díaz', 'Hernández', 'Moreno', 'Muñoz', 'Álvarez', 'Romero', 'Ruiz', 'Torres',
  'Navarro', 'Domínguez', 'Vázquez', 'Ramos', 'Gil', 'Serrano', 'Blanco', 'Molina',
  'Castro', 'Ortega', 'Rubio', 'Marín', 'Sanz', 'Iglesias', 'Medina', 'Cortés', 'Herrera',
  'Aguilar', 'Cabrera', 'Campos', 'Vega', 'Reyes', 'Fuentes', 'Peña', 'Delgado', 'Prieto',
];

const POSITIONS_LIST = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST'];

let _draftNextId = 1;

function generateDraftPlayer({ position, ovrMin = 78, ovrMax = 88, ageMin = 20, ageMax = 33 } = {}) {
  const pos = position || pickRandom(POSITIONS_LIST);
  const ovr = randInt(ovrMin, ovrMax);
  const age = randInt(ageMin, ageMax);
  const potential = Math.min(99, ovr + randInt(0, 8));

  return {
    id: `draft_p_${_draftNextId++}`,
    name: `${pickRandom(FIRST_NAMES)} ${pickRandom(LAST_NAMES)}`,
    position: pos,
    overall: ovr,
    potential,
    age,
    salary: Math.round((ovr * 1200 + randInt(-3000, 3000)) / 1000) * 1000,
    stamina: randInt(65, 95),
    speed: pos === 'GK' ? randInt(30, 55) : randInt(50, 90),
    defense: ['GK', 'CB', 'LB', 'RB', 'CDM'].includes(pos) ? ovr + randInt(-5, 8) : randInt(30, 55),
    attack: ['ST', 'LW', 'RW', 'CAM', 'CF'].includes(pos) ? ovr + randInt(-5, 8) : randInt(30, 55),
    passing: ['CM', 'CAM', 'CDM'].includes(pos) ? ovr + randInt(-3, 10) : randInt(40, 70),
    goalkeeping: pos === 'GK' ? ovr + randInt(0, 10) : randInt(5, 15),
    injured: false,
    injuryWeeks: 0,
    yellowCards: 0,
    redCards: 0,
    goals: 0,
    assists: 0,
    matchesPlayed: 0,
    morale: 75,
    fitness: 100,
    contract: randInt(1, 3),
  };
}

/**
 * Generate `count` AI teams for the Draft League.
 * Each has 14 players (11 + 3 bench) averaging ~83 OVR.
 */
export function generateDraftLeagueTeams(count = 18) {
  const teamDefs = DRAFT_LEAGUE_TEAMS.slice(0, count);
  const formation = DRAFT_FORMATIONS[0]; // 4-3-3 default for AI

  return teamDefs.map(def => {
    // Generate 11 starters following formation positions
    const starters = formation.positions.map(pos =>
      generateDraftPlayer({ position: pos, ovrMin: 79, ovrMax: 88 })
    );

    // 3 bench: 1 GK sub + 2 outfield
    const bench = [
      generateDraftPlayer({ position: 'GK', ovrMin: 76, ovrMax: 82 }),
      generateDraftPlayer({ ovrMin: 78, ovrMax: 85 }),
      generateDraftPlayer({ ovrMin: 78, ovrMax: 85 }),
    ];

    const allPlayers = [...starters, ...bench];

    // Adjust to hit ~83 average: nudge OVRs
    const currentAvg = allPlayers.reduce((s, p) => s + p.overall, 0) / allPlayers.length;
    const diff = Math.round(83 - currentAvg);
    if (diff !== 0) {
      for (const p of allPlayers) {
        p.overall = Math.max(70, Math.min(94, p.overall + diff));
      }
    }

    return {
      id: def.id,
      name: def.name,
      shortName: def.shortName,
      colors: def.colors,
      formation: formation.id,
      players: allPlayers,
      starters: starters.map(p => p.id),
      bench: bench.map(p => p.id),
    };
  });
}

// ============================================================
// BUILD DRAFT TEAM
// ============================================================

/**
 * Convert picked players + formation into a team object
 * compatible with leagueEngine/matchSimulation.
 */
export function buildDraftTeam(picks, formation, teamName) {
  if (!picks || picks.length < SQUAD_SIZE) {
    throw new Error(`Need at least ${SQUAD_SIZE} picks, got ${picks.length}`);
  }

  const { bonuses, modifiedPlayers } = calculateSynergies(picks);

  const starters = modifiedPlayers.slice(0, SQUAD_SIZE);
  const bench = modifiedPlayers.slice(SQUAD_SIZE, SQUAD_SIZE + BENCH_SIZE);

  const team = {
    id: `draft_user_${Date.now()}`,
    name: teamName || 'Draft FC',
    shortName: (teamName || 'DFC').substring(0, 3).toUpperCase(),
    formation: formation.id,
    players: modifiedPlayers,
    starters: starters.map(p => p.id),
    bench: bench.map(p => p.id),
    colors: { primary: '#1e88e5', secondary: '#ffffff' },
    isDraftTeam: true,
  };

  return { team, synergies: { bonuses, modifiedPlayers } };
}

export { DRAFT_LEAGUE_TEAMS };
