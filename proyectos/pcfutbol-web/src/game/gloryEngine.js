/**
 * Glory Mode Engine — "Camino a la Gloria"
 * Roguelike football manager: created team, climb divisions, pick game-changing cards
 */

import { getGlorySquad } from '../data/fictionalPlayers';

// ============================================================
// CONSTANTS
// ============================================================

export const GLORY_DIVISIONS = [
  { id: 'segundaRFEF', name: 'Segunda RFEF', tier: 4, teams: 20, budget: 200000, stadiumCap: 3000 },
  { id: 'primeraRFEF', name: 'Primera RFEF', tier: 3, teams: 20, budget: 500000, stadiumCap: 8000 },
  { id: 'segunda', name: 'Segunda División', tier: 2, teams: 22, budget: 2000000, stadiumCap: 20000 },
  { id: 'laliga', name: 'La Liga', tier: 1, teams: 20, budget: 10000000, stadiumCap: 50000 },
];

export const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST'];

// ============================================================
// GLORY SEASON ECONOMY ("Camino a la Gloria")
// ============================================================
// Camino a la Gloria has to stay tense for a tiny club: a promotion should feel
// like a reward, but ending/promoting season after season must NOT make a small
// side rich on its own. These helpers centralise the yearly cash math so it can
// be tuned in one place and locked with tests (audit:glory-small-team-economy).
//
// Notes on why we don't reuse raw economy:
//   - Fictional Glory salaries are stored ~35k–41k "per week"; multiplying by 52
//     would bankrupt the 200k start instantly, so we DO NOT use salary*52. We use
//     a deliberately scaled, tier-based operating cost instead.
//   - The old promotion grant added `nextDiv.budget` (500k / 2M / 10M) TWICE
//     (once in processSeasonEnd, once as START_NEW_SEASON moneyChange), which is
//     why small clubs ballooned. Grants below replace that single-counted.

const GLORY_DIVISION_ORDER = ['segundaRFEF', 'primeraRFEF', 'segunda', 'laliga'];

// League-finish baseline income for a NON-promotion season (prize money, modest
// sponsors), by the division you competed in. Multiplied by a position factor.
const GLORY_FINISH_MONEY = {
  segundaRFEF: 120000,
  primeraRFEF: 250000,
  segunda: 800000,
  laliga: 3500000,
};

// Season running cost (wages + operations) by the division you competed in.
// Tier-scaled and bounded — see note above on why this is not salary*52.
const GLORY_OPERATING_COST = {
  segundaRFEF: 80000,
  primeraRFEF: 180000,
  segunda: 500000,
  laliga: 2200000,
};

// One-time promotion grant, keyed by the DESTINATION division you ascend into.
// Tuned so the NET season change lands in the agreed bands (see audit test).
const GLORY_PROMOTION_GRANT = {
  primeraRFEF: 250000,
  segunda: 650000,
  laliga: 2500000,
};

/**
 * Per-season operating/wage cost for the division just played. Bounded, tier-based.
 */
export function getGloryOperatingCost(divisionId) {
  return GLORY_OPERATING_COST[divisionId] ?? GLORY_OPERATING_COST.segundaRFEF;
}

/**
 * League-finish income for a season, scaled by final league position.
 * Better finishes earn more; nobody earns the headline figure mid-table.
 */
export function getGloryFinishMoney(divisionId, position = 10) {
  const base = GLORY_FINISH_MONEY[divisionId] ?? GLORY_FINISH_MONEY.segundaRFEF;
  let factor;
  if (position <= 5) factor = 1.0;
  else if (position <= 10) factor = 0.85;
  else factor = 0.72;
  return Math.round(base * factor);
}

/**
 * One-time promotion grant for ascending OUT of `divisionId`. 0 if not promoted
 * or already in the top division.
 */
export function getGlorySeasonGrant(divisionId, promoted) {
  if (!promoted) return 0;
  const idx = GLORY_DIVISION_ORDER.indexOf(divisionId);
  if (idx < 0 || idx >= GLORY_DIVISION_ORDER.length - 1) return 0;
  const nextDivisionId = GLORY_DIVISION_ORDER[idx + 1];
  return GLORY_PROMOTION_GRANT[nextDivisionId] ?? 0;
}

/**
 * Centralised Glory yearly economy. Given the division just played, the final
 * league position and whether you were promoted, returns the NET cash change to
 * apply at season rollover (BEFORE player transfers / card events) plus its parts.
 *
 * net = finishMoney + promotionGrant - operatingCost
 */
export function calculateGlorySeasonFinancials({ divisionId, position = 10, promoted = false } = {}) {
  const safeDivision = GLORY_DIVISION_ORDER.includes(divisionId) ? divisionId : 'segundaRFEF';
  const finishMoney = getGloryFinishMoney(safeDivision, position);
  const operatingCost = getGloryOperatingCost(safeDivision);
  const grant = getGlorySeasonGrant(safeDivision, promoted);
  const net = finishMoney + grant - operatingCost;
  return { finishMoney, operatingCost, grant, net };
}

