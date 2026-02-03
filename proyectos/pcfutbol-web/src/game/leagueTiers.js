// ============================================================
// LEAGUE TIERS v2 - Sistema de escalado económico de 5 niveles
// ============================================================
// Tier 1: Elite (Las 5 grandes)
// Tier 2: Major (Segundas divisiones principales)
// Tier 3: Standard (Ligas medianas europeas)
// Tier 4: Lower (Primera RFEF)
// Tier 5: Amateur (Segunda RFEF)
// ============================================================

/**
 * Multiplicadores económicos por tier (v2).
 * Tier 1 es la base (x1.0), el resto escala con saltos graduales.
 * 
 * Ratios de salto: T1→T2: -50%, T2→T3: -56%, T3→T4: -64%, T4→T5: -62%
 * 
 * Ejemplo con jugador 75 OVR:
 *   Tier 1: ~€30K/sem (~€1.5M/año) - LaLiga/Premier
 *   Tier 2: ~€15K/sem (~€780K/año) - Segunda/Championship  
 *   Tier 3: ~€6.6K/sem (~€340K/año) - Eredivisie/Liga Portugal
 *   Tier 4: ~€2.4K/sem (~€125K/año) - Primera RFEF
 *   Tier 5: ~€900/sem (~€47K/año) - Segunda RFEF
 */
const TIER_CONFIG = {
  1: { name: 'Elite', multiplier: 1.00 },
  2: { name: 'Major', multiplier: 0.50 },
  3: { name: 'Standard', multiplier: 0.22 },
  4: { name: 'Lower', multiplier: 0.08 },
  5: { name: 'Amateur', multiplier: 0.03 },
};

/**
 * Mapa de leagueId → tier info
 * Cada entrada contiene: { tier, name (del tier), multiplier }
 */
export const LEAGUE_TIERS = {
  // === Tier 1: Elite - Las 5 grandes ligas ===
  laliga:           { tier: 1, ...TIER_CONFIG[1] },
  premierLeague:    { tier: 1, ...TIER_CONFIG[1] },
  serieA:           { tier: 1, ...TIER_CONFIG[1] },
  bundesliga:       { tier: 1, ...TIER_CONFIG[1] },
  ligue1:           { tier: 1, ...TIER_CONFIG[1] },

  // === Tier 2: Major - Segundas divisiones principales ===
  segunda:              { tier: 2, ...TIER_CONFIG[2] },
  championship:         { tier: 2, ...TIER_CONFIG[2] },
  serieB:               { tier: 2, ...TIER_CONFIG[2] },
  bundesliga2:          { tier: 2, ...TIER_CONFIG[2] },
  ligue2:               { tier: 2, ...TIER_CONFIG[2] },

  // === Tier 3: Standard - Ligas medianas europeas ===
  eredivisie:           { tier: 3, ...TIER_CONFIG[3] },
  primeiraLiga:         { tier: 3, ...TIER_CONFIG[3] },
  belgianPro:           { tier: 3, ...TIER_CONFIG[3] },
  superLig:             { tier: 3, ...TIER_CONFIG[3] },
  scottishPrem:         { tier: 3, ...TIER_CONFIG[3] },
  swissSuperLeague:     { tier: 3, ...TIER_CONFIG[3] },
  austrianBundesliga:   { tier: 3, ...TIER_CONFIG[3] },
  greekSuperLeague:     { tier: 3, ...TIER_CONFIG[3] },
  danishSuperliga:      { tier: 3, ...TIER_CONFIG[3] },
  croatianLeague:       { tier: 3, ...TIER_CONFIG[3] },
  czechLeague:          { tier: 3, ...TIER_CONFIG[3] },

  // === Tier 2: Major - South American top leagues ===
  // salaryMult: overrides salary calculation (SA players have high OVR but much lower wages than Europe)
  argentinaPrimera:     { tier: 2, ...TIER_CONFIG[2], salaryMult: 0.18 },
  brasileiraoA:         { tier: 2, ...TIER_CONFIG[2], salaryMult: 0.22 },

  // === Tier 3: Standard - South American mid leagues ===
  colombiaPrimera:      { tier: 3, ...TIER_CONFIG[3], salaryMult: 0.07 },
  chilePrimera:         { tier: 3, ...TIER_CONFIG[3], salaryMult: 0.07 },
  uruguayPrimera:       { tier: 3, ...TIER_CONFIG[3], salaryMult: 0.07 },
  ecuadorLigaPro:       { tier: 3, ...TIER_CONFIG[3], salaryMult: 0.07 },

  // === Tier 4: Lower - Primera RFEF + SA lower leagues ===
  primeraRFEF:          { tier: 4, ...TIER_CONFIG[4] },
  paraguayPrimera:      { tier: 4, ...TIER_CONFIG[4], salaryMult: 0.025 },
  peruLiga1:            { tier: 4, ...TIER_CONFIG[4], salaryMult: 0.025 },
  boliviaPrimera:       { tier: 4, ...TIER_CONFIG[4], salaryMult: 0.025 },
  venezuelaPrimera:     { tier: 4, ...TIER_CONFIG[4], salaryMult: 0.025 },

  // === Rest of World ===
  saudiPro:             { tier: 2, ...TIER_CONFIG[2], salaryMult: 0.25 },
  ligaMX:               { tier: 2, ...TIER_CONFIG[2], salaryMult: 0.06 },
  mls:                  { tier: 3, ...TIER_CONFIG[3], salaryMult: 0.08 },
  jLeague:              { tier: 3, ...TIER_CONFIG[3], salaryMult: 0.04 },

  // === Tier 5: Amateur - Segunda RFEF ===
  segundaRFEF:  { tier: 5, ...TIER_CONFIG[5] },
};

