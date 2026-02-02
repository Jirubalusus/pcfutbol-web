// ============================================================
// SALARY GENERATOR
// Genera salarios semanales realistas basados en overall + edad
// Escalado por tier de liga para balance económico
// ============================================================

import { getEconomyMultiplier, getSalaryMultiplier } from './leagueTiers';

// Hash determinista basado en nombre del jugador
function nameHash(name) {
  let h = 0;
  for (let i = 0; i < (name || '').length; i++) {
    h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * Genera salario SEMANAL realista para un jugador
 * 
 * Curva exponencial: cada 5 OVR ≈ x2 salario
 * El tier/leagueId escala el resultado con el multiplicador económico.
 * 
 * Ejemplos (Tier 1 - LaLiga/Premier):
 *   60 OVR → ~€4K/sem (€200K/año)
 *   65 OVR → ~€8K/sem (€400K/año)
 *   70 OVR → ~€15K/sem (€800K/año)
 *   75 OVR → ~€30K/sem (€1.5M/año)
 *   80 OVR → ~€60K/sem (€3.1M/año)
 *   85 OVR → ~€120K/sem (€6.2M/año)
 *   90 OVR → ~€250K/sem (€13M/año)
 * 
 * Ejemplos (Argentina, x0.18):
 *   70 OVR → ~€2.9K/sem (~€150K/año)
 *   75 OVR → ~€5.8K/sem (~€300K/año)
 *   80 OVR → ~€12K/sem (~€600K/año)
 *   85 OVR → ~€23K/sem (~€1.2M/año)
 * 
 * @param {object} player - { overall, age, name, potential }
 * @param {number|string} leagueTierOrId - Tier (1-5) o leagueId string
 * @returns {number} Salario semanal en €
 */
export function generateSalary(player, leagueTierOrId = 1) {
  const ovr = player.overall || 65;
  const age = player.age || 25;
  
  // Base exponencial por overall
  const baseSalary = 2000 * Math.pow(2, (ovr - 55) / 5);
  
  // Modificador por edad
  let ageMod = 1.0;
  if (age <= 21) ageMod = 0.7;       // Joven promesa, contrato bajo
  else if (age <= 23) ageMod = 0.85;  // En desarrollo
  else if (age <= 29) ageMod = 1.0;   // Plenitud
  else if (age <= 32) ageMod = 1.05;  // Veterano experimentado
  else if (age <= 35) ageMod = 0.85;  // En declive
  else ageMod = 0.6;                  // Final de carrera
  
  // Variación determinista ±12% basada en nombre
  const hash = nameHash(player.name || 'Player');
  const variation = 0.88 + (hash % 250) / 1000; // 0.88 a 1.13
  
  // Resolver multiplicador: si es string → leagueId (usa salaryMult), si es número → tier legacy
  let salaryMult, leagueTier;
  if (typeof leagueTierOrId === 'string') {
    salaryMult = getSalaryMultiplier(leagueTierOrId);
    // Derive tier for minimum salary lookup
    const MULT_TO_TIER = [[1.0, 1], [0.18, 2], [0.07, 3], [0.025, 4], [0.01, 5]];
    leagueTier = 3; // default
    for (const [threshold, t] of MULT_TO_TIER) {
      if (salaryMult >= threshold) { leagueTier = t; break; }
    }
  } else {
    leagueTier = leagueTierOrId;
    const TIER_MULTIPLIERS = { 1: 1.0, 2: 0.50, 3: 0.22, 4: 0.08, 5: 0.03 };
    salaryMult = TIER_MULTIPLIERS[leagueTier] ?? 1.0;
  }
  
  // Mínimos por tier (semanales)
  const TIER_MINIMUMS = { 1: 2000, 2: 1000, 3: 500, 4: 200, 5: 80 };
  const minSalary = TIER_MINIMUMS[leagueTier] ?? 500;
  
  // Salario semanal final
  return Math.max(minSalary, Math.round(baseSalary * ageMod * variation * salaryMult));
}

/**
 * Aplica salarios generados a un array de jugadores.
 * Acepta leagueId (string) para usar salaryMult específico de la liga,
 * o tier (number) para compatibilidad legacy.
 * 
 * @param {array} players - Array de jugadores
 * @param {number|string} leagueTierOrId - Tier (1-5) o leagueId string
 * @returns {array} Jugadores con salarios actualizados
 */
export function applyGeneratedSalaries(players, leagueTierOrId = 1) {
  return (players || []).map(player => {
    return {
      ...player,
      salary: generateSalary(player, leagueTierOrId)
    };
  });
}

/**
 * Aplica salarios a todos los jugadores de un array de equipos.
 * Usa leagueId para salaryMult específico cuando está disponible.
 * 
 * @param {array} teams - Array de equipos con .players y opcionalmente .leagueId
 * @param {number|string} defaultTierOrId - Tier o leagueId por defecto
 * @returns {array} Equipos con jugadores actualizados
 */
export function applyTeamsSalaries(teams, defaultTierOrId = 1) {
  return (teams || []).map(team => {
    // Usar leagueId del equipo si existe, si no el default
    const tierOrId = team.leagueId || defaultTierOrId;
    
    return {
      ...team,
      players: applyGeneratedSalaries(team.players || [], tierOrId)
    };
  });
}