const FIRST_NAMES = [
  'Adrián', 'Marcos', 'Pablo', 'Hugo', 'Álvaro', 'Diego', 'Sergio', 'Carlos', 'Álex', 'Rubén',
  'Javi', 'Dani', 'Iker', 'Raúl', 'Óscar', 'Lucas', 'Mario', 'David', 'Pedro', 'Antonio',
  'Mateo', 'Leo', 'Nico', 'Izan', 'Joel', 'Gael', 'Unai', 'Pol', 'Arnau', 'Jan',
  'Thiago', 'Bruno', 'Samuel', 'Eric', 'Biel', 'Marc', 'Enzo', 'Liam', 'Noah', 'Oliver',
];

const LAST_NAMES = [
  'García', 'López', 'Martínez', 'Fernández', 'González', 'Rodríguez', 'Sánchez', 'Pérez',
  'Gómez', 'Díaz', 'Hernández', 'Moreno', 'Muñoz', 'Álvarez', 'Romero', 'Ruiz', 'Torres',
  'Navarro', 'Domínguez', 'Vázquez', 'Ramos', 'Gil', 'Serrano', 'Blanco', 'Molina',
  'Castro', 'Ortega', 'Rubio', 'Marín', 'Sanz', 'Iglesias', 'Medina', 'Cortés', 'Herrera',
  'Aguilar', 'Cabrera', 'Campos', 'Vega', 'Reyes', 'Fuentes', 'Peña', 'Delgado', 'Prieto',
];

// ============================================================
// PLAYER GENERATION
// ============================================================

let _nextId = 1;

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generatePlayerName() {
  return `${pickRandom(FIRST_NAMES)} ${pickRandom(LAST_NAMES)}`;
}

/**
 * Generate a single random player
 */
export function generatePlayer({ position, ovrMin = 40, ovrMax = 55, ageMin = 18, ageMax = 33 } = {}) {
  const pos = position || pickRandom(POSITIONS);
  const ovr = randInt(ovrMin, ovrMax);
  const age = randInt(ageMin, ageMax);
  const potential = Math.min(99, ovr + randInt(3, 20 - Math.floor(age / 3)));

  return {
    id: `glory_${_nextId++}`,
    name: generatePlayerName(),
    position: pos,
    overall: ovr,
    potential,
    age,
    salary: Math.round((ovr * 800 + randInt(-5000, 5000)) / 1000) * 1000,
    stamina: randInt(60, 95),
    speed: pos === 'GK' ? randInt(30, 55) : randInt(45, 90),
    defense: ['GK', 'CB', 'LB', 'RB', 'CDM'].includes(pos) ? ovr + randInt(-5, 8) : randInt(25, 55),
    attack: ['ST', 'LW', 'RW', 'CAM'].includes(pos) ? ovr + randInt(-5, 8) : randInt(25, 55),
    passing: ['CM', 'CAM', 'CDM'].includes(pos) ? ovr + randInt(-3, 10) : randInt(35, 70),
    goalkeeping: pos === 'GK' ? ovr + randInt(0, 10) : randInt(5, 15),
    injured: false,
    injuryWeeks: 0,
    yellowCards: 0,
    redCards: 0,
    goals: 0,
    assists: 0,
    matchesPlayed: 0,
    morale: 75,
    contract: randInt(1, 3),
  };
}

/**
 * Generate a full squad for glory mode
 */