/**
 * Temporadas mínimas extra que necesita un equipo para GANAR la Champions/Libertadores,
 * respecto a un equipo que ya está en ella (ej: Madrid = 0).
 * 
 * Lógica:
 * - Ya compites en Champions/Libertadores → 0 (nunca aplica en contrarreloj)
 * - Liga top pero necesitas clasificarte (top 4) → 1
 * - 2ª división: ascender + clasificarte → 2
 * - 3ª división: ascender + ascender + clasificarte → 3
 * - 4ª división: ascender×3 + clasificarte → 4
 * 
 * Score ranking = temporadas_jugadas - bonus
 */
export const PROMOTIONS_TO_CHAMPIONS = {
  // España
  laliga: 1,          // Necesitas clasificarte (top 4)
  segunda: 2,         // Ascender + clasificarte
  primeraRFEF: 3,     // Ascender + ascender + clasificarte
  segundaRFEF: 4,     // Ascender×3 + clasificarte
  // Inglaterra
  premierLeague: 1,
  championship: 2,
  // Italia
  serieA: 1,
  serieB: 2,
  // Alemania
  bundesliga: 1,
  bundesliga2: 2,
  // Francia
  ligue1: 1,
  ligue2: 2,
  // Ligas europeas top (primera división, necesitan clasificarse)
  eredivisie: 1,
  primeiraLiga: 1,
  belgianPro: 1,
  superLig: 1,
  scottishPrem: 1,
  swissSuperLeague: 1,
  austrianBundesliga: 1,
  greekSuperLeague: 1,
  danishSuperliga: 1,
  croatianLeague: 1,
  czechLeague: 1,
  // Sudamérica (primera división, necesitan clasificarse a Libertadores)
  argentinaPrimera: 1,
  brasileiraoA: 1,
  colombiaPrimera: 1,
  chilePrimera: 1,
  uruguayPrimera: 1,
  ecuadorLigaPro: 1,
  paraguayPrimera: 1,
  peruLiga1: 1,
  boliviaPrimera: 1,
  venezuelaPrimera: 1,
};

