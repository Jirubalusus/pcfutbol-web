// ============================================================
// SALARY GENERATOR
// Genera salarios semanales realistas basados en overall + edad
// Escalado por tier de liga para balance económico
// ============================================================

import { getEconomyMultiplier } from './leagueTiers';

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
 * El tier de liga escala el resultado con el multiplicador económico.
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
 * Ejemplos (Tier 5 - 2ª RFEF, x0.03):
 *   60 OVR → ~€120/sem
 *   70 OVR → ~€450/sem
 *   75 OVR → ~€900/sem (€47K/año)
 * 
 * @param {object} player - { overall, age, name, potential }
 * @param {number} leagueTier - Tier de la liga (1-5), default 1
 * @returns {number} Salario semanal en €
 */
export function generateSalary(player, leagueTier = 1) {
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
  
  // Multiplicador económico por tier de liga
  const TIER_MULTIPLIERS = { 1: 1.0, 2: 0.50, 3: 0.22, 4: 0.08, 5: 0.03 };
  const tierMult = TIER_MULTIPLIERS[leagueTier] ?? 1.0;
  
  // Mínimos por tier (semanales)
  const TIER_MINIMUMS = { 1: 2000, 2: 1000, 3: 500, 4: 200, 5: 80 };
  const minSalary = TIER_MINIMUMS[leagueTier] ?? 2000;
  
  // Salario semanal final
  return Math.max(minSalary, Math.round(baseSalary * ageMod * variation * tierMult));
}

/**
 * Aplica salarios generados a un array de jugadores
 * Solo sobrescribe si el salario actual parece un placeholder (20000 o no definido)
 * 
 * @param {array} players - Array de jugadores
 * @param {number} leagueTier - Tier de la liga (1-5)
 * @returns {array} Jugadores con salarios actualizados
 */
export function applyGeneratedSalaries(players, leagueTier = 1) {
  return (players || []).map(player => {
    // Si el salario parece placeholder (todos iguales a 20000) o no existe, generar uno
    const currentSalary = player.salary || 0;
    const isPlaceholder = currentSalary === 0 || currentSalary === 20000;
    
    return {
      ...player,
      salary: isPlaceholder ? generateSalary(player, leagueTier) : currentSalary
    };
  });
}

/**
 * Aplica salarios a todos los jugadores de un array de equipos.
 * Cada equipo puede tener un leagueId para determinar su tier,
 * o se usa el tier por defecto.
 * 
 * @param {array} teams - Array de equipos con .players y opcionalmente .leagueId
 * @param {number} defaultTier - Tier por defecto si el equipo no tiene leagueId
 * @returns {array} Equipos con jugadores actualizados
 */
export function applyTeamsSalaries(teams, defaultTier = 1) {
  return (teams || []).map(team => {
    // Si el equipo tiene leagueId, calcular su tier individual
    let teamTier = defaultTier;
    if (team.leagueId) {
      const mult = getEconomyMultiplier(team.leagueId);
      // Reverse-map multiplier to tier
      if (mult >= 1.0) teamTier = 1;
      else if (mult >= 0.50) teamTier = 2;
      else if (mult >= 0.22) teamTier = 3;
      else if (mult >= 0.08) teamTier = 4;
      else teamTier = 5;
    }
    
    return {
      ...team,
      players: applyGeneratedSalaries(team.players || [], teamTier)
    };
  });
}