export function generateSquad(ovrMin = 40, ovrMax = 55) {
  const squad = [];
  // Required positions for a balanced squad
  const required = ['GK', 'GK', 'CB', 'CB', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CM', 'CAM', 'LW', 'RW', 'ST', 'ST'];
  for (const pos of required) {
    squad.push(generatePlayer({ position: pos, ovrMin, ovrMax }));
  }
  // Fill remaining 5 slots with random positions
  for (let i = 0; i < 5; i++) {
    squad.push(generatePlayer({ ovrMin, ovrMax }));
  }
  return squad;
}


export function generateStarSigningChoices(gloryState = {}) {
  const tierBoost = Math.max(0, 4 - (gloryState.divisionTier || 4));
  const base = 70 + tierBoost * 5;
  const bestSalary = Math.max(...(gloryState.squad || []).map(p => p.salary || 0), 45000);
  return [
    {
      archetype: 'veteran',
      label: 'Veterano estrella',
      risk: 'Se retira pronto, rendimiento inmediato',
      player: { ...generatePlayer({ ovrMin: base + 6, ovrMax: base + 12, ageMin: 32, ageMax: 38 }), contract: 1, salary: Math.round(bestSalary * 1.05) }
    },
    {
      archetype: 'prospect',
      label: 'Joven promesa',
      risk: 'Menos media ahora, potencial brutal',
      player: { ...generatePlayer({ ovrMin: base - 2, ovrMax: base + 4, ageMin: 18, ageMax: 21 }), potential: Math.min(99, base + 18), contract: 3, salary: Math.round(bestSalary * 0.75) }
    },
    {
      archetype: 'media',
      label: 'Jugador mediático caro',
      risk: 'Sube fama, pero cobra muchísimo',
      player: { ...generatePlayer({ ovrMin: base + 3, ovrMax: base + 9, ageMin: 24, ageMax: 30 }), mediaStar: true, contract: 2, salary: Math.round(bestSalary * 1.45) }
    }
  ];
}

export function applyStarSigningRoulette(gloryState, choiceIndex = 0) {
  const choices = gloryState.starSigningChoices?.length ? gloryState.starSigningChoices : generateStarSigningChoices(gloryState);
  const choice = choices[Math.max(0, Math.min(choiceIndex, choices.length - 1))] || choices[0];
  const squad = (gloryState.squad || []).map(p => ({ ...p }));
  const worst = [...squad].sort((a, b) => (a.overall || 0) - (b.overall || 0))[0];
  const filtered = worst ? squad.filter(p => p.id !== worst.id && p.name !== worst.name) : squad;
  const signedPlayer = { ...choice.player, starSigningType: choice.archetype };

  return {
    ...gloryState,
    squad: [...filtered, signedPlayer],
    starSigningAvailable: false,
    starSigningUsedSeason: gloryState.season || 1,
    starSigningLast: { choice: choice.label, player: signedPlayer, replaced: worst || null },
    starSigningChoices: []
  };
}

/**
 * Generate rival teams for a division
 * Note: In Glory Mode, rivals use real teams from the game's Firestore data.
 * This function is a fallback for generating placeholder rivals if needed.
 */
export function generateRivalTeams(division, count = 19) {
  const div = GLORY_DIVISIONS.find(d => d.id === division) || GLORY_DIVISIONS[0];
  const baseOvr = 38 + (4 - div.tier) * 12;
  const teams = [];

  const RIVAL_NAMES = [
    'Atlético Portuense', 'CD Rayo del Sur', 'UD Montaña', 'CF Estrella Roja',
    'Sporting Maresme', 'FC Ribera', 'CD Bahía', 'Racing Nordeste',
    'UD Viento', 'SD Acero', 'CF Aurora', 'CD Tormenta',
    'UD Halcón', 'Sporting del Valle', 'CF Costa Brava', 'Racing de Hierro',
    'CD Centella', 'UD Tridente', 'SD Volcán', 'CF Marejada',
    'CD Relámpago', 'UD Fénix',
  ];

  for (let i = 0; i < count; i++) {
    const teamOvr = baseOvr + randInt(-6, 6);
    teams.push({
      id: `rival_${division}_${i}`,
      name: RIVAL_NAMES[i % RIVAL_NAMES.length],
      shortName: RIVAL_NAMES[i % RIVAL_NAMES.length].split(' ').pop().substring(0, 3).toUpperCase(),
      overall: teamOvr,
      players: generateSquad(teamOvr - 8, teamOvr + 8),
      colors: {
        primary: `hsl(${randInt(0, 360)}, ${randInt(50, 80)}%, ${randInt(35, 55)}%)`,
        secondary: `hsl(${randInt(0, 360)}, ${randInt(50, 80)}%, ${randInt(75, 90)}%)`,
      },
    });
  }
  return teams;
}

// ============================================================
// CARD SYSTEM
// ============================================================

/**
 * All glory cards — game-changing permanent upgrades
 * effect: function that modifies gloryState when applied
 */
export const GLORY_CARDS = [
  // TIER S — Game-breaking
  {
    id: 'perfect_clone',
    tier: 'S',
    name: 'Clon Perfecto',
    description: 'Duplica a tu mejor jugador. Dos versiones del mismo crack en tu plantilla.',
    icon: 'Dna',
    color: '#e040fb',
    apply: (state) => {
      const best = [...state.squad].sort((a, b) => b.overall - a.overall)[0];
      if (best) {
        const clone = { ...best, id: `glory_${_nextId++}`, name: best.name + ' II' };
        state.squad.push(clone);
      }
      return state;
    },
  },
  {
    id: 'ghost_sheikh',
    tier: 'S',
    name: 'Jeque Fantasma',
    description: 'Presupuesto x10 durante 2 temporadas. Al desaparecer, deja deuda, bajón de moral y bloqueo premium temporal.',
    icon: 'Landmark',
    color: '#ffd740',
    apply: (state) => {
      state.budget *= 10;
      state.sheikhSeasons = 2;
      state.sheikhDebtWarning = true;
      state.sheikhAuditRisk = (state.sheikhAuditRisk || 0) + 1;
      return state;
    },
  },
  {
    id: 'future_scout',
    tier: 'S',
    name: 'Ojeador del Futuro',
    description: 'Ves el potencial real y marcas 1 Diamante Oculto por temporada: +5 potencial y salario más fácil.',
    icon: 'Eye',
    color: '#448aff',
    apply: (state) => {
      state.perks.futureScout = true;
      state.futureScoutMarks = state.futureScoutMarks ?? 1;
      return state;
    },
  },
  {
    id: 'fountain_of_youth',
    tier: 'S',
    name: 'Fuente de la Juventud',
    description: 'Todos tus jugadores rejuvenecen 3 años. Permanente.',
    icon: 'Sparkles',
    color: '#69f0ae',
    apply: (state) => {
      state.squad.forEach(p => { p.age = Math.max(17, p.age - 3); });
      return state;
    },
  },
  {
    id: 'cursed_stadium',
    tier: 'S',
    name: 'Estadio Maldito',
    description: 'En casa siempre llueve. Tu equipo +20% rendimiento, rival -15%. Permanente.',
    icon: 'CloudRain',
    color: '#78909c',
    apply: (state) => {
      state.perks.cursedStadium = true;
      return state;
    },
  },
  {
    id: 'penalty_master',
    tier: 'S',
    name: 'Penalti Maestro',
    description: 'Nunca fallas penaltis. En eliminatorias empatadas ganas la tanda y en partidos igualados tienes +10% gol.',
    icon: 'Target',
    color: '#ff5252',
    apply: (state) => {
      state.perks.penaltyMaster = true;
      return state;
    },
  },

  // TIER A — Very strong
  {
    id: 'dr_miracles',
    tier: 'A',
    name: 'Dr. Milagros',
    description: 'Lesiones máximo 1 semana. Si curas una lesión grave, el jugador vuelve con +1 OVR y riesgo de recaída.',
    icon: 'HeartPulse',
    color: '#ef5350',
    apply: (state) => {
      state.perks.drMiracles = true;
      return state;
    },
  },
  {
    id: 'local_legend',
    tier: 'A',
    name: 'Leyenda Local',
    description: 'Tu mejor canterano gana +3 OVR por temporada en vez de +1.',
    icon: 'Crown',
    color: '#ffab40',
    apply: (state) => {
      state.perks.localLegend = true;
      return state;
    },
  },
  {
    id: 'legal_theft',
    tier: 'A',
    name: 'Robo Legal',
    description: 'Cada mercado puedes fichar 1 jugador de cualquier equipo al 50% de su valor.',
    icon: 'BadgeDollarSign',
    color: '#66bb6a',
    apply: (state) => {
      state.perks.legalTheft = true;
      return state;
    },
  },
  {
    id: 'tactical_wildcard',
    tier: 'A',
    name: 'Comodín Táctico',
    description: 'Desbloquea formaciones secretas (2-3-5, 3-1-3-3) con bonificaciones únicas.',
    icon: 'LayoutGrid',
    color: '#7c4dff',
    apply: (state) => {
      state.perks.tacticalWildcard = true;
      state.unlockedFormations = [...(state.unlockedFormations || []), '2-3-5', '3-1-3-3'];
      return state;
    },
  },
  {
    id: 'the_wall',
    tier: 'A',
    name: 'La Muralla',
    description: 'Portero +15 OVR. Si ya era élite, gana rasgo Imbatible y más porterías a cero en casa.',
    icon: 'ShieldHalf',
    color: '#42a5f5',
    apply: (state) => {
      const gk = state.squad.find(p => p.position === 'GK');
      if (gk) {
        if ((gk.overall || 0) >= 80) {
          gk.traits = [...new Set([...(gk.traits || []), 'Imbatible'])];
          state.perks.imbatibleKeeper = true;
        }
        gk.overall = Math.min(99, gk.overall + 15);
        gk.goalkeeping = Math.min(99, gk.goalkeeping + 15);
      }
      return state;
    },
  },
  {
    id: 'max_speed',
    tier: 'A',
    name: 'Velocidad Máxima',
    description: 'Todos los delanteros +10 velocidad, pero -5 defensa. Imparables al contraataque.',
    icon: 'Zap',
    color: '#ffee58',
    apply: (state) => {
      state.squad.filter(p => ['ST', 'LW', 'RW'].includes(p.position)).forEach(p => {
        p.speed = Math.min(99, p.speed + 10);
        p.defense = Math.max(1, p.defense - 5);
      });
      return state;
    },
  },

  // TIER B — Situational
  {
    id: 'diplomat',
    tier: 'B',
    name: 'Diplomático',
    description: 'Elige un jugador y renuévale +3 años de contrato. Un solo uso.',
    icon: 'Handshake',
    color: '#26c6da',
    usable: true,
    apply: (state) => {
      state.perks.diplomat = true;
      state.perks.diplomatUsed = false;
      return state;
    },
  },
  {
    id: 'fame',
    tier: 'B',
    name: 'Fama',
    description: 'Sponsors x2 y más jugadores aceptan venir, pero los nuevos contratos piden +10% salario.',
    icon: 'Megaphone',
    color: '#ffa726',
    apply: (state) => {
      state.perks.fame = true;
      state.perks.fameWagePressure = true;
      state.sponsorMultiplier = (state.sponsorMultiplier || 1) * 2;
      return state;
    },
  },
  {
    id: 'golden_academy',
    tier: 'B',
    name: 'Academia de Oro',
    description: 'Cada temporada aparece un canterano con 70+ OVR. Talento puro.',
    icon: 'GraduationCap',
    color: '#ffd54f',
    apply: (state) => {
      state.perks.goldenAcademy = true;
      return state;
    },
  },
  {
    id: 'second_chance',
    tier: 'B',
    name: 'Segunda Oportunidad',
    description: 'Si pierdes un partido, puedes rejugarlo 1 vez por temporada.',
    icon: 'RotateCcw',
    color: '#ab47bc',
    apply: (state) => {
      state.perks.secondChance = true;
      state.replaysLeft = 1;
      return state;
    },
  },
  {
    id: 'wild_card',
    tier: 'B',
    name: 'Wild Card',
    description: 'Al inicio de cada mercado, recibes un jugador aleatorio. Puede ser crack o desastre.',
    icon: 'Shuffle',
    color: '#ec407a',
    apply: (state) => {
      state.perks.wildCard = true;
      // Generate first player immediately
      const isLucky = Math.random() < 0.3;
      const player = generatePlayer({ ovrMin: isLucky ? 72 : 40, ovrMax: isLucky ? 85 : 55 });
      state.squad = [...state.squad, player];
      state.wildCardPlayers = [...(state.wildCardPlayers || []), { ...player, season: state.season || 1 }];
      return state;
    },
  },
  // === NEW CARDS ===
  {
    id: 'black_market',
    tier: 'S',
    name: 'Mercado Negro',
    description: 'Accedes a una lista secreta de 5 leyendas retiradas (85-95 OVR). Tienes 30 segundos para elegir una. Gratis.',
    icon: 'Skull',
    color: '#b71c1c',
    apply: (state) => {
      state.perks.blackMarket = true;
      // Generate 5 legendary retired players — actual selection happens in BlackMarketModal
      state.blackMarketPlayers = Array.from({ length: 5 }, () =>
        generatePlayer({ ovrMin: 85, ovrMax: 95, ageMin: 33, ageMax: 38 })
      );
      state.blackMarketUsed = false;
      return state;
    },
  },
  {
    id: 'double_or_nothing',
    tier: 'A',
    name: 'Doble o Nada',
    description: 'Antes de cada partido apuestas 10%, 25% o 50%. Ganas: duplicas. Empatas: recuperas mitad. Pierdes: pierdes todo.',
    icon: 'Coins',
    color: '#ff9800',
    apply: (state) => {
      state.perks.doubleOrNothing = true;
      return state;
    },
  },
  {
    id: 'achilles_heel',
    tier: 'A',
    name: 'Talón de Aquiles',
    description: 'Antes de un partido, puedes lesionar a un jugador del equipo rival para que no juegue.',
    icon: 'Crosshair',
    color: '#e53935',
    apply: (state) => {
      state.perks.achillesHeel = true;
      return state;
    },
  },
  {
    id: 'forced_swap',
    tier: 'A',
    name: 'Intercambio Forzoso',
    description: 'Una sola vez: intercambia un jugador tuyo por uno rival de media similar. Sin dinero.',
    icon: 'ArrowLeftRight',
    color: '#7c4dff',
    apply: (state) => {
      state.perks.forcedSwap = true;
      state.forcedSwapUsed = false;
      return state;
    },
  },
  {
    id: 'secret_clause',
    tier: 'B',
    name: 'Cláusula Secreta',
    description: 'Fichajes: +2 años y -30% salario, pero con cláusula baja que puede tentar a clubes grandes.',
    icon: 'FileText',
    color: '#26a69a',
    apply: (state) => {
      state.perks.secretClause = true;
      return state;
    },
  },
  {
    id: 'goal_bonus',
    tier: 'B',
    name: 'Lluvia de Millones',
    description: 'Cada gol que metes te da 50.000€ de bonus. Las goleadas son muy rentables.',
    icon: 'Banknote',
    color: '#4caf50',
    apply: (state) => {
      state.perks.goalBonus = true;
      return state;
    },
  },
  {
    id: 'gladiator',
    tier: 'B',
    name: 'Gladiador',
    description: 'Tus jugadores nunca reciben tarjetas rojas. Inmunidad total.',
    icon: 'Swords',
    color: '#ff5722',
    apply: (state) => {
      state.perks.gladiator = true;
      return state;
    },
  },
  {
    id: 'star_signing',
    tier: 'A',
    name: 'Fichaje Estrella',
    description: 'Ruleta de ascenso: elige entre veterano estrella, joven promesa o jugador mediático caro. Sale el peor de tu plantilla.',
    icon: 'UserPlus',
    color: '#ffab00',
    apply: (state) => {
      state.perks.starSigning = true;
      state.starSigningAvailable = true;
      state.starSigningChoices = generateStarSigningChoices(state);
      return state;
    },
  },
];


export const GLORY_COMBOS = [
  {
    id: 'fortaleza_maldita',
    name: 'Fortaleza Maldita',
    cards: ['cursed_stadium', 'the_wall', 'gladiator', 'dr_miracles'],
    min: 3,
    bonus: 'Fortín: en casa +10 moral extra, menos lesiones y más porterías a cero.',
    color: '#78909c'
  },
  {
    id: 'cantera_infinita',
    name: 'Cantera Infinita',
    cards: ['golden_academy', 'local_legend', 'fountain_of_youth', 'future_scout'],
    min: 3,
    bonus: 'Cada 3 temporadas aparece El Niño Maravilla, canterano 75-85 OVR con potencial 95.',
    color: '#69f0ae'
  },
  {
    id: 'club_casino',
    name: 'Club Casino',
    cards: ['ghost_sheikh', 'double_or_nothing', 'fame', 'goal_bonus'],
    min: 3,
    bonus: 'Las apuestas ganadas encadenadas inflan la burbuja; perder dos seguidas activa investigación fiscal.',
    color: '#ff9800'
  },
  {
    id: 'ataque_suicida',
    name: 'Ataque Suicida',
    cards: ['max_speed', 'tactical_wildcard', 'goal_bonus', 'penalty_master'],
    min: 3,
    bonus: 'Goleadas más rentables: +25.000€ extra por gol si juegas ofensivo, pero defensa expuesta.',
    color: '#ffee58'
  },
  {
    id: 'mercado_criminal',
    name: 'Mercado Criminal',
    cards: ['black_market', 'legal_theft', 'forced_swap', 'secret_clause'],
    min: 3,
    bonus: 'Red de contactos: operaciones especiales más baratas, con riesgo de sanción si abusas.',
    color: '#b71c1c'
  },
  {
    id: 'proyecto_frankenstein',
    name: 'Proyecto Frankenstein',
    cards: ['perfect_clone', 'fountain_of_youth', 'future_scout', 'wild_card'],
    min: 3,
    bonus: 'Los clones jóvenes pueden salir con personalidad mutante: más potencial o más salario.',
    color: '#e040fb'
  }
];

export function getActiveGloryCombos(pickedCards = []) {
  const picked = new Set(pickedCards || []);
  return GLORY_COMBOS.map(combo => {
    const owned = combo.cards.filter(id => picked.has(id));
    return { ...combo, owned, count: owned.length, active: owned.length >= combo.min };
  });
}

export function hasGloryCombo(gloryState, comboId) {
  return getActiveGloryCombos(gloryState?.pickedCards || []).some(c => c.id === comboId && c.active);
}

/**
 * Get 3 random cards for selection, avoiding already-picked ones
 */
export function drawCards(pickedCardIds = [], count = 3, unlockedCardIds = null) {
  let available = GLORY_CARDS.filter(c => !pickedCardIds.includes(c.id));
  // If unlocked list provided, only show unlocked cards
  if (unlockedCardIds) {
    available = available.filter(c => unlockedCardIds.includes(c.id));
  }
  const shuffled = [...available].sort(() => Math.random() - 0.5);

  // Guarantee at least one S-tier if available
  const sTier = shuffled.filter(c => c.tier === 'S');
  const others = shuffled.filter(c => c.tier !== 'S');

  const result = [];
  if (sTier.length > 0 && Math.random() < 0.4) {
    result.push(sTier[0]);
    others.slice(0, count - 1).forEach(c => result.push(c));
  } else {
    shuffled.slice(0, count).forEach(c => result.push(c));
  }

  return result.slice(0, count);
}

/**
 * Apply a card to glory state
 */
export function applyCard(gloryState, cardId) {
  const card = GLORY_CARDS.find(c => c.id === cardId);
  if (!card) return gloryState;

  // Deep clone to prevent React state mutation
  const newState = {
    ...gloryState,
    perks: { ...gloryState.perks },
    squad: (gloryState.squad || []).map(p => ({ ...p })),
  };
  card.apply(newState);
  newState.pickedCards = [...(newState.pickedCards || []), cardId];
  return newState;
}

// ============================================================
// RANDOM EVENTS
// ============================================================

export const GLORY_EVENTS = [
  {
    id: 'mystery_investor',
    title: 'Inversor Misterioso',
    description: 'Un empresario desconocido ofrece 500.000€... pero quiere a tu mejor jugador a cambio.',
    icon: 'CircleDollarSign',
    optionA: { label: 'Aceptar el dinero', effect: (s) => { const best = [...s.squad].sort((a,b) => b.overall - a.overall)[0]; return { ...s, budget: s.budget + 500000, squad: best ? s.squad.filter(p => p.id !== best.id && p.name !== best.name) : s.squad }; }},
    optionB: { label: 'Rechazar', effect: (s) => s },
  },
  {
    id: 'federation_probe',
    title: 'Investigación de la Federación',
    description: 'La federación investiga irregularidades en tu club. Debes actuar.',
    icon: 'Scale',
    optionA: { label: 'Pagar 200.000€ de multa', effect: (s) => ({ ...s, budget: s.budget - 200000 }) },
    optionB: { label: 'Asumir -3 puntos', effect: (s) => ({ ...s, pointsPenalty: (s.pointsPenalty || 0) + 3 }) },
  },
  {
    id: 'youth_loan',
    title: 'Canterano Ambicioso',
    description: 'Tu mejor joven quiere salir cedido para crecer. Si lo dejas, vuelve con +5 OVR.',
    icon: 'UserPlus',
    optionA: { label: 'Dejar que se vaya', effect: (s) => { const young = [...s.squad].filter(p => p.age <= 21).sort((a,b) => (b.potential||0) - (a.potential||0))[0]; if (!young) return s; return { ...s, squad: s.squad.map(p => p.name === young.name ? { ...p, overall: Math.min(99, p.overall + 5), loanedOut: true } : p) }; }},
    optionB: { label: 'Retenerlo', effect: (s) => { const young = [...s.squad].filter(p => p.age <= 21).sort((a,b) => (b.potential||0) - (a.potential||0))[0]; if (!young) return s; return { ...s, squad: s.squad.map(p => p.name === young.name ? { ...p, morale: (p.morale || 70) - 20 } : p) }; }},
  },
  {
    id: 'naming_rights',
    title: 'Naming Rights',
    description: '"Patatas Lozano" ofrece 150.000€/año por ponerle su nombre a tu estadio.',
    icon: 'Building2',
    optionA: { label: 'Aceptar (Estadio Patatas Lozano)', effect: (s) => ({ ...s, budget: s.budget + 150000, stadiumName: 'Estadio Patatas Lozano' }) },
    optionB: { label: 'Mantener el nombre', effect: (s) => s },
  },
  {
    id: 'rival_collapse',
    title: 'Rival en Crisis',
    description: 'Un rival directo tiene problemas económicos. Su estrella está disponible por la mitad.',
    icon: 'TrendingDown',
    optionA: { label: 'Fichar al jugador (mitad de precio)', effect: (s) => { const div = GLORY_DIVISIONS.find(d => d.id === s.division); const ovr = 50 + (4 - (div?.tier || 4)) * 12 + randInt(5, 12); const p = generatePlayer({ ovrMin: ovr, ovrMax: ovr + 5, ageMin: 23, ageMax: 28 }); return { ...s, budget: s.budget - Math.round(p.salary * 1.5), squad: [...s.squad, p] }; }},
    optionB: { label: 'No intervenir', effect: (s) => s },
  },
  {
    id: 'stadium_fire',
    title: 'Incendio en el Estadio',
    description: 'Un incendio daña una grada. Pierdes aforo o pagas la reparación.',
    icon: 'Flame',
    optionA: { label: 'Reparar (300.000€)', effect: (s) => ({ ...s, budget: s.budget - 300000 }) },
    optionB: { label: 'Jugar con grada cerrada (-2000 aforo)', effect: (s) => ({ ...s, stadiumCapacity: Math.max(1000, (s.stadiumCapacity || 3000) - 2000) }) },
  },
];

/**
 * Pick a random event
 */
export function drawEvent(usedEventIds = []) {
  const available = GLORY_EVENTS.filter(e => !usedEventIds.includes(e.id));
  if (available.length === 0) return null;
  return pickRandom(available);
}

// ============================================================
// GLORY STATE MANAGEMENT
// ============================================================

/**
 * Create initial glory mode state
 */
export function createGloryState({ teamName, stadiumName, badge, kit, managerName }) {
  const division = GLORY_DIVISIONS[0]; // Segunda RFEF
  const squad = getGlorySquad(); // Fixed 20 fictional players

  return {
    mode: 'glory',
    teamName: teamName || 'FC Gloria',
    stadiumName: stadiumName || 'Estadio Municipal',
    badge: badge || { shape: 'shield', color1: '#1a237e', color2: '#ffd740', icon: 'star' },
    kit: kit || { style: 'solid', primary: '#1a237e', secondary: '#ffd740' },
    managerName: managerName || 'Manager',
    division: division.id,
    divisionTier: division.tier,
    season: 1,
    week: 1,
    squad,
    budget: division.budget,
    stadiumCapacity: division.stadiumCap,
    sponsorMultiplier: 1,
    pickedCards: [],
    perks: {},
    unlockedFormations: [],
    usedEventIds: [],
    pointsPenalty: 0,
    replaysLeft: 0,
    sheikhSeasons: 0,
    trophies: [],
    history: [],
    championsWon: false,
  };
}

/**
 * Process end-of-season: check promotion, prepare next season
 */
export function processSeasonEnd(gloryState, leaguePosition) {
  const divIndex = GLORY_DIVISIONS.findIndex(d => d.id === gloryState.division);
  const promoted = leaguePosition <= 2;

  // Deep clone squad to avoid mutation
  let squad = (gloryState.squad || []).map(p => ({ ...p }));
  let budget = gloryState.budget || 0;
  let division = gloryState.division;
  let divisionTier = gloryState.divisionTier;
  let stadiumCapacity = gloryState.stadiumCapacity || 3000;
  let sheikhSeasons = gloryState.sheikhSeasons || 0;
  const trophies = [...(gloryState.trophies || [])];

  const history = [...(gloryState.history || []), {
    season: gloryState.season,
    division: gloryState.division,
    position: leaguePosition,
    promoted,
    cards: [...(gloryState.pickedCards || [])],
  }];

  if (promoted && divIndex < GLORY_DIVISIONS.length - 1) {
    const nextDiv = GLORY_DIVISIONS[divIndex + 1];
    division = nextDiv.id;
    divisionTier = nextDiv.tier;
    // NOTE: the promotion cash grant is applied ONCE by the caller via
    // calculateGlorySeasonFinancials() -> START_NEW_SEASON moneyChange. We do
    // NOT add nextDiv.budget here anymore — doing so double-counted the grant
    // (this mutation is synced to state.money via budgetDiff in SeasonEnd) and
    // made small clubs balloon. Only stadium upgrade carries over on promotion.
    stadiumCapacity = Math.max(stadiumCapacity, nextDiv.stadiumCap);
  } else if (promoted && divIndex === GLORY_DIVISIONS.length - 1) {
    trophies.push({ type: 'league', season: gloryState.season, division: gloryState.division });
  }

  // Sheikh bonus expiry: huge short-term boost, painful long-term consequences
  if (sheikhSeasons > 0) {
    sheikhSeasons--;
    if (sheikhSeasons === 0) {
      budget = Math.round(budget / 5);
      squad = squad.map(p => ({ ...p, morale: Math.max(35, (p.morale || 70) - 12) }));
    }
  }

  // Golden academy perk
  if (gloryState.perks?.goldenAcademy) {
    squad = [...squad, generatePlayer({ ovrMin: 65, ovrMax: 75, ageMin: 17, ageMax: 19 })];
  }

  // Cantera Infinita combo: every 3 seasons, generate El Niño Maravilla
  let wonderkids = [...(gloryState.wonderkids || [])];
  if (hasGloryCombo(gloryState, 'cantera_infinita') && ((gloryState.season || 1) % 3 === 0)) {
    const wonderkid = { ...generatePlayer({ ovrMin: 75, ovrMax: 85, ageMin: 16, ageMax: 18 }), potential: 95, nickname: 'El Niño Maravilla' };
    squad = [...squad, wonderkid];
    wonderkids = [...wonderkids, { ...wonderkid, season: (gloryState.season || 1) + 1 }];
  }

  // Wild card perk
  let wildCardPlayers = [...(gloryState.wildCardPlayers || [])];
  if (gloryState.perks?.wildCard) {
    const isLucky = Math.random() < 0.3;
    const wildPlayer = generatePlayer({ ovrMin: isLucky ? 72 : 40, ovrMax: isLucky ? 85 : 55 });
    squad = [...squad, wildPlayer];
    wildCardPlayers = [...wildCardPlayers, { ...wildPlayer, season: (gloryState.season || 1) + 1 }];
  }

  // Return loaned players (aging handled by START_NEW_SEASON in GameContext)
  squad = squad.map(p => ({ ...p, loanedOut: false }));

  // Local legend boost
  if (gloryState.perks?.localLegend) {
    const youngest = [...squad].filter(p => p.age <= 23).sort((a, b) => (b.potential||0) - (a.potential||0))[0];
    if (youngest) {
      squad = squad.map(p => p.name === youngest.name ? { ...p, overall: Math.min(99, p.overall + 3) } : p);
    }
  }

  const starSigningAvailable = !!(gloryState.perks?.starSigning && promoted);

  return {
    ...gloryState,
    history,
    trophies,
    division,
    divisionTier,
    budget,
    stadiumCapacity,
    sheikhSeasons,
    squad,
    wildCardPlayers,
    wonderkids,
    starSigningAvailable,
    starSigningChoices: starSigningAvailable ? generateStarSigningChoices({ ...gloryState, squad, divisionTier }) : (gloryState.starSigningChoices || []),
    replaysLeft: gloryState.perks?.secondChance ? 1 : 0,
    pointsPenalty: 0,
    season: (gloryState.season || 1) + 1,
    week: 1,
  };
}