export function getPromotionsToChampions(leagueId) {
  return PROMOTIONS_TO_CHAMPIONS[leagueId] ?? 1;
}

/**
 * Devuelve el tier (1-5) de una liga.
 * Default: Tier 3 (conservador para ligas desconocidas)
 * 
 * @param {string} leagueId - ID de la liga (ej: 'laliga', 'primeraRFEF')
 * @returns {number} Tier de 1 a 5
 */
export function getLeagueTier(leagueId) {
  return LEAGUE_TIERS[leagueId]?.tier ?? 3;
}

/**
 * Devuelve el multiplicador económico de una liga.
 * 
 * @param {string} leagueId - ID de la liga
 * @returns {number} Multiplicador (1.0 para Tier 1, 0.03 para Tier 5)
 */
export function getEconomyMultiplier(leagueId) {
  return LEAGUE_TIERS[leagueId]?.multiplier ?? TIER_CONFIG[3].multiplier;
}

/**
 * Devuelve el multiplicador de SALARIO de una liga.
 * Usa salaryMult si existe (para ligas SA con overalls altos pero salarios bajos),
 * o cae al multiplier estándar del tier.
 * 
 * @param {string} leagueId - ID de la liga
 * @returns {number} Multiplicador de salario
 */
export function getSalaryMultiplier(leagueId) {
  const entry = LEAGUE_TIERS[leagueId];
  if (!entry) return TIER_CONFIG[3].multiplier;
  return entry.salaryMult ?? entry.multiplier;
}

/**
 * Devuelve multiplicador para costes de instalaciones.
 * MÁS agresivo que economy multiplier para que las mejoras sean alcanzables en ligas bajas.
 * 
 * @param {string} leagueId - ID de la liga
 * @returns {number} Multiplicador de coste (1.0 para T1, 0.06 para T5)
 */
export function getFacilityCostMultiplier(leagueId) {
  const tier = getLeagueTier(leagueId);
  const multipliers = {
    1: 1.0,    // Tier 1: coste base
    2: 0.55,   // Tier 2: -45%
    3: 0.30,   // Tier 3: -70%
    4: 0.12,   // Tier 4: -88%
    5: 0.06,   // Tier 5: -94%
  };
  return multipliers[tier] ?? multipliers[3];
}

/**
 * Devuelve multiplicador de valor de mercado/transfer.
 * Controla cuánto valen los jugadores en cada liga.
 * 
 * @param {string} leagueId - ID de la liga
 * @returns {number} Multiplicador de valor (1.0 para T1, 0.04 para T5)
 */
export function getTransferValueMultiplier(leagueId) {
  const tier = getLeagueTier(leagueId);
  const multipliers = {
    1: 1.0,    // Tier 1: valores base
    2: 0.55,   // Tier 2: -45%
    3: 0.28,   // Tier 3: -72%
    4: 0.10,   // Tier 4: -90%
    5: 0.04,   // Tier 5: -96%
  };
  return multipliers[tier] ?? multipliers[3];
}

/**
 * Calcula el máximo salto de tier que un equipo comprador haría
 * según la edad del jugador objetivo.
 * 
 * ≤24: hasta 2 tiers arriba (talento joven, scouting)
 * 25-28: hasta 1 tier arriba (plenitud probada)
 * 29-30: mismo tier o 1 arriba solo si rendimiento excepcional
 * 31+: mismo tier o inferior (nadie invierte en +31 de liga inferior)
 * 
 * @param {number} age - Edad del jugador
 * @param {boolean} exceptional - Rendimiento excepcional (performanceMult > 1.5)
 * @returns {number} Máximo salto de tier hacia arriba permitido
 */
export function getMaxTierJumpByAge(age, exceptional = false) {
  if (age <= 24) return 2;
  if (age <= 28) return 1;
  if (age <= 30) return exceptional ? 1 : 0;
  return 0; // 31+: solo mismo tier o inferior
}

/**
 * Calcula el rendimiento de un jugador basado en su posición y stats.
 * Cada posición tiene métricas diferentes.
 * 
 * @param {object} player - { position, ... }
 * @param {object} stats - { goals, assists, cleanSheets, matchesPlayed }
 * @returns {number} Multiplicador de rendimiento (1.0 = normal, >1.0 = destacado)
 */
export function getPositionPerformanceMultiplier(player, stats) {
  if (!stats || !stats.matchesPlayed) return 1.0;
  
  const pos = player.position || 'CM';
  const goals = stats.goals || 0;
  const assists = stats.assists || 0;
  const cleanSheets = stats.cleanSheets || 0;
  
  // Atacantes: goles son la métrica principal
  if (['ST', 'CF'].includes(pos)) {
    return 1 + (goals * 0.15) + (assists * 0.05);
  }
  // Extremos: goles + asistencias equilibrados
  if (['RW', 'LW', 'RM', 'LM'].includes(pos)) {
    return 1 + (goals * 0.12) + (assists * 0.10);
  }
  // Mediapuntas/centrocampistas ofensivos
  if (['CAM'].includes(pos)) {
    return 1 + (goals * 0.10) + (assists * 0.12);
  }
  // Centrocampistas: asistencias + goles
  if (['CM'].includes(pos)) {
    return 1 + (goals * 0.08) + (assists * 0.12);
  }
  // Pivotes: asistencias + porterías a cero
  if (['CDM'].includes(pos)) {
    return 1 + (assists * 0.10) + (cleanSheets * 0.10) + (goals * 0.06);
  }
  // Defensas: porterías a cero son la métrica principal
  if (['CB', 'RB', 'LB', 'RWB', 'LWB'].includes(pos)) {
    return 1 + (cleanSheets * 0.15) + (goals * 0.08);
  }
  // Portero: porterías a cero dominan
  if (pos === 'GK') {
    return 1 + (cleanSheets * 0.20);
  }
  
  return 1.0;
}

// ============================================================
// LEAGUE DISPLAY NAMES — Nombre legible para cada leagueId
// ============================================================
export const LEAGUE_NAMES = {
  laliga: 'LaLiga',
  segunda: 'Segunda División',
  primeraRFEF: 'Primera RFEF',
  segundaRFEF: 'Segunda RFEF',
  premierLeague: 'Premier League',
  championship: 'Championship',
  serieA: 'Serie A',
  serieB: 'Serie B',
  bundesliga: 'Bundesliga',
  bundesliga2: '2. Bundesliga',
  ligue1: 'Ligue 1',
  ligue2: 'Ligue 2',
  eredivisie: 'Eredivisie',
  primeiraLiga: 'Liga Portugal',
  belgianPro: 'Pro League',
  superLig: 'Süper Lig',
  scottishPrem: 'Scottish Premiership',
  swissSuperLeague: 'Super League',
  austrianBundesliga: 'Bundesliga (AT)',
  greekSuperLeague: 'Super League (GR)',
  danishSuperliga: 'Superligaen',
  croatianLeague: 'HNL',
  czechLeague: 'Fortuna Liga',
  argentinaPrimera: 'Liga Profesional',
  brasileiraoA: 'Brasileirão',
  colombiaPrimera: 'Liga BetPlay',
  chilePrimera: 'Primera División (CL)',
  uruguayPrimera: 'Primera División (UY)',
  ecuadorLigaPro: 'LigaPro',
  paraguayPrimera: 'Primera División (PY)',
  peruLiga1: 'Liga 1',
  boliviaPrimera: 'División Profesional',
  venezuelaPrimera: 'Liga FUTVE',
  mls: 'MLS',
  saudiProLeague: 'Saudi Pro League',
  ligaMX: 'Liga MX',
  jLeague: 'J1 League',
};

export function getLeagueName(leagueId) {
  return LEAGUE_NAMES[leagueId] || leagueId || 'Liga';
}